import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import initSqlJs from "sql.js";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "content");
const LESSONS_DIR = path.join(CONTENT_DIR, "lessons");
const AUDIO_DIR = path.join(ROOT, "public", "audio");
const DECKS_DIR = path.join(ROOT, "public", "decks");
const LANGS_DIR = path.join(ROOT, "langs");
const LOCALES = ["en", "zh-TW"];
const FIELD_SEPARATOR = "\x1f";
const MODEL_ID = stableId("tagalog-learning:notetype:v1");
const DEFAULT_DECK_ID = 1;

function parseArgs(argv) {
  let stage = null;
  let lesson = null;
  let dryRun = false;
  const langs = [];

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

    if (arg === "--lang" || arg.startsWith("--lang=")) {
      const value = arg === "--lang" ? argv[++i] : arg.slice("--lang=".length);
      langs.push(
        ...String(value ?? "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      );
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

  const selectedLangs = langs.length === 0 ? [...LOCALES] : langs;
  for (const lang of selectedLangs) {
    if (!LOCALES.includes(lang)) {
      fail(`Unknown language: ${lang}. Use ${LOCALES.join(" or ")}.`);
    }
  }

  return {
    stage: stage == null ? null : String(stage).trim(),
    lessonIds,
    langs: selectedLangs,
    dryRun,
  };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function normalizeText(text) {
  return text.normalize("NFC").trim();
}

function md5(text) {
  return createHash("md5").update(text, "utf8").digest("hex");
}

function stableId(seed) {
  const hex = createHash("sha1").update(seed, "utf8").digest("hex").slice(0, 12);
  const value = Number(BigInt(`0x${hex}`));
  return value < 2 ? value + 2 : value;
}

function guidFromHash(hash) {
  const table =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-./:;<=>?@[]^_`{|}~";
  let value = BigInt(`0x${hash}`);
  let guid = "";

  for (let i = 0; i < 10; i += 1) {
    guid = table[Number(value % 91n)] + guid;
    value /= 91n;
  }

  return guid;
}

function fieldChecksum(text) {
  return Number.parseInt(
    createHash("sha1").update(text, "utf8").digest("hex").slice(0, 8),
    16,
  );
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

function translate(dict, key) {
  return dict[key] ?? key;
}

function formatScope(options) {
  if (options.lessonIds) return options.lessonIds.join(", ");
  if (options.stage != null) return `stage ${options.stage}`;
  return "all lessons";
}

function lessonFileId(lessonId) {
  const match = String(lessonId).match(/^(.*?)(\d+)$/);
  if (!match) return lessonId;
  return `${match[1]}${Number(match[2])}`;
}

function packageFileName(lessonId, lang) {
  return `${lessonFileId(lessonId)}-${lang}.apkg`;
}

async function fileExists(filePath) {
  try {
    const info = await stat(filePath);
    return info.size > 0;
  } catch {
    return false;
  }
}

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function loadDictionaries() {
  const dictionaries = {};

  for (const locale of LOCALES) {
    dictionaries[locale] = await loadJson(path.join(LANGS_DIR, `${locale}.json`));
  }

  return dictionaries;
}

async function loadLessonIndex() {
  const files = (await readdir(LESSONS_DIR)).filter((file) => file.endsWith(".json"));
  const index = new Map();

  for (const file of files) {
    const lesson = await loadJson(path.join(LESSONS_DIR, file));
    const stem = file.replace(/\.json$/, "");
    index.set(stem, lesson);
    if (lesson.id) index.set(lesson.id, lesson);
  }

  return index;
}

function getLesson(index, lessonId) {
  for (const variant of lessonIdVariants(lessonId)) {
    const lesson = index.get(variant);
    if (lesson) return lesson;
  }

  return null;
}

function extractCards(lesson, stage, lessonRef) {
  const cards = [];

  if (Array.isArray(lesson.sections)) {
    for (const section of lesson.sections) {
      if (!Array.isArray(section?.items)) {
        throw new Error(`Unknown lesson structure: ${lesson.id}`);
      }

      for (const item of section.items) {
        if (typeof item?.sound !== "string" || !Array.isArray(item?.examples)) {
          throw new Error(`Unknown lesson structure: ${lesson.id}`);
        }

        for (const example of item.examples) {
          if (typeof example?.word !== "string") {
            throw new Error(`Unknown lesson structure: ${lesson.id}`);
          }

          cards.push({
            kind: "example",
            tagalog: example.word,
            sound: item.sound,
            position: example.position,
            stage,
            lessonRef,
          });
        }
      }
    }

    return cards;
  }

  if (!Array.isArray(lesson.vocabulary) || !Array.isArray(lesson.patterns)) {
    return [];
  }

  for (const item of lesson.vocabulary) {
    if (typeof item?.tagalog !== "string" || typeof item?.english !== "string") {
      throw new Error(`Unknown lesson structure: ${lesson.id}`);
    }

    cards.push({
      kind: "vocabulary",
      tagalog: item.tagalog,
      english: item.english,
      stage,
      lessonRef,
    });
  }

  for (const item of lesson.patterns) {
    if (typeof item?.tagalog !== "string" || typeof item?.english !== "string") {
      throw new Error(`Unknown lesson structure: ${lesson.id}`);
    }

    cards.push({
      kind: "sentence",
      tagalog: item.tagalog,
      english: item.english,
      stage,
      lessonRef,
    });
  }

  return cards;
}

function noteMeaning(note, dict) {
  if (note.kind === "example") {
    return `${note.sound} · ${translate(dict, note.position)}`;
  }

  return translate(dict, note.english);
}

function noteMeaningKey(card) {
  if (card.kind === "example") {
    return `${card.sound} · ${card.position}`;
  }

  return card.english;
}

function selectStages(curriculum, options) {
  if (options.lessonIds) {
    const stages = [];

    for (const lessonId of options.lessonIds) {
      const variants = new Set(lessonIdVariants(lessonId));
      let found = false;

      for (const stage of curriculum.stages) {
        const lessonRef = stage.lessons.find(
          (lesson) =>
            variants.has(lesson.id) ||
            lessonIdVariants(lesson.id).some((id) => variants.has(id)),
        );

        if (!lessonRef) continue;

        found = true;
        stages.push({
          ...stage,
          lessons: [lessonRef],
        });
      }

      if (!found) {
        fail(`Lesson not found in curriculum: ${lessonId}`);
      }
    }

    return stages;
  }

  if (options.stage != null) {
    const selected = curriculum.stages.filter(
      (stage) => String(stage.id) === options.stage,
    );

    if (selected.length === 0) {
      fail(`Stage not found: ${options.stage}`);
    }

    return selected;
  }

  return curriculum.stages;
}

function collectUniqueNotes(cards) {
  const notes = [];
  const seen = new Map();

  for (const card of cards) {
    const tagalog = normalizeText(card.tagalog);
    if (!tagalog) continue;

    const existing = seen.get(tagalog);
    if (existing) {
      if (
        card.kind !== "example" &&
        noteMeaningKey(existing) !== noteMeaningKey(card)
      ) {
        console.warn(
          `Duplicate Tagalog with different meaning, keeping first: "${tagalog}"`,
        );
      }
      continue;
    }

    const hash = md5(tagalog);
    const note = {
      ...card,
      tagalog,
      hash,
      audioFile: `${hash}.mp3`,
      audioPath: audioPathFor(hash),
    };

    seen.set(tagalog, note);
    notes.push(note);
  }

  return notes;
}

function deckNameParts(note, dict) {
  return [
    translate(dict, note.stage.courseTitle),
    translate(dict, note.stage.title),
    translate(dict, note.lessonRef.title),
  ];
}

function deckPath(note, dict) {
  return deckNameParts(note, dict).join("::");
}

function makeField(name, ord) {
  return {
    name,
    ord,
    sticky: false,
    rtl: false,
    font: "Arial",
    size: 20,
    media: [],
  };
}

function collectionConf(now) {
  return {
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
  };
}

function defaultDeck(now) {
  return {
    id: DEFAULT_DECK_ID,
    name: "Default",
    extendRev: 50,
    usn: 0,
    collapsed: false,
    browserCollapsed: false,
    newToday: [0, 0],
    timeToday: [0, 0],
    dyn: 0,
    extendNew: 10,
    conf: 1,
    revToday: [0, 0],
    lrnToday: [0, 0],
    mod: now,
    desc: "",
  };
}

function makeDeck(id, name, now, desc = "") {
  return {
    ...defaultDeck(now),
    id,
    name,
    desc,
  };
}

function deckConfig() {
  return {
    1: {
      id: 1,
      name: "Default",
      replayq: true,
      lapse: {
        leechFails: 8,
        minInt: 1,
        delays: [10],
        leechAction: 0,
        mult: 0,
      },
      rev: {
        perDay: 200,
        fuzz: 0.05,
        ivlFct: 1,
        maxIvl: 36500,
        ease4: 1.3,
        bury: true,
        minSpace: 1,
      },
      timer: 0,
      maxTaken: 60,
      usn: 0,
      new: {
        perDay: 20,
        delays: [1, 10],
        separate: true,
        ints: [1, 4, 7],
        initialFactor: 2500,
        bury: true,
        order: 1,
      },
      mod: 0,
      autoplay: true,
    },
  };
}

function noteType(now, deckId) {
  return {
    id: MODEL_ID,
    name: "Tagalog Audio",
    type: 0,
    mod: now,
    usn: 0,
    sortf: 0,
    did: deckId,
    flds: [makeField("Tagalog", 0), makeField("Meaning", 1), makeField("Audio", 2)],
    tmpls: [
      {
        name: "Recognition",
        ord: 0,
        qfmt: '<div class="tagalog">{{Tagalog}}</div>\n{{Audio}}',
        afmt: '{{FrontSide}}\n\n<hr id=answer>\n\n<div class="meaning">{{Meaning}}</div>',
        did: null,
        bqfmt: "",
        bafmt: "",
        bfont: "",
        bsize: 0,
      },
    ],
    css: `.card {
  font-family: Arial, sans-serif;
  font-size: 22px;
  text-align: center;
  color: #1c1917;
  background-color: #f6f1ea;
}
.tagalog {
  font-size: 32px;
  font-weight: 600;
  margin-bottom: 16px;
}
.meaning {
  font-size: 24px;
}`,
    latexPre:
      "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n",
    latexPost: "\\end{document}",
    latexsvg: false,
    req: [[0, "any", [0, 2]]],
  };
}

async function buildCollection(notes, dict, SQL) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const nowMs = Date.now();
  const decks = { [DEFAULT_DECK_ID]: defaultDeck(nowSeconds) };
  const rootName = translate(dict, notes[0].stage.courseTitle);
  const rootId = stableId(`deck:${rootName}`);
  decks[rootId] = makeDeck(rootId, rootName, nowSeconds);

  for (const note of notes) {
    const parts = deckNameParts(note, dict);
    let current = parts[0];
    let currentId = rootId;

    for (let index = 1; index < parts.length; index += 1) {
      current = `${current}::${parts[index]}`;
      currentId = stableId(`deck:${current}`);
      if (!decks[currentId]) {
        decks[currentId] = makeDeck(currentId, current, nowSeconds);
      }
    }

    note.deckId = currentId;
  }

  const db = new SQL.Database();
  db.run(`
    CREATE TABLE col (
      id integer PRIMARY KEY,
      crt integer NOT NULL,
      mod integer NOT NULL,
      scm integer NOT NULL,
      ver integer NOT NULL,
      dty integer NOT NULL,
      usn integer NOT NULL,
      ls integer NOT NULL,
      conf text NOT NULL,
      models text NOT NULL,
      decks text NOT NULL,
      dconf text NOT NULL,
      tags text NOT NULL
    );
    CREATE TABLE notes (
      id integer PRIMARY KEY,
      guid text NOT NULL,
      mid integer NOT NULL,
      mod integer NOT NULL,
      usn integer NOT NULL,
      tags text NOT NULL,
      flds text NOT NULL,
      sfld integer NOT NULL,
      csum integer NOT NULL,
      flags integer NOT NULL,
      data text NOT NULL
    );
    CREATE TABLE cards (
      id integer PRIMARY KEY,
      nid integer NOT NULL,
      did integer NOT NULL,
      ord integer NOT NULL,
      mod integer NOT NULL,
      usn integer NOT NULL,
      type integer NOT NULL,
      queue integer NOT NULL,
      due integer NOT NULL,
      ivl integer NOT NULL,
      factor integer NOT NULL,
      reps integer NOT NULL,
      lapses integer NOT NULL,
      left integer NOT NULL,
      odue integer NOT NULL,
      odid integer NOT NULL,
      flags integer NOT NULL,
      data text NOT NULL
    );
    CREATE TABLE revlog (
      id integer PRIMARY KEY,
      cid integer NOT NULL,
      usn integer NOT NULL,
      ease integer NOT NULL,
      ivl integer NOT NULL,
      lastIvl integer NOT NULL,
      factor integer NOT NULL,
      time integer NOT NULL,
      type integer NOT NULL
    );
    CREATE TABLE graves (
      usn integer NOT NULL,
      oid integer NOT NULL,
      type integer NOT NULL
    );
    CREATE INDEX ix_notes_usn ON notes (usn);
    CREATE INDEX ix_cards_usn ON cards (usn);
    CREATE INDEX ix_revlog_usn ON revlog (usn);
    CREATE INDEX ix_cards_nid ON cards (nid);
    CREATE INDEX ix_cards_sched ON cards (did, queue, due);
    CREATE INDEX ix_revlog_cid ON revlog (cid);
    CREATE INDEX ix_notes_csum ON notes (csum);
  `);

  db.run(
    `INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      1,
      nowSeconds,
      nowMs,
      nowMs,
      11,
      0,
      0,
      0,
      JSON.stringify(collectionConf(nowSeconds)),
      JSON.stringify({ [MODEL_ID]: noteType(nowSeconds, rootId) }),
      JSON.stringify(decks),
      JSON.stringify(deckConfig()),
      "{}",
    ],
  );

  const insertNote = db.prepare(
    `INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertCard = db.prepare(
    `INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  notes.forEach((note, index) => {
    const meaning = noteMeaning(note, dict);
    const fields = [note.tagalog, meaning, `[sound:${note.audioFile}]`].join(
      FIELD_SEPARATOR,
    );
    const noteId = stableId(`note:${note.hash}`);
    const cardId = stableId(`card:${note.hash}:0`);
    const tags = ` ${note.kind} ${note.lessonRef.id} `;

    insertNote.run([
      noteId,
      guidFromHash(note.hash),
      MODEL_ID,
      nowSeconds,
      0,
      tags,
      fields,
      note.tagalog,
      fieldChecksum(note.tagalog),
      0,
      "",
    ]);

    insertCard.run([
      cardId,
      noteId,
      note.deckId,
      0,
      nowSeconds,
      0,
      0,
      0,
      index + 1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      "",
    ]);
  });

  insertNote.free();
  insertCard.free();

  const data = db.export();
  db.close();
  return Buffer.from(data);
}

async function writeApkg(filePath, collection, mediaFiles) {
  const zip = new JSZip();
  const mediaMap = {};

  zip.file("collection.anki2", collection);

  for (const [index, file] of mediaFiles.entries()) {
    mediaMap[String(index)] = file.name;
    zip.file(String(index), file.buffer);
  }

  zip.file("media", JSON.stringify(mediaMap));

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  await writeFile(filePath, buffer);
}

async function mediaForNotes(notes) {
  const files = [];
  const seen = new Set();

  for (const note of notes) {
    if (seen.has(note.audioFile)) continue;
    seen.add(note.audioFile);
    files.push({
      name: note.audioFile,
      buffer: await readFile(note.audioPath),
    });
  }

  return files;
}

function isLegacyPackageName(file) {
  return (
    file.endsWith(".apkg") &&
    (file.startsWith("tagalog-a0-a2") || /^lesson-0\d+-/.test(file))
  );
}

async function removeLegacyPackages() {
  let files;

  try {
    files = await readdir(DECKS_DIR);
  } catch {
    return;
  }

  await Promise.all(
    files
      .filter(isLegacyPackageName)
      .map((file) => unlink(path.join(DECKS_DIR, file))),
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [curriculum, lessonIndex, dictionaries] = await Promise.all([
    loadJson(path.join(CONTENT_DIR, "curriculum.json")),
    loadLessonIndex(),
    loadDictionaries(),
  ]);

  const stages = selectStages(curriculum, options);
  const lessons = [];

  for (const stage of stages) {
    for (const lessonRef of stage.lessons) {
      const lesson = getLesson(lessonIndex, lessonRef.id);
      if (!lesson) {
        fail(`Lesson file not found: ${lessonRef.id}`);
      }

      const cards = extractCards(
        lesson,
        { ...stage, courseTitle: curriculum.course.title },
        lessonRef,
      );
      const notes = collectUniqueNotes(cards);
      const missingAudio = [];
      const ready = [];

      for (const note of notes) {
        if (await fileExists(note.audioPath)) {
          ready.push(note);
        } else {
          missingAudio.push(note);
        }
      }

      lessons.push({
        id: lessonRef.id,
        cards,
        notes,
        ready,
        missingAudio,
      });
    }
  }

  if (options.dryRun) {
    console.log(`Scope: ${formatScope(options)}`);
    console.log(`Languages: ${options.langs.join(", ")}`);
    console.log("");

    for (const lesson of lessons) {
      console.log(lesson.id);
      for (const note of lesson.notes) {
        const mark = lesson.missingAudio.includes(note) ? "missing audio" : "ok";
        console.log(
          `  ${note.tagalog}  →  ${noteMeaningKey(note)}  (${note.kind}, ${mark})`,
        );
      }
      console.log("");
    }

    console.log(`Lessons: ${lessons.length}`);
    console.log(`Extracted items: ${lessons.reduce((sum, lesson) => sum + lesson.cards.length, 0)}`);
    console.log(`Unique notes: ${lessons.reduce((sum, lesson) => sum + lesson.notes.length, 0)}`);
    console.log(`Ready audio: ${lessons.reduce((sum, lesson) => sum + lesson.ready.length, 0)}`);
    console.log(
      `Missing audio: ${lessons.reduce((sum, lesson) => sum + lesson.missingAudio.length, 0)}`,
    );
    return;
  }

  const empty = lessons.filter((lesson) => lesson.notes.length === 0);
  if (empty.length > 0) {
    fail(
      `No Anki cards found in: ${empty.map((lesson) => lesson.id).join(", ")}`,
    );
  }

  const missing = lessons.flatMap((lesson) => lesson.missingAudio);
  if (missing.length > 0) {
    for (const note of missing) {
      console.error(`Missing audio: ${note.tagalog} → public/audio/${note.audioFile}`);
    }
    fail("Generate missing audio first: npm run audio:generate");
  }

  const sqlJsDir = path.dirname(require.resolve("sql.js"));
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(sqlJsDir, file),
  });

  await mkdir(DECKS_DIR, { recursive: true });
  await removeLegacyPackages();

  const outputs = [];

  for (const lesson of lessons) {
    const mediaFiles = await mediaForNotes(lesson.ready);

    for (const lang of options.langs) {
      const fileName = packageFileName(lesson.id, lang);
      const filePath = path.join(DECKS_DIR, fileName);
      const collection = await buildCollection(
        lesson.ready,
        dictionaries[lang],
        SQL,
      );
      await writeApkg(filePath, collection, mediaFiles);
      outputs.push(filePath);
      console.log(`Wrote ${path.relative(ROOT, filePath)}`);
    }
  }

  console.log("");
  console.log(`Lessons: ${lessons.length}`);
  console.log(
    `Notes: ${lessons.reduce((sum, lesson) => sum + lesson.ready.length, 0)}`,
  );
  console.log(`Packages: ${outputs.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
