import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurriculum, getStageHref } from "@/lib/content";
import { getDictionary, isLocale, t } from "@/lib/i18n";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;

  if (!isLocale(lang)) {
    notFound();
  }

  const [curriculum, dict] = await Promise.all([
    getCurriculum(),
    getDictionary(lang),
  ]);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
          {t(dict, "Course")}
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          {t(dict, curriculum.course.title)}
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          {t(dict, curriculum.course.goal)}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
          {t(dict, "Stages")}
        </h2>
        <div className="grid gap-4">
          {curriculum.stages.map((stage) => (
            <Link
              key={String(stage.id)}
              href={getStageHref(lang, stage)}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-accent"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <span>{t(dict, "Stage {id}", { id: stage.id })}</span>
                <span aria-hidden="true">·</span>
                <span>{t(dict, stage.level)}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {t(
                    dict,
                    stage.lessons.length === 1
                      ? "{count} lesson"
                      : "{count} lessons",
                    { count: stage.lessons.length },
                  )}
                </span>
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                {t(dict, stage.title)}
              </h3>
              <p className="mt-2 max-w-3xl text-muted">{t(dict, stage.goal)}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
