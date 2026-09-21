import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { t, type Dictionary, type Locale } from "./i18n";
import {
  isPronunciationLesson,
  type Lesson,
  type LocatedLesson,
} from "./types";

const PROMPTS_DIR = path.join(process.cwd(), "content", "prompts");

const getTutorPromptTemplate = cache(async (lang: Locale): Promise<string> => {
  return readFile(path.join(PROMPTS_DIR, `chatgpt-tutor.${lang}.md`), "utf8");
});

function fillTemplate(template: string, vars: Record<string, string>): string {
  let text = template;

  for (const [key, value] of Object.entries(vars)) {
    text = text.replaceAll(`{{${key}}}`, value);
  }

  return text;
}

function uniqueLines(items: string[]): string {
  return [...new Set(items.filter(Boolean))].join("\n");
}

function formatTutorFields(
  lesson: Lesson,
  located: LocatedLesson,
  dict: Dictionary,
): Record<string, string> {
  if (isPronunciationLesson(lesson)) {
    const vocabulary: string[] = [];
    const patterns: string[] = [];

    for (const section of lesson.sections) {
      vocabulary.push(t(dict, section.title));
      if (section.instruction) vocabulary.push(t(dict, section.instruction));

      for (const item of section.items) {
        const examples = item.examples.map((example) => example.word);
        vocabulary.push(`- ${item.sound}: ${examples.join(", ")}`);
        if (item.note) vocabulary.push(`  ${t(dict, item.note)}`);
        for (const word of examples) patterns.push(`- ${word}`);
      }

      if (section.note) vocabulary.push(t(dict, section.note));
      vocabulary.push("");
    }

    return {
      "lesson.title": t(dict, located.ref.title),
      "lesson.goal": t(dict, located.ref.goal),
      vocabulary: vocabulary.join("\n").trim(),
      patterns: uniqueLines(patterns),
    };
  }

  const notes =
    lesson.notes && lesson.notes.length > 0
      ? `\n\n${lesson.notes.map((note) => `- ${t(dict, note)}`).join("\n")}`
      : "";

  return {
    "lesson.title": t(dict, located.ref.title),
    "lesson.goal": t(dict, located.ref.goal),
    vocabulary: lesson.vocabulary
      .map((item) => `- ${item.tagalog} — ${t(dict, item.english)}`)
      .join("\n"),
    patterns:
      lesson.patterns
        .map((item) => `- ${item.tagalog} — ${t(dict, item.english)}`)
        .join("\n") + notes,
  };
}

export async function getChatgptTutorHref({
  lang,
  lesson,
  located,
  dict,
}: {
  lang: Locale;
  lesson: Lesson;
  located: LocatedLesson;
  dict: Dictionary;
}): Promise<string> {
  const prompt = fillTemplate(
    await getTutorPromptTemplate(lang),
    formatTutorFields(lesson, located, dict),
  );
  const url = new URL("https://chatgpt.com/");
  url.searchParams.set("q", prompt);
  url.searchParams.set("temporary-chat", "true");
  return url.toString();
}
