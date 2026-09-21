import { cache } from "react";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Curriculum, Lesson, LocatedLesson, Stage } from "./types";
import { withLang } from "./locales";

const CONTENT_DIR = path.join(process.cwd(), "content");
const LESSONS_DIR = path.join(CONTENT_DIR, "lessons");

export const getCurriculum = cache(async (): Promise<Curriculum> => {
  const raw = await readFile(path.join(CONTENT_DIR, "curriculum.json"), "utf8");
  return JSON.parse(raw) as Curriculum;
});

export function flattenCurriculumLessons(
  curriculum: Curriculum,
): LocatedLesson[] {
  return curriculum.stages.flatMap((stage) =>
    stage.lessons.map((ref, index) => ({ ref, stage, index })),
  );
}

export async function getStage(stageId: string): Promise<Stage | null> {
  const curriculum = await getCurriculum();
  return (
    curriculum.stages.find((stage) => String(stage.id) === stageId) ?? null
  );
}

export function getStageHref(lang: string, stage: Stage): string {
  if (String(stage.id) === "0" && stage.lessons[0]) {
    return withLang(lang, `/lessons/${stage.lessons[0].id}`);
  }

  return withLang(lang, `/stages/${stage.id}`);
}

export async function getLocatedLesson(
  lessonId: string,
): Promise<LocatedLesson | null> {
  const curriculum = await getCurriculum();
  return (
    flattenCurriculumLessons(curriculum).find(
      (entry) => entry.ref.id === lessonId,
    ) ?? null
  );
}

export async function getAdjacentLessons(lessonId: string): Promise<{
  previous: LocatedLesson | null;
  next: LocatedLesson | null;
}> {
  const curriculum = await getCurriculum();
  const lessons = flattenCurriculumLessons(curriculum);
  const current = lessons.findIndex((entry) => entry.ref.id === lessonId);

  if (current === -1) {
    return { previous: null, next: null };
  }

  return {
    previous: lessons[current - 1] ?? null,
    next: lessons[current + 1] ?? null,
  };
}

const getLessonIndex = cache(async (): Promise<Map<string, Lesson>> => {
  const files = await readdir(LESSONS_DIR);
  const index = new Map<string, Lesson>();

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const stem = file.replace(/\.json$/, "");
    const raw = await readFile(path.join(LESSONS_DIR, file), "utf8");
    const lesson = JSON.parse(raw) as Lesson;

    index.set(stem, lesson);
    if (lesson.id) {
      index.set(lesson.id, lesson);
    }
  }

  return index;
});

export function lessonNumberFromId(id: string): number {
  const match = id.match(/(\d+)$/);
  return match ? Number(match[1]) : Number.NaN;
}

export function lessonApkgHref(lessonId: string, lang: string): string | null {
  const n = lessonNumberFromId(lessonId);
  if (!Number.isFinite(n) || n === 0) return null;
  return `/decks/lesson-${n}-${lang}.apkg`;
}

function lessonIdVariants(id: string): string[] {
  const variants = new Set<string>([id]);
  const match = id.match(/^(.*?)(\d+)$/);

  if (!match) {
    return [...variants];
  }

  const [, prefix, digits] = match;
  const n = Number(digits);
  variants.add(`${prefix}${n}`);
  variants.add(`${prefix}${String(n).padStart(2, "0")}`);
  variants.add(`${prefix}${String(n).padStart(3, "0")}`);

  return [...variants];
}

export async function getLesson(lessonId: string): Promise<Lesson | null> {
  const index = await getLessonIndex();

  for (const variant of lessonIdVariants(lessonId)) {
    const lesson = index.get(variant);
    if (lesson) return lesson;
  }

  for (const lesson of new Set(index.values())) {
    if (lessonIdVariants(lessonId).includes(lesson.id)) {
      return lesson;
    }
  }

  return null;
}
