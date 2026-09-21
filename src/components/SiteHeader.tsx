import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getCurriculum } from "@/lib/content";
import { t, withLang, type Dictionary, type Locale } from "@/lib/i18n";

export async function SiteHeader({
  lang,
  dict,
}: {
  lang: Locale;
  dict: Dictionary;
}) {
  const curriculum = await getCurriculum();

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href={withLang(lang, "/")} className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">
            {t(dict, curriculum.course.title)}
          </p>
        </Link>
        <div className="flex shrink-0 items-center gap-4">
          <LanguageSwitcher current={lang} label={t(dict, "Language")} />
        </div>
      </div>
    </header>
  );
}
