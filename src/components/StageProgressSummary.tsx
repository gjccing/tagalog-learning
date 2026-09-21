"use client";

import { ProgressBar } from "@/components/ProgressBar";
import { t, type Dictionary } from "@/lib/i18n";
import { getProgressCounts } from "@/lib/progress";
import { useProgress } from "@/lib/use-progress";

export function StageProgressSummary({
  dict,
  lessonIds,
}: {
  dict: Dictionary;
  lessonIds: string[];
}) {
  const progress = useProgress();
  const counts = getProgressCounts(progress, lessonIds);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {t(dict, "{completed} of {total} lessons completed", counts)}
      </p>
      <ProgressBar
        value={counts.percent}
        label={t(dict, "{completed} of {total} lessons completed", counts)}
      />
    </div>
  );
}
