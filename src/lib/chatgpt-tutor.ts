import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { t, type Dictionary, type Locale } from "./i18n";
import type { LocatedLesson, StandardLesson } from "./types";

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

function formatTutorFields(
  lesson: StandardLesson,
  located: LocatedLesson,
  dict: Dictionary,
): Record<string, string> {
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
    patterns: lesson.patterns
      .map((item) => `- ${item.tagalog} — ${t(dict, item.english)}`)
      .join("\n") + notes,
    objectives: (lesson.practice?.objectives ?? [])
      .map((item) => `- ${t(dict, item.description)}`)
      .join("\n"),
    scenarios: (lesson.practice?.scenarios ?? [])
      .map((item) => {
        const targets = item.targets.join("; ");
        return [
          `- ${t(dict, item.title)}`,
          `  Setup: ${t(dict, item.setup)}`,
          `  Goal: ${t(dict, item.learnerGoal)}`,
          `  Targets: ${targets}`,
        ].join("\n");
      })
      .join("\n"),
  };
}

export async function getChatgptTutorHref({
  lang,
  lesson,
  located,
  dict,
}: {
  lang: Locale;
  lesson: StandardLesson;
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
