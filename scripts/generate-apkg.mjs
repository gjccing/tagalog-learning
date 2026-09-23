import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import initSqlJs from "sql.js";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "content");
const LESSONS_DIR = path.join(CONTENT_DIR, "lessons");
const AUDIO_DIR = path.join(ROOT, "public", "audios");
const DECKS_DIR = path.join(ROOT, "public", "decks");
const LANGS_DIR = path.join(ROOT, "langs");
const LOCALES = ["en", "zh-TW"];
const FIELD_SEP = "\x1f";
const MODEL_ID = idFrom("tagalog-learning:notetype:v1");
const DEFAULT_DECK_ID = 1;
const SCHEMA = `
CREATE TABLE col (
  id integer PRIMARY KEY, crt integer NOT NULL, mod integer NOT NULL,
  scm integer NOT NULL, ver integer NOT NULL, dty integer NOT NULL,
  usn integer NOT NULL, ls integer NOT NULL, conf text NOT NULL,
  models text NOT NULL, decks text NOT NULL, dconf text NOT NULL, tags text NOT NULL
);
CREATE TABLE notes (
  id integer PRIMARY KEY, guid text NOT NULL, mid integer NOT NULL,
  mod integer NOT NULL, usn integer NOT NULL, tags text NOT NULL,
  flds text NOT NULL, sfld integer NOT NULL, csum integer NOT NULL,
  flags integer NOT NULL, data text NOT NULL
);
CREATE TABLE cards (
  id integer PRIMARY KEY, nid integer NOT NULL, did integer NOT NULL,
  ord integer NOT NULL, mod integer NOT NULL, usn integer NOT NULL,
  type integer NOT NULL, queue integer NOT NULL, due integer NOT NULL,
  ivl integer NOT NULL, factor integer NOT NULL, reps integer NOT NULL,
  lapses integer NOT NULL, left integer NOT NULL, odue integer NOT NULL,
  odid integer NOT NULL, flags integer NOT NULL, data text NOT NULL
);
CREATE TABLE revlog (
  id integer PRIMARY KEY, cid integer NOT NULL, usn integer NOT NULL,
  ease integer NOT NULL, ivl integer NOT NULL, lastIvl integer NOT NULL,
  factor integer NOT NULL, time integer NOT NULL, type integer NOT NULL
);
CREATE TABLE graves (
  usn integer NOT NULL, oid integer NOT NULL, type integer NOT NULL
);
CREATE INDEX ix_notes_usn ON notes (usn);
CREATE INDEX ix_cards_usn ON cards (usn);
CREATE INDEX ix_revlog_usn ON revlog (usn);
CREATE INDEX ix_cards_nid ON cards (nid);
CREATE INDEX ix_cards_sched ON cards (did, queue, due);
CREATE INDEX ix_revlog_cid ON revlog (cid);
CREATE INDEX ix_notes_csum ON notes (csum);
`;

function readFlag(argv, i, arg) {
  if (arg.includes("=")) return [arg.slice(arg.indexOf("=") + 1), i];
  return [argv[i + 1], i + 1];
}

