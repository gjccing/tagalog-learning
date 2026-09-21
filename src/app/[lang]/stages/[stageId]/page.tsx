import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LessonListStatus } from "@/components/LessonListStatus";
import { StageProgressSummary } from "@/components/StageProgressSummary";
import {
  getCurriculum,
  getStage,
  getStageHref,
  lessonNumberFromId,
} from "@/lib/content";
import { getDictionary, isLocale, locales, t, withLang } from "@/lib/i18n";

export async function generateStaticParams() {
  const curriculum = await getCurriculum();
  return locales.flatMap((lang) =>
    curriculum.stages.map((stage) => ({
      lang,
      stageId: String(stage.id),
    })),
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/stages/[stageId]">): Promise<Metadata> {
  const { lang, stageId } = await params;
  const stage = await getStage(stageId);

  if (!stage || !isLocale(lang)) {
    return { title: "Stage not found" };
  }

  const dict = await getDictionary(lang);
  return {
    title: t(dict, stage.title),
    description: t(dict, stage.goal),
  };
}

export default async function StagePage({
  params,
}: PageProps<"/[lang]/stages/[stageId]">) {
  const { lang, stageId } = await params;

  if (!isLocale(lang)) {
    notFound();
  }

  const [stage, dict] = await Promise.all([
    getStage(stageId),
    getDictionary(lang),
  ]);

  if (!stage) {
    notFound();
  }

  const stageHref = getStageHref(lang, stage);
  if (stageHref !== withLang(lang, `/stages/${stage.id}`)) {
    redirect(stageHref);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link
          href={withLang(lang, "/")}
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          ← {t(dict, "All stages")}
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>{t(dict, "Stage {id}", { id: stage.id })}</span>
          <span aria-hidden="true">·</span>
          <span>{t(dict, stage.level)}</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">
          {t(dict, stage.title)}
        </h1>
        <p className="max-w-2xl text-lg text-muted">{t(dict, stage.goal)}</p>
        <StageProgressSummary
          dict={dict}
          lessonIds={stage.lessons.map((lesson) => lesson.id)}
        />
      </div>

      <ol className="space-y-3">
        {stage.lessons.map((lesson) => (
          <li key={lesson.id}>
            <Link
              href={withLang(lang, `/lessons/${lesson.id}`)}
              className="block rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-accent"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-muted">
                  {t(dict, "Lesson {n}", { n: lessonNumberFromId(lesson.id) })}
                </p>
                <LessonListStatus lessonId={lesson.id} dict={dict} />
              </div>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                {t(dict, lesson.title)}
              </h2>
              <p className="mt-2 text-muted">{t(dict, lesson.goal)}</p>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
