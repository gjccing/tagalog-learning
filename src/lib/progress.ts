/**
 * Course/lesson completion only.
 * This is learner state, not flashcard mastery, and stays separate
 * from any future FSRS review system.
 */

export const PROGRESS_STORAGE_KEY = "tagalog-learning-progress-v1";
export const PROGRESS_CHANGE_EVENT = "tagalog-learning-progress-change";

export type LessonProgress = {
  startedAt?: string;
  completedAt?: string;
  lastVisitedAt?: string;
};

export type LearningProgress = {
  version: 1;
  lessons: Record<string, LessonProgress>;
  lastLessonId?: string;
};

export type ProgressCounts = {
  completed: number;
  total: number;
  percent: number;
};

export type LessonState = "not-started" | "in-progress" | "completed";

export const EMPTY_PROGRESS: LearningProgress = Object.freeze({
  version: 1,
  lessons: Object.freeze({}) as Record<string, LessonProgress>,
});

type CurriculumLike = {
  stages: Array<{
    lessons: Array<{ id: string }>;
  }>;
};

type StageLike = {
  lessons: Array<{ id: string }>;
};

let cachedRaw: string | null | undefined;
let cachedProgress: LearningProgress = EMPTY_PROGRESS;

export function createEmptyProgress(): LearningProgress {
  return { version: 1, lessons: {} };
}

export function isLessonStartedIn(
  progress: LearningProgress,
  lessonId: string,
): boolean {
  return Boolean(progress.lessons[lessonId]?.startedAt);
}

export function isLessonCompletedIn(
  progress: LearningProgress,
  lessonId: string,
): boolean {
  return Boolean(progress.lessons[lessonId]?.completedAt);
}

export function getLessonState(
  progress: LearningProgress,
  lessonId: string,
): LessonState {
  if (isLessonCompletedIn(progress, lessonId)) return "completed";
  if (isLessonStartedIn(progress, lessonId)) return "in-progress";
  return "not-started";
}

export function getProgressCounts(
  progress: LearningProgress,
  lessonIds: string[],
): ProgressCounts {
  const total = lessonIds.length;
  const completed = lessonIds.filter((id) =>
    isLessonCompletedIn(progress, id),
  ).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { completed, total, percent };
}

export function getCompletedLessonCount(
  lessonIds: string[],
  progress: LearningProgress = getProgress(),
): number {
  return getProgressCounts(progress, lessonIds).completed;
}

export function getCourseProgress(
  progress: LearningProgress,
  curriculum: CurriculumLike,
): ProgressCounts {
  return getProgressCounts(progress, flattenLessonIds(curriculum));
}

export function getStageProgress(
  progress: LearningProgress,
  stage: StageLike,
): ProgressCounts {
  return getProgressCounts(
    progress,
    stage.lessons.map((lesson) => lesson.id),
  );
}

export function getContinueLessonId(
  progress: LearningProgress,
  lessonIds: string[],
): string | null {
  if (lessonIds.length === 0) return null;

  const lastLessonId = progress.lastLessonId;
  if (
    lastLessonId &&
    lessonIds.includes(lastLessonId) &&
    !isLessonCompletedIn(progress, lastLessonId)
  ) {
    return lastLessonId;
  }

  const lastIndex = lastLessonId ? lessonIds.indexOf(lastLessonId) : -1;
  if (lastIndex >= 0) {
    const nextIncomplete = lessonIds
      .slice(lastIndex + 1)
      .find((id) => !isLessonCompletedIn(progress, id));
    if (nextIncomplete) return nextIncomplete;
  }

  return lessonIds.find((id) => !isLessonCompletedIn(progress, id)) ?? null;
}

export function hasLearningHistory(progress: LearningProgress): boolean {
  return Boolean(progress.lastLessonId) || Object.keys(progress.lessons).length > 0;
}

export function parseProgress(raw: string | null): LearningProgress {
  if (!raw) return createEmptyProgress();

  try {
    const data: unknown = JSON.parse(raw);
    if (!isLearningProgress(data)) {
      return createEmptyProgress();
    }

    return {
      version: 1,
      lessons: data.lessons,
      lastLessonId: data.lastLessonId,
    };
  } catch {
    return createEmptyProgress();
  }
}

