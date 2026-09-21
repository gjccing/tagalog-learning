"use client";

import { t, type Dictionary } from "@/lib/i18n";
import { getLessonState } from "@/lib/progress";
import { useProgress } from "@/lib/use-progress";

export function LessonListStatus({
  lessonId,
  dict,
}: {
  lessonId: string;
  dict: Dictionary;
}) {
  const progress = useProgress();
  const state = getLessonState(progress, lessonId);

  if (state === "not-started") return null;

  return (
    <p
      className={
        state === "completed"
          ? "text-sm font-medium text-accent"
          : "text-sm text-muted"
      }
    >
      {state === "completed" ? t(dict, "✓ Completed") : t(dict, "In progress")}
    </p>
  );
}
