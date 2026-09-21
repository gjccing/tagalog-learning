import { AudioText } from "@/components/AudioText";
import { t, type Dictionary } from "@/lib/i18n";
import type { StandardLesson } from "@/lib/types";

export function StandardLessonView({
  lesson,
  dict,
}: {
  lesson: StandardLesson;
  dict: Dictionary;
}) {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t(dict, "Vocabulary")}
        </h2>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {lesson.vocabulary.map((item) => (
            <li
              key={`${item.tagalog}-${item.english}`}
              className="grid gap-1 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center sm:gap-6"
            >
              <div className="flex items-center gap-3">
                <AudioText
                  text={item.tagalog}
                  label={t(dict, "Play {text}", { text: item.tagalog })}
                />
                <span className="text-lg font-medium tracking-wide text-accent">
                  {item.tagalog}
                </span>
              </div>
              <span className="pl-12 text-muted sm:pl-0">
                {t(dict, item.english)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t(dict, "Useful sentences")}
        </h2>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {lesson.patterns.map((pattern) => (
            <li
              key={`${pattern.tagalog}-${pattern.english}`}
              className="grid gap-1 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center sm:gap-6"
            >
              <div className="flex items-center gap-3">
                <AudioText
                  text={pattern.tagalog}
                  label={t(dict, "Play {text}", { text: pattern.tagalog })}
                />
                <span className="text-lg font-medium tracking-wide text-accent">
                  {pattern.tagalog}
                </span>
              </div>
              <span className="pl-12 text-muted sm:pl-0">
                {t(dict, pattern.english)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {lesson.notes && lesson.notes.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t(dict, "Notes")}
          </h2>
          <ul className="space-y-2">
            {lesson.notes.map((note) => (
              <li
                key={note}
                className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted"
              >
                {t(dict, note)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
