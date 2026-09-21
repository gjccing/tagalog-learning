"use client";

import { t, type Dictionary } from "@/lib/i18n";
import { getProgressCounts } from "@/lib/progress";
import { useProgress } from "@/lib/use-progress";

export function StageCardProgress({
  dict,
  lessonIds,
}: {
  dict: Dictionary;
  lessonIds: string[];
}) {
  const progress = useProgress();
  const counts = getProgressCounts(progress, lessonIds);

  return (
    <>
      <span>
        {t(dict, "{completed} / {total} lessons completed", counts)}
      </span>
      <span aria-hidden="true">·</span>
      <span>{t(dict, "{percent}%", counts)}</span>
    </>
  );
}
