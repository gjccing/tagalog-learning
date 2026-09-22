import { locales, withLang, type Locale } from "@/lib/locales";

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(
    /^https?:\/\//,
    "",
  );
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

export function pagePath(pathname: string): string {
  if (!pathname || pathname === "/") return "";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export function localizedPath(lang: Locale, pathname: string): string {
  return withLang(lang, pagePath(pathname) || "/");
}

export function languageAlternates(pathname: string) {
  const path = pagePath(pathname);
  const languages: Record<string, string> = {
    "x-default": localizedPath("en", path),
  };

  for (const lang of locales) {
    languages[lang] = localizedPath(lang, path);
  }

  return languages;
}

export function pageAlternates(lang: Locale, pathname: string) {
  return {
    canonical: localizedPath(lang, pathname),
    languages: languageAlternates(pathname),
  };
}

export function socialMetadata(
  lang: Locale,
  {
    title,
    description,
    url,
    type = "website",
    siteName,
  }: {
    title: string;
    description: string;
    url?: string;
    type?: "website" | "article";
    siteName: string;
  },
) {
  return {
    openGraph: {
      type,
      locale: lang === "zh-TW" ? "zh_TW" : "en_US",
      siteName,
      title,
      description,
      ...(url ? { url } : {}),
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
    },
  };
}
