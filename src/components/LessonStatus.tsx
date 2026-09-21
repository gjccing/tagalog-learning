"use client";

import { useLayoutEffect } from "react";
import { t, type Dictionary } from "@/lib/i18n";
import { getLessonState, startLesson } from "@/lib/progress";
import { useIsClient, useProgress } from "@/lib/use-progress";

export function LessonStatus({
  lessonId,
  dict,
}: {
  lessonId: string;
  dict: Dictionary;
}) {
  const isClient = useIsClient();
  const progress = useProgress();

  useLayoutEffect(() => {
    startLesson(lessonId);
  }, [lessonId]);

  if (!isClient) return null;

  const state = getLessonState(progress, lessonId);
  const label =
    state === "completed"
      ? t(dict, "Completed")
      : state === "in-progress"
        ? t(dict, "In progress")
        : t(dict, "Not started");

  return (
    <>
      <span aria-hidden="true">·</span>
      <span className={state === "completed" ? "text-accent" : undefined}>
        {label}
      </span>
    </>
  );
}
