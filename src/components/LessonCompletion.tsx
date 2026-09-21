"use client";

import { t, type Dictionary } from "@/lib/i18n";
import {
  completeLesson,
  getLessonState,
  markLessonIncomplete,
} from "@/lib/progress";
import { useProgress } from "@/lib/use-progress";

export function LessonCompletion({
  lessonId,
  dict,
}: {
  lessonId: string;
  dict: Dictionary;
}) {
  const progress = useProgress();
  const completed = getLessonState(progress, lessonId) === "completed";

  return (
    <label className="mt-10 inline-flex cursor-pointer select-none items-center gap-3 text-sm">
      <span className="relative flex size-5 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={completed}
          onChange={() => {
            if (completed) {
              markLessonIncomplete(lessonId);
            } else {
              completeLesson(lessonId);
            }
          }}
          className="peer absolute inset-0 cursor-pointer opacity-0"
        />
        <span
          aria-hidden="true"
          className={
            completed
              ? "flex size-5 items-center justify-center rounded-md border border-accent bg-accent text-background peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
              : "flex size-5 items-center justify-center rounded-md border border-border bg-card peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
          }
        >
          {completed ? (
            <svg
              viewBox="0 0 16 16"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M3.5 8.5 6.5 11.5 12.5 4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </span>
      </span>
      <span className={completed ? "text-muted" : "text-foreground"}>
        {completed
          ? t(dict, "Mark as incomplete")
          : t(dict, "Complete lesson")}
      </span>
    </label>
  );
}
