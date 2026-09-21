"use client";

import { useSyncExternalStore } from "react";
import {
  EMPTY_PROGRESS,
  getSnapshot,
  subscribeProgress,
  type LearningProgress,
} from "./progress";

export function useProgress(): LearningProgress {
  return useSyncExternalStore(subscribeProgress, getSnapshot, () => EMPTY_PROGRESS);
}

export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