function parseArgs(argv) {
  const options = { stage: null, lessonIds: null, langs: [...LOCALES], dryRun: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--stage" || arg.startsWith("--stage=")) {
      const [value, next] = readFlag(argv, i, arg);
      if (!value?.trim()) fail("Missing value for --stage.");
      options.stage = value.trim();
      i = next;
      continue;
    }

    if (arg === "--lesson" || arg.startsWith("--lesson=")) {
      const [value, next] = readFlag(argv, i, arg);
      const lessonIds = String(value ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (lessonIds.length === 0) fail("Missing value for --lesson.");
      options.lessonIds = lessonIds;
      i = next;
      continue;
    }

    if (arg === "--lang" || arg.startsWith("--lang=")) {
      const [value, next] = readFlag(argv, i, arg);
      const langs = String(value ?? "")
        .split(",")
        .map((lang) => lang.trim())
        .filter(Boolean);
      if (langs.length === 0 || langs.some((lang) => !LOCALES.includes(lang))) {
        fail(`Unknown language. Use ${LOCALES.join(" or ")}.`);
      }
      options.langs = langs;
      i = next;
      continue;
    }

    fail(`Unknown argument: ${arg}`);
  }

  if (options.stage && options.lessonIds) {
    fail("Use either --stage or --lesson, not both.");
  }

  return options;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function normalize(text) {
  return text.normalize("NFC").trim();
}

function md5(text) {
  return createHash("md5").update(text, "utf8").digest("hex");
}

function idFrom(seed) {
  const value = Number(
    BigInt(`0x${createHash("sha1").update(seed, "utf8").digest("hex").slice(0, 12)}`),
  );
  return value < 2 ? value + 2 : value;
}

function checksum(text) {
  return Number.parseInt(createHash("sha1").update(text, "utf8").digest("hex").slice(0, 8), 16);
}

function lessonNumber(id) {
  const match = String(id).match(/(\d+)$/);
  return match ? Number(match[1]) : Number.NaN;
}

function t(dict, key) {
  return dict[key] ?? key;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function loadContent() {
  const curriculum = await readJson(path.join(CONTENT_DIR, "curriculum.json"));
  const files = (await readdir(LESSONS_DIR)).filter((file) => file.endsWith(".json"));
  const lessons = new Map();

  for (const file of files) {
    const lesson = await readJson(path.join(LESSONS_DIR, file));
    lessons.set(file.replace(/\.json$/, ""), lesson);
    if (lesson.id) lessons.set(lesson.id, lesson);
  }

  const dictionaries = {};
  for (const lang of LOCALES) {
    dictionaries[lang] = await readJson(path.join(LANGS_DIR, `${lang}.json`));
  }

  return { curriculum, lessons, dictionaries };
}

function flattenCurriculum(curriculum) {
  return curriculum.stages.flatMap((stage) =>
    stage.lessons.map((ref) => ({
      ref,
      stage,
      courseTitle: curriculum.course.title,
    })),
  );
}

function deckNameParts(entry, dict) {
  return [
    t(dict, entry.courseTitle),
    `Stage ${entry.stage.id} ${t(dict, entry.stage.title)}`,
    `Lesson ${lessonNumber(entry.ref.id)} ${t(dict, entry.ref.title)}`,
  ];
}

function selectLessons(curriculum, options) {
  let selected = flattenCurriculum(curriculum);

  if (options.lessonIds) {
    selected = options.lessonIds.map((requested) => {
      const match = selected.find((entry) => entry.ref.id === requested);
      if (!match) fail(`Lesson not found in curriculum: ${requested}`);
      return match;
    });
  } else if (options.stage != null) {
    selected = selected.filter((entry) => String(entry.stage.id) === options.stage);
    if (selected.length === 0) fail(`Stage not found: ${options.stage}`);
  }

  const exportable = selected.filter((entry) => lessonNumber(entry.ref.id) !== 0);
  if (options.lessonIds && exportable.length !== selected.length) {
    fail("Anki packages do not include lesson 0.");
  }

  return exportable;
}

function notesFromLesson(lesson) {
  if (!Array.isArray(lesson.vocabulary) || !Array.isArray(lesson.patterns)) {
    fail(`Lesson ${lesson.id} has no vocabulary or useful sentences.`);
  }

  const notes = [];
  const seen = new Set();

  for (const item of [...lesson.vocabulary, ...lesson.patterns]) {
    if (typeof item?.tagalog !== "string" || typeof item?.english !== "string") {
      fail(`Unknown lesson structure: ${lesson.id}`);
    }

    const tagalog = normalize(item.tagalog);
    if (!tagalog || seen.has(tagalog)) continue;
    seen.add(tagalog);

    const hash = md5(tagalog);
    notes.push({
      tagalog,
      english: item.english,
      hash,
      audioFile: `${hash}.mp3`,
      audioPath: path.join(AUDIO_DIR, `${hash}.mp3`),
    });
  }

  if (notes.length === 0) {
    fail(`No Anki cards found in ${lesson.id}.`);
  }

  return notes;
}

function deckRecord(id, name, now) {
  return {
    id,
    name,
    extendRev: 50,
    usn: 0,
    collapsed: false,
    browserCollapsed: false,
    newToday: [0, 0],
    revToday: [0, 0],
    lrnToday: [0, 0],
    timeToday: [0, 0],
    dyn: 0,
    extendNew: 10,
    conf: 1,
    mod: now,
    desc: "",
  };
}

function buildNoteType(now, deckId) {
  const field = (name, ord) => ({
    name,
    ord,
    sticky: false,
    rtl: false,
    font: "Arial",
    size: 20,
    media: [],
  });

  return {
    id: MODEL_ID,
    name: "Tagalog Audio",
    type: 0,
    mod: now,
    usn: 0,
    sortf: 0,
    did: deckId,
    flds: [field("Tagalog", 0), field("Meaning", 1), field("Audio", 2)],
    tmpls: [
      {
        name: "Card 1",
        ord: 0,
        qfmt: '<div class="tagalog">{{Tagalog}}</div>\n{{Audio}}',
        afmt: '{{FrontSide}}\n<hr id=answer>\n<div class="meaning">{{Meaning}}</div>',
        did: null,
        bqfmt: "",
        bafmt: "",
        bfont: "",
        bsize: 0,
      },
    ],
    css: `.card { font-family: Arial, sans-serif; font-size: 22px; text-align: center; color: #1c1917; background-color: #f6f1ea; }
.tagalog { font-size: 32px; font-weight: 600; margin-bottom: 16px; }
.meaning { font-size: 24px; }`,
    latexPre:
      "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n",
    latexPost: "\\end{document}",
    latexsvg: false,
    req: [[0, "any", [0, 2]]],
  };
}

function buildCollection(entry, notes, dict, SQL) {
  const now = Math.floor(Date.now() / 1000);
  const nowMs = Date.now();
  const decks = {
    [DEFAULT_DECK_ID]: deckRecord(DEFAULT_DECK_ID, "Default", now),
  };

  let pathName = "";
  let deckId = DEFAULT_DECK_ID;
  for (const part of deckNameParts(entry, dict)) {
    pathName = pathName ? `${pathName}::${part}` : part;
    deckId = idFrom(`deck:${pathName}`);
    decks[deckId] = deckRecord(deckId, pathName, now);
  }

  const db = new SQL.Database();
  db.run(SCHEMA);
  db.run(
    `INSERT INTO col VALUES (1, ?, ?, ?, 11, 0, 0, 0, ?, ?, ?, ?, '{}')`,
    [
      now,
      nowMs,
      nowMs,
      JSON.stringify({
        nextPos: 1,
        estTimes: true,
        activeDecks: [DEFAULT_DECK_ID],
        sortType: "noteFld",
        timeLim: 0,
        sortBackwards: false,
        addToCur: true,
        curDeck: DEFAULT_DECK_ID,
        newBury: true,
        newSpread: 0,
        dueCounts: true,
        curModel: String(MODEL_ID),
        collapseTime: 1200,
      }),
      JSON.stringify({ [MODEL_ID]: buildNoteType(now, deckId) }),
      JSON.stringify(decks),
      JSON.stringify({
        1: {
          id: 1,
          name: "Default",
          replayq: true,
          autoplay: true,
          timer: 0,
          maxTaken: 60,
          usn: 0,
          mod: 0,
          lapse: { leechFails: 8, minInt: 1, delays: [10], leechAction: 0, mult: 0 },
          rev: { perDay: 200, fuzz: 0.05, ivlFct: 1, maxIvl: 36500, ease4: 1.3, bury: true, minSpace: 1 },
          new: {
            perDay: 20,
            delays: [1, 10],
            separate: true,
            ints: [1, 4, 7],
            initialFactor: 2500,
            bury: true,
            order: 1,
          },
        },
      }),
    ],
  );

  const insertNote = db.prepare(
    `INSERT INTO notes VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, 0, '')`,
  );
  const insertCard = db.prepare(
    `INSERT INTO cards VALUES (?, ?, ?, 0, ?, 0, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, '')`,
  );

  notes.forEach((note, index) => {
    const meaning = t(dict, note.english);
    const fields = [note.tagalog, meaning, `[sound:${note.audioFile}]`].join(FIELD_SEP);
    const noteId = idFrom(`note:${note.hash}`);

    insertNote.run([
      noteId,
      note.hash,
      MODEL_ID,
      now,
      ` ${entry.ref.id} `,
      fields,
      note.tagalog,
      checksum(note.tagalog),
    ]);
    insertCard.run([idFrom(`card:${note.hash}`), noteId, deckId, now, index + 1]);
  });

  insertNote.free();
  insertCard.free();
  const data = Buffer.from(db.export());
  db.close();
  return data;
}

async function writeApkg(filePath, collection, media) {
  const zip = new JSZip();
  const mediaMap = {};

  zip.file("collection.anki2", collection);
  for (const [index, file] of media.entries()) {
    mediaMap[String(index)] = file.name;
    zip.file(String(index), file.data);
  }
  zip.file("media", JSON.stringify(mediaMap));

  await writeFile(
    filePath,
    await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }),
  );
}

