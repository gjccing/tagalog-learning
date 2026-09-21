"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, replaceLocale, type Locale } from "@/lib/locales";

const labels: Record<Locale, string> = {
  en: "EN",
  "zh-TW": "繁中",
};

export function LanguageSwitcher({
  current,
  label,
}: {
  current: Locale;
  label: string;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="flex items-center gap-1 text-sm">
      {locales.map((locale) => {
        const active = locale === current;
        return (
          <Link
            key={locale}
            href={replaceLocale(pathname, locale)}
            hrefLang={locale}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              document.cookie = `lang=${locale}; path=/; max-age=31536000`;
            }}
            className={
              active
                ? "rounded-full bg-foreground px-2.5 py-1 font-medium text-background"
                : "rounded-full px-2.5 py-1 text-muted transition-colors hover:text-foreground"
            }
          >
            {labels[locale]}
          </Link>
        );
      })}
    </nav>
  );
}
