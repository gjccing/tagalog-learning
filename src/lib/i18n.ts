import en from "../../langs/en.json";
import zhTW from "../../langs/zh-TW.json";
import type { Locale } from "./locales";

export type { Locale } from "./locales";
export { isLocale, locales, parseLocale, withLang } from "./locales";

export type Dictionary = Record<string, string>;

const dictionaries: Record<Locale, Dictionary> = {
  en,
  "zh-TW": zhTW,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function t(
  dict: Dictionary,
  key: string,
  vars?: Record<string, string | number>,
): string {
  let text = dict[key] ?? key;

  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }

  return text;
}
