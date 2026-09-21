import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonCompletion } from "@/components/LessonCompletion";
import { LessonNav } from "@/components/LessonNav";
import { LessonStatus } from "@/components/LessonStatus";
import { PronunciationLessonView } from "@/components/PronunciationLesson";
import { StandardLessonView } from "@/components/StandardLesson";
import {
  flattenCurriculumLessons,
  getAdjacentLessons,
  getCurriculum,
  getLesson,
  getLocatedLesson,
  lessonNumberFromId,
} from "@/lib/content";
import { getDictionary, isLocale, locales, t, withLang } from "@/lib/i18n";
import { isPronunciationLesson } from "@/lib/types";

export async function generateStaticParams() {
  const curriculum = await getCurriculum();
  return locales.flatMap((lang) =>
    flattenCurriculumLessons(curriculum).map((entry) => ({
      lang,
      lessonId: entry.ref.id,
    })),
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/lessons/[lessonId]">): Promise<Metadata> {
  const { lang, lessonId } = await params;
  const located = await getLocatedLesson(lessonId);

  if (!located || !isLocale(lang)) {
    return { title: "Lesson not found" };
  }

  const dict = await getDictionary(lang);
  return {
    title: t(dict, located.ref.title),
    description: t(dict, located.ref.goal),
  };
}

export default async function LessonPage({
  params,
}: PageProps<"/[lang]/lessons/[lessonId]">) {
  const { lang, lessonId } = await params;

  if (!isLocale(lang)) {
    notFound();
  }

  const [located, lesson, adjacent, dict] = await Promise.all([
    getLocatedLesson(lessonId),
    getLesson(lessonId),
    getAdjacentLessons(lessonId),
    getDictionary(lang),
  ]);

  if (!located || !lesson) {
    notFound();
  }

  const { previous, next } = adjacent;

  return (
    <div>
      <div className="space-y-3">
        <Link
          href={
            String(located.stage.id) === "0"
              ? withLang(lang, "/")
              : withLang(lang, `/stages/${located.stage.id}`)
          }
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          ←{" "}
          {String(located.stage.id) === "0"
            ? t(dict, "All stages")
            : t(dict, located.stage.title)}
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>{t(dict, "Stage {id}", { id: located.stage.id })}</span>
          <span aria-hidden="true">·</span>
          <span>{t(dict, located.stage.level)}</span>
          <span aria-hidden="true">·</span>
          <span>
            {t(dict, "Lesson {n}", { n: lessonNumberFromId(located.ref.id) })}
          </span>
          <LessonStatus lessonId={located.ref.id} dict={dict} />
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">
          {t(dict, located.ref.title)}
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          {t(dict, located.ref.goal)}
        </p>
      </div>

      <div className="mt-10">
        {isPronunciationLesson(lesson) ? (
          <PronunciationLessonView lesson={lesson} dict={dict} />
        ) : (
          <StandardLessonView lesson={lesson} dict={dict} />
        )}
      </div>

      <LessonCompletion lessonId={located.ref.id} dict={dict} />

      <LessonNav lang={lang} dict={dict} previous={previous} next={next} />
    </div>
  );
}
