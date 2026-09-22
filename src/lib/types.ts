export type Course = {
  id: string;
  title: string;
  goal: string;
};

export type CurriculumLessonRef = {
  id: string;
  title: string;
  goal: string;
};

export type Stage = {
  id: number | string;
  title: string;
  level: string;
  goal: string;
  lessons: CurriculumLessonRef[];
};

export type Curriculum = {
  course: Course;
  stages: Stage[];
};

export type SoundExample = {
  word: string;
  position: string;
  highlight: string;
};

export type PronunciationItem = {
  sound: string;
  examples: SoundExample[];
  note?: string;
};

export type PronunciationSection = {
  id: string;
  title: string;
  instruction?: string;
  items: PronunciationItem[];
  note?: string;
};

export type VocabItem = {
  tagalog: string;
  english: string;
};

export type PatternItem = {
  tagalog: string;
  english: string;
};

export type PracticeObjective = {
  id: string;
  description: string;
};

export type PracticeScenario = {
  id: string;
  title: string;
  setup: string;
  learnerGoal: string;
  targets: string[];
};

export type Practice = {
  objectives: PracticeObjective[];
  scenarios: PracticeScenario[];
};

export type PronunciationLesson = {
  id: string;
  stage: number | string;
  level: string;
  title: string;
  goal: string;
  sections: PronunciationSection[];
};

export type StandardLesson = {
  id: string;
  stage: number | string;
  level: string;
  title: string;
  goal: string;
  vocabulary: VocabItem[];
  patterns: PatternItem[];
  notes?: string[];
  practice?: Practice;
};

export type Lesson = PronunciationLesson | StandardLesson;

export type LocatedLesson = {
  ref: CurriculumLessonRef;
  stage: Stage;
  index: number;
};

export function isPronunciationLesson(
  lesson: Lesson,
): lesson is PronunciationLesson {
  return "sections" in lesson && Array.isArray(lesson.sections);
}
