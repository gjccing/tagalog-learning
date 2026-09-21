import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentLang } from "@/components/DocumentLang";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurriculum } from "@/lib/content";
import { getDictionary, isLocale, locales, t } from "@/lib/i18n";

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const dynamic = "force-static";

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) {
    return { title: "Practical Tagalog for Adult" };
  }

  const curriculum = await getCurriculum();
  const dict = getDictionary(lang);

  return {
    title: {
      default: t(dict, curriculum.course.title),
      template: `%s · ${t(dict, curriculum.course.title)}`,
    },
    description: t(dict, curriculum.course.goal),
  };
}

export default async function LangLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;

  if (!isLocale(lang)) {
    notFound();
  }

  const dict = getDictionary(lang);

  return (
    <>
      <DocumentLang lang={lang} />
      <SiteHeader lang={lang} dict={dict} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 sm:px-6">
        {children}
      </main>
    </>
  );
}