export function subscribeProgress(onStoreChange: () => void): () => void {
  const handleChange = () => {
    cachedRaw = undefined;
    onStoreChange();
  };

  window.addEventListener("storage", handleChange);
  window.addEventListener(PROGRESS_CHANGE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(PROGRESS_CHANGE_EVENT, handleChange);
  };
}

export function getSnapshot(): LearningProgress {
  if (!canUseStorage()) {
    return EMPTY_PROGRESS;
  }

  const raw = readRaw();
  if (cachedRaw === raw) {
    return cachedProgress;
  }

  cachedRaw = raw;
  cachedProgress = parseProgress(raw);
  return cachedProgress;
}

export function getProgress(): LearningProgress {
  return getSnapshot();
}

export function getLessonProgress(lessonId: string): LessonProgress | undefined {
  return getProgress().lessons[lessonId];
}

export function getLastLessonId(): string | undefined {
  return getProgress().lastLessonId;
}

export function isLessonStarted(lessonId: string): boolean {
  return isLessonStartedIn(getProgress(), lessonId);
}

export function isLessonCompleted(lessonId: string): boolean {
  return isLessonCompletedIn(getProgress(), lessonId);
}

export function startLesson(lessonId: string): LearningProgress {
  const now = nowIso();

  return updateProgress((progress) => {
    const existing = progress.lessons[lessonId] ?? {};

    return {
      ...progress,
      lastLessonId: lessonId,
      lessons: {
        ...progress.lessons,
        [lessonId]: {
          ...existing,
          startedAt: existing.startedAt ?? now,
          lastVisitedAt: now,
        },
      },
    };
  });
}

export function completeLesson(lessonId: string): LearningProgress {
  const now = nowIso();

  return updateProgress((progress) => {
    const existing = progress.lessons[lessonId] ?? {};

    return {
      ...progress,
      lastLessonId: lessonId,
      lessons: {
        ...progress.lessons,
        [lessonId]: {
          ...existing,
          startedAt: existing.startedAt ?? now,
          lastVisitedAt: now,
          completedAt: existing.completedAt ?? now,
        },
      },
    };
  });
}

export function markLessonIncomplete(lessonId: string): LearningProgress {
  return updateProgress((progress) => {
    const existing = progress.lessons[lessonId];
    if (!existing?.completedAt) return progress;

    return {
      ...progress,
      lessons: {
        ...progress.lessons,
        [lessonId]: {
          startedAt: existing.startedAt,
          lastVisitedAt: existing.lastVisitedAt,
        },
      },
    };
  });
}

export function resetProgress(): LearningProgress {
  const empty = createEmptyProgress();
  writeProgress(empty);
  return empty;
}

function flattenLessonIds(curriculum: CurriculumLike): string[] {
  return curriculum.stages.flatMap((stage) =>
    stage.lessons.map((lesson) => lesson.id),
  );
}

function updateProgress(
  updater: (progress: LearningProgress) => LearningProgress,
): LearningProgress {
  const next = updater(getProgress());
  writeProgress(next);
  return next;
}

function writeProgress(progress: LearningProgress): void {
  if (!canUseStorage()) return;

  try {
    const raw = JSON.stringify(progress);
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedProgress = progress;
    window.dispatchEvent(new Event(PROGRESS_CHANGE_EVENT));
  } catch {
    cachedRaw = undefined;
    cachedProgress = progress;
  }
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(PROGRESS_STORAGE_KEY);
  } catch {
    return null;
  }
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function nowIso(): string {
  return new Date().toISOString();
}

function isLearningProgress(value: unknown): value is LearningProgress {
  if (!value || typeof value !== "object") return false;

  const data = value as Record<string, unknown>;
  if (data.version !== 1) return false;
  if (data.lastLessonId !== undefined && typeof data.lastLessonId !== "string") {
    return false;
  }
  if (!data.lessons || typeof data.lessons !== "object" || Array.isArray(data.lessons)) {
    return false;
  }

  return Object.values(data.lessons).every(isLessonProgress);
}

function isLessonProgress(value: unknown): value is LessonProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const item = value as Record<string, unknown>;
  return (
    isOptionalTimestamp(item.startedAt) &&
    isOptionalTimestamp(item.completedAt) &&
    isOptionalTimestamp(item.lastVisitedAt)
  );
}

function isOptionalTimestamp(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}