async function loadMedia(notes) {
  const media = [];

  for (const note of notes) {
    try {
      media.push({ name: note.audioFile, data: await readFile(note.audioPath) });
    } catch {
      fail(`Missing audio: ${note.tagalog} → public/audios/${note.audioFile}\nGenerate it first: npm run audio:generate`);
    }
  }

  return media;
}

async function clearPackages() {
  let files = [];
  try {
    files = await readdir(DECKS_DIR);
  } catch {
    return;
  }

  await Promise.all(
    files
      .filter((file) => file.endsWith(".apkg"))
      .map((file) => unlink(path.join(DECKS_DIR, file))),
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { curriculum, lessons, dictionaries } = await loadContent();
  const selected = selectLessons(curriculum, options).map((entry) => {
    const lesson = lessons.get(entry.ref.id);
    if (!lesson) fail(`Lesson file not found: ${entry.ref.id}`);
    return { ...entry, notes: notesFromLesson(lesson) };
  });

  if (options.dryRun) {
    for (const entry of selected) {
      console.log(`${entry.ref.id}  ${entry.notes.length} notes`);
      for (const note of entry.notes) {
        console.log(`  ${note.tagalog}  →  ${note.english}`);
      }
    }
    return;
  }

  const SQL = await initSqlJs({
    locateFile: (file) => path.join(path.dirname(require.resolve("sql.js")), file),
  });
  await mkdir(DECKS_DIR, { recursive: true });
  if (!options.stage && !options.lessonIds) {
    await clearPackages();
  }

  let packages = 0;
  for (const entry of selected) {
    const media = await loadMedia(entry.notes);
    for (const lang of options.langs) {
      const fileName = `${entry.ref.id}-${lang}.apkg`;
      const filePath = path.join(DECKS_DIR, fileName);
      const collection = buildCollection(entry, entry.notes, dictionaries[lang], SQL);
      await writeApkg(filePath, collection, media);
      packages += 1;
      console.log(`Wrote ${path.relative(ROOT, filePath)}`);
    }
  }

  console.log(`${selected.length} lessons, ${packages} packages`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
