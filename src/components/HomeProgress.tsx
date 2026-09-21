"use client";

import Link from "next/link";
import { ProgressBar } from "@/components/ProgressBar";
import { ResetProgressButton } from "@/components/ResetProgressButton";
import { t, withLang, type Dictionary } from "@/lib/i18n";
import {
  getContinueLessonId,
  getProgressCounts,
  hasLearningHistory,
} from "@/lib/progress";
import { useProgress } from "@/lib/use-progress";

export function HomeProgress({
  lang,
  dict,
  lessonIds,
}: {
  lang: string;
  dict: Dictionary;
  lessonIds: string[];
}) {
  const progress = useProgress();
  const counts = getProgressCounts(progress, lessonIds);
  const continueId = getContinueLessonId(progress, lessonIds);
  const courseComplete = counts.total > 0 && counts.completed === counts.total;
  const actionLabel = hasLearningHistory(progress)
    ? t(dict, "Continue learning")
    : t(dict, "Start learning");

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
        {t(dict, "Your progress")}
      </h2>
      <p className="text-muted">
        {t(dict, "{completed} of {total} lessons completed", counts)}
      </p>
      <div className="flex items-center gap-3">
        <ProgressBar value={counts.percent} label={t(dict, "Your progress")} />
        <span className="w-10 shrink-0 text-right text-sm tabular-nums text-muted">
          {t(dict, "{percent}%", counts)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {courseComplete ? (
          <p className="text-sm font-medium text-accent">
            {t(dict, "Course completed ✓")}
          </p>
        ) : continueId ? (
          <Link
            href={withLang(lang, `/lessons/${continueId}`)}
            className="inline-flex rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            {actionLabel}
          </Link>
        ) : null}
        <ResetProgressButton dict={dict} />
      </div>
    </section>
  );
}
