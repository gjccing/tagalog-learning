import { headers } from "next/headers";
import Link from "next/link";
import { getDictionary, isLocale, t, withLang } from "@/lib/i18n";

export default async function NotFound() {
  const headerLang = (await headers()).get("x-lang") ?? "en";
  const locale = isLocale(headerLang) ? headerLang : "en";
  const dict = await getDictionary(locale);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">
        {t(dict, "Page not found")}
      </h1>
      <p className="text-muted">
        {t(dict, "That stage or lesson is not in the current curriculum.")}
      </p>
      <Link
        href={withLang(locale, "/")}
        className="inline-block text-accent hover:underline"
      >
        {t(dict, "Back to the course")}
      </Link>
    </div>
  );
}
