import { createHash } from "node:crypto";
import {
  mkdir,
  readdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as googleTTS from "@sefinek/google-tts-api";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LESSONS_DIR = path.join(ROOT, "content", "lessons");
const AUDIO_DIR = path.join(ROOT, "public", "audio");
const TTS_LANG = "tl";
const TTS_SLOW = false;
const TTS_HOST = "https://translate.google.com";
const REQUEST_GAP_MS = 400;
const MAX_ATTEMPTS = 3;

function parseArgs(argv) {
  let stage = null;
  let lesson = null;
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--stage" || arg.startsWith("--stage=")) {
      stage = arg === "--stage" ? argv[++i] : arg.slice("--stage=".length);
      continue;
    }

    if (arg === "--lesson" || arg.startsWith("--lesson=")) {
      lesson = arg === "--lesson" ? argv[++i] : arg.slice("--lesson=".length);
      continue;
    }

    fail(`Unknown argument: ${arg}`);
  }

  if (stage != null && lesson != null) {
    fail("Use either --stage or --lesson, not both.");
  }

  if (stage != null && String(stage).trim() === "") {
    fail("Missing value for --stage.");
  }

  if (lesson != null && String(lesson).trim() === "") {
    fail("Missing value for --lesson.");
  }

  const lessonIds =
    lesson == null
      ? null
      : String(lesson)
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);

  if (lesson != null && lessonIds.length === 0) {
    fail("Missing value for --lesson.");
  }

  return {
    stage: stage == null ? null : String(stage).trim(),
    lessonIds,
    dryRun,
  };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeText(text) {
  return text.normalize("NFC").trim();
}

function md5(text) {
  return createHash("md5").update(text, "utf8").digest("hex");
}

function audioPathFor(hash) {
  return path.join(AUDIO_DIR, `${hash}.mp3`);
}

function lessonIdVariants(id) {
  const variants = new Set([id]);
  const match = id.match(/^(.*?)(\d+)$/);
  if (!match) return [...variants];

  const [, prefix, digits] = match;
  const n = Number(digits);
  variants.add(`${prefix}${n}`);
  variants.add(`${prefix}${String(n).padStart(2, "0")}`);
  variants.add(`${prefix}${String(n).padStart(3, "0")}`);
  return [...variants];
}

function extractTagalogTexts(lesson) {
  if (lesson.id === "lesson-0") {
    if (!Array.isArray(lesson.sections)) {
      throw new Error(`Unknown lesson structure: ${lesson.id}`);
    }

    return lesson.sections.flatMap((section) => {
      if (!Array.isArray(section?.items)) {
        throw new Error(`Unknown lesson structure: ${lesson.id}`);
      }

      return section.items.flatMap((item) => {
        if (!Array.isArray(item?.examples)) {
          throw new Error(`Unknown lesson structure: ${lesson.id}`);
        }

        return item.examples.map((example) => {
          if (typeof example?.word !== "string") {
            throw new Error(`Unknown lesson structure: ${lesson.id}`);
          }
          return example.word;
        });
      });
    });
  }

  if (Array.isArray(lesson.vocabulary) && Array.isArray(lesson.patterns)) {
    const texts = [];

    for (const item of lesson.vocabulary) {
      if (typeof item?.tagalog !== "string") {
        throw new Error(`Unknown lesson structure: ${lesson.id}`);
      }
      texts.push(item.tagalog);
    }

    for (const pattern of lesson.patterns) {
      if (typeof pattern?.tagalog !== "string") {
        throw new Error(`Unknown lesson structure: ${lesson.id}`);
      }
      texts.push(pattern.tagalog);
    }

    return texts;
  }

  throw new Error(`Unknown lesson structure: ${lesson.id ?? "(missing id)"}`);
}

async function loadLessons() {
  const files = (await readdir(LESSONS_DIR))
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

  const lessons = [];

  for (const file of files) {
    const filePath = path.join(LESSONS_DIR, file);
    let parsed;

    try {
      parsed = JSON.parse(await readFile(filePath, "utf8"));
    } catch (error) {
      console.error(`Failed to parse ${file}: ${error.message}`);
      console.error("Skipping.");
      continue;
    }

    lessons.push({
      file,
      stem: file.replace(/\.json$/, ""),
      data: parsed,
    });
  }

  return lessons;
}

function selectLessons(allLessons, options) {
  if (options.lessonIds) {
    const selected = [];

    for (const requestedId of options.lessonIds) {
      const variants = new Set(lessonIdVariants(requestedId));
      const match = allLessons.find(
        (entry) =>
          variants.has(entry.stem) ||
          variants.has(entry.data.id) ||
          lessonIdVariants(String(entry.data.id ?? "")).some((id) =>
            variants.has(id),
          ),
      );

      if (!match) {
        fail(`Lesson not found: ${requestedId}`);
      }

      selected.push(match);
    }

    return selected;
  }

  if (options.stage != null) {
    const stageNumber = Number(options.stage);
    if (!Number.isFinite(stageNumber)) {
      fail(`Invalid stage: ${options.stage}`);
    }

    const selected = allLessons.filter(
      (entry) => Number(entry.data.stage) === stageNumber,
    );

    if (selected.length === 0) {
      fail(`No lessons found for stage ${options.stage}`);
    }

    return selected;
  }

  return allLessons;
}

