"use client";

import { t, type Dictionary } from "@/lib/i18n";
import { hasLearningHistory, resetProgress } from "@/lib/progress";
import { useProgress } from "@/lib/use-progress";

export function ResetProgressButton({ dict }: { dict: Dictionary }) {
  const progress = useProgress();

  return (
    <button
      type="button"
      disabled={!hasLearningHistory(progress)}
      onClick={() => {
        if (window.confirm(t(dict, "Reset all learning progress?"))) {
          resetProgress();
        }
      }}
      className="text-sm text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
    >
      {t(dict, "Reset progress")}
    </button>
  );
}
