import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getCurriculum,
  getStage,
  getStageHref,
  lessonNumberFromId,
} from "@/lib/content";
import { JsonLd } from "@/components/JsonLd";
import { getDictionary, isLocale, locales, t, withLang } from "@/lib/i18n";
import {
  breadcrumbJsonLd,
  graphJsonLd,
  stageJsonLd,
} from "@/lib/json-ld";
import { localizedPath, pageAlternates, socialMetadata } from "@/lib/site";

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
  const title = t(dict, "{title} ({level})", {
    title: t(dict, stage.title),
    level: t(dict, stage.level),
  });
  const description = t(
    dict,
    "{goal} {count} Tagalog lessons for everyday life.",
    {
      goal: t(dict, stage.goal),
      count: stage.lessons.length,
    },
  );
  const alternates = pageAlternates(lang, `/stages/${stage.id}`);

  return {
    title,
    description,
    alternates,
    ...socialMetadata(lang, {
      title,
      description,
      url: alternates.canonical,
      siteName: t(dict, "Practical Tagalog"),
    }),
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

  const courseName = t(dict, "Practical Tagalog");
  const stageTitle = t(dict, stage.title);

  return (
    <div className="space-y-8">
      <JsonLd
        data={graphJsonLd(
          stageJsonLd(
            lang,
            {
              ...stage,
              title: stageTitle,
              goal: t(dict, stage.goal),
              lessons: stage.lessons.map((lesson) => ({
                ...lesson,
                title: t(dict, lesson.title),
                goal: t(dict, lesson.goal),
              })),
            },
            stageTitle,
            t(dict, stage.goal),
            courseName,
          ),
          breadcrumbJsonLd([
            { name: courseName, path: localizedPath(lang, "/") },
            {
              name: stageTitle,
              path: localizedPath(lang, `/stages/${stage.id}`),
            },
          ]),
        )}
      />
      <div className="space-y-3">
        <Link
          href={withLang(lang, "/")}
          className="inline-block text-sm text-muted transition-colors hover:text-foreground"
        >
          ← {t(dict, "All stages")}
        </Link>
        <h1 className="text-4xl font-semibold tracking-tight">
          {t(dict, stage.title)}
        </h1>
        <p className="max-w-2xl text-lg text-muted">{t(dict, stage.goal)}</p>
      </div>

      <ol className="space-y-3">
        {stage.lessons.map((lesson) => (
          <li key={lesson.id}>
            <Link
              href={withLang(lang, `/lessons/${lesson.id}`)}
              className="block rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-accent"
            >
              <p className="text-sm text-muted">
                {t(dict, "Lesson {n}", { n: lessonNumberFromId(lesson.id) })}
              </p>
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