function formatScope(options) {
  if (options.lessonIds) {
    return options.lessonIds.join(", ");
  }

  if (options.stage != null) {
    return `stage ${options.stage}`;
  }

  return "all lessons";
}

function looksLikeMp3(buffer) {
  if (!buffer || buffer.length < 32) return false;
  const id3 = buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33;
  const frameSync = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
  return id3 || frameSync;
}

async function audioExists(filePath) {
  try {
    const info = await stat(filePath);
    if (info.size === 0) return false;
    const handle = await readFile(filePath);
    return looksLikeMp3(handle);
  } catch {
    return false;
  }
}

async function cleanupTempFiles() {
  try {
    const files = await readdir(AUDIO_DIR);
    await Promise.all(
      files
        .filter((file) => file.endsWith(".tmp"))
        .map((file) => unlink(path.join(AUDIO_DIR, file)).catch(() => {})),
    );
  } catch {
    // Directory may not exist yet.
  }
}

async function fetchMp3(text) {
  const parts = await googleTTS.getAllAudioBase64(text, {
    lang: TTS_LANG,
    slow: TTS_SLOW,
    host: TTS_HOST,
    timeout: 20000,
    splitPunct: ",.?!;:",
  });

  if (!Array.isArray(parts) || parts.length === 0) {
    throw new Error("Google TTS returned no audio.");
  }

  return Buffer.concat(
    parts.map((part) => {
      if (typeof part?.base64 !== "string" || part.base64.length === 0) {
        throw new Error("Google TTS returned an empty audio part.");
      }
      return Buffer.from(part.base64, "base64");
    }),
  );
}

async function generateMp3(text) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fetchMp3(text);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(REQUEST_GAP_MS * attempt * 2);
      }
    }
  }

  throw lastError;
}

async function writeMp3Atomically(filePath, buffer) {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  try {
    await writeFile(tmpPath, buffer);

    const written = await readFile(tmpPath);
    if (!looksLikeMp3(written)) {
      throw new Error("Generated file was empty or not a valid MP3.");
    }

    await rename(tmpPath, filePath);
  } catch (error) {
    await unlink(tmpPath).catch(() => {});
    throw error;
  }
}

function processLesson(entry) {
  try {
    const rawTexts = extractTagalogTexts(entry.data);
    const texts = rawTexts
      .map((text) => normalizeText(text))
      .filter((text) => text.length > 0);

    return {
      id: entry.data.id ?? entry.stem,
      texts,
      skipped: false,
    };
  } catch {
    const id = entry.data?.id ?? entry.stem;
    console.error(`Unknown lesson structure: ${id}`);
    console.error("Skipping.");
    return { id, texts: [], skipped: true };
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const allLessons = await loadLessons();
  const selected = selectLessons(allLessons, options);
  const processed = selected
    .map(processLesson)
    .filter((lesson) => !lesson.skipped);

  const extractedByLesson = processed;
  const extractedTexts = extractedByLesson.flatMap((lesson) => lesson.texts);
  const uniqueTexts = [...new Set(extractedTexts)];

  const uniqueItems = [];
  for (const text of uniqueTexts) {
    const hash = md5(text);
    const filePath = audioPathFor(hash);
    const exists = await audioExists(filePath);
    uniqueItems.push({ text, hash, filePath, exists });
  }

  const missing = uniqueItems.filter((item) => !item.exists);
  const existing = uniqueItems.filter((item) => item.exists);
  const charactersToGenerate = missing.reduce(
    (sum, item) => sum + item.text.length,
    0,
  );

  if (options.dryRun) {
    console.log(`Scope: ${formatScope(options)}`);
    console.log("");

    for (const lesson of extractedByLesson) {
      console.log(lesson.id);
      for (const text of lesson.texts) {
        console.log(`  ${text}`);
      }
    }

    console.log("");
    console.log(`Lessons scanned: ${selected.length}`);
    console.log(`Extracted texts: ${extractedTexts.length}`);
    console.log(`Unique texts: ${uniqueItems.length}`);
    console.log(`Existing audio: ${existing.length}`);
    console.log(`Missing audio: ${missing.length}`);
    console.log(`Characters to generate: ${charactersToGenerate}`);
    return;
  }

  await mkdir(AUDIO_DIR, { recursive: true });
  await cleanupTempFiles();

  let generated = 0;
  let failed = 0;
  let charactersSent = 0;

  for (const [index, item] of missing.entries()) {
    console.log(`Generating: "${item.text}"`);
    console.log(`→ public/audio/${item.hash}.mp3`);

    try {
      const buffer = await generateMp3(item.text);
      await writeMp3Atomically(item.filePath, buffer);
      generated += 1;
      charactersSent += item.text.length;
    } catch (error) {
      failed += 1;
      console.error(`Failed: "${item.text}"`);
      console.error(error instanceof Error ? error.message : String(error));
    }

    if (index < missing.length - 1) {
      await sleep(REQUEST_GAP_MS);
    }
  }

  console.log("");
  console.log(`Generated: ${generated}`);
  console.log(`Cached: ${existing.length}`);
  console.log(`Failed: ${failed}`);
  console.log(`Characters sent: ${charactersSent}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
