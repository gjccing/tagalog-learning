import { AudioText } from "@/components/AudioText";
import { highlightWord } from "@/lib/highlight";
import { t, type Dictionary } from "@/lib/i18n";
import type { PronunciationLesson } from "@/lib/types";

export function PronunciationLessonView({
  lesson,
  dict,
}: {
  lesson: PronunciationLesson;
  dict: Dictionary;
}) {
  return (
    <div className="space-y-12">
      {lesson.sections.map((section) => (
        <section key={section.id} className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {t(dict, section.title)}
            </h2>
            {section.instruction ? (
              <p className="text-muted">{t(dict, section.instruction)}</p>
            ) : null}
            {section.note ? (
              <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted">
                {t(dict, section.note)}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {section.items.map((item) => (
              <article
                key={item.sound}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <p className="font-mono text-4xl font-semibold tracking-wide text-accent">
                  {item.sound}
                </p>
                <ul className="mt-4 space-y-2">
                  {item.examples.map((example) => (
                    <li
                      key={`${item.sound}-${example.word}-${example.position}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-lg tracking-wide">
                        {highlightWord(
                          example.word,
                          example.highlight,
                          example.position,
                        )}
                      </span>
                      <AudioText
                        text={example.word}
                        label={t(dict, "Play {text}", { text: example.word })}
                      />
                    </li>
                  ))}
                </ul>
                {item.note ? (
                  <p className="mt-4 text-sm text-muted">{t(dict, item.note)}</p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
