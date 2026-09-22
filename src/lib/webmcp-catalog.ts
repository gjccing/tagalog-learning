import {
  getCurriculum,
  getLesson,
  getStageHref,
  lessonApkgHref,
  lessonNumberFromId,
} from "@/lib/content";
import { getDictionary, t, type Locale } from "@/lib/i18n";
import { isPronunciationLesson } from "@/lib/types";

export type WebMcpPhrase = {
  tagalog: string;
  meaning: string;
};

export type WebMcpLesson = {
  id: string;
  number: number;
  title: string;
  goal: string;
  href: string;
  stageId: string;
  stageTitle: string;
  kind: "pronunciation" | "standard";
  vocabulary?: WebMcpPhrase[];
  patterns?: WebMcpPhrase[];
  notes?: string[];
  sections?: {
    title: string;
    items: { sound: string; examples: string[] }[];
  }[];
  ankiHref: string | null;
  hasChatgptPractice: boolean;
};

export type WebMcpStage = {
  id: string;
  title: string;
  level: string;
  goal: string;
  href: string;
  lessons: WebMcpLesson[];
};

export type WebMcpCatalog = {
  lang: Locale;
  course: { title: string; goal: string };
  stages: WebMcpStage[];
};

export async function getWebMcpCatalog(lang: Locale): Promise<WebMcpCatalog> {
  const curriculum = await getCurriculum();
  const dict = getDictionary(lang);

  const stages: WebMcpStage[] = [];

  for (const stage of curriculum.stages) {
    const lessons: WebMcpLesson[] = [];

    for (const ref of stage.lessons) {
      const lesson = await getLesson(ref.id);
      if (!lesson) continue;

      const number = lessonNumberFromId(ref.id);
      const href = `/${lang}/lessons/${ref.id}`;
      const base = {
        id: ref.id,
        number,
        title: t(dict, ref.title),
        goal: t(dict, ref.goal),
        href,
        stageId: String(stage.id),
        stageTitle: t(dict, stage.title),
        ankiHref: lessonApkgHref(ref.id, lang),
      };

      if (isPronunciationLesson(lesson)) {
        lessons.push({
          ...base,
          kind: "pronunciation",
          hasChatgptPractice: false,
          sections: lesson.sections.map((section) => ({
            title: t(dict, section.title),
            items: section.items.map((item) => ({
              sound: item.sound,
              examples: item.examples.map((example) => example.word),
            })),
          })),
        });
        continue;
      }

      lessons.push({
        ...base,
        kind: "standard",
        hasChatgptPractice: true,
        vocabulary: lesson.vocabulary.map((item) => ({
          tagalog: item.tagalog,
          meaning: t(dict, item.english),
        })),
        patterns: lesson.patterns.map((item) => ({
          tagalog: item.tagalog,
          meaning: t(dict, item.english),
        })),
        notes: lesson.notes?.map((note) => t(dict, note)),
      });
    }

    stages.push({
      id: String(stage.id),
      title: t(dict, stage.title),
      level: t(dict, stage.level),
      goal: t(dict, stage.goal),
      href: getStageHref(lang, stage),
      lessons,
    });
  }

  return {
    lang,
    course: {
      title: t(dict, curriculum.course.title),
      goal: t(dict, curriculum.course.goal),
    },
    stages,
  };
}
