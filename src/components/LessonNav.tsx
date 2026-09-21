import Link from "next/link";
import type { LocatedLesson } from "@/lib/types";
import { t, withLang, type Dictionary } from "@/lib/i18n";

export function LessonNav({
  lang,
  dict,
  previous,
  next,
}: {
  lang: string;
  dict: Dictionary;
  previous: LocatedLesson | null;
  next: LocatedLesson | null;
}) {
  return (
    <nav className="mt-10 flex items-start justify-between gap-4 border-t border-border pt-6">
      {previous ? (
        <Link
          href={withLang(lang, `/lessons/${previous.ref.id}`)}
          className="max-w-[48%] text-left transition-colors hover:text-accent"
        >
          <p className="text-xs uppercase tracking-wide text-muted">
            {t(dict, "Previous")}
          </p>
          <p className="mt-1 font-medium">{t(dict, previous.ref.title)}</p>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={withLang(lang, `/lessons/${next.ref.id}`)}
          className="ml-auto max-w-[48%] text-right transition-colors hover:text-accent"
        >
          <p className="text-xs uppercase tracking-wide text-muted">
            {t(dict, "Next")}
          </p>
          <p className="mt-1 font-medium">{t(dict, next.ref.title)}</p>
        </Link>
      ) : null}
    </nav>
  );
}
