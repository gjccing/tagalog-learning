export const locales = ["en", "zh-TW"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function parseLocale(value: string | null | undefined): Locale {
  return value && isLocale(value) ? value : defaultLocale;
}

export function withLang(lang: string, pathname: string): string {
  const pathName = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `/${lang}${pathName === "/" ? "" : pathName}`;
}

export function replaceLocale(pathname: string, locale: Locale): string {
  const stripped = pathname.replace(
    new RegExp(`^/(${locales.join("|")})(?=/|$)`),
    "",
  );
  return withLang(locale, stripped || "/");
}
