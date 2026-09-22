import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentLang } from "@/components/DocumentLang";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WebMcpTools } from "@/components/WebMcpTools";
import { getCurriculum } from "@/lib/content";
import { getDictionary, isLocale, locales, t } from "@/lib/i18n";
import { socialMetadata } from "@/lib/site";
import { getWebMcpCatalog } from "@/lib/webmcp-catalog";

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const dynamic = "force-static";

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) {
    return { title: "Practical Tagalog" };
  }

  const curriculum = await getCurriculum();
  const dict = getDictionary(lang);
  const title = t(
    dict,
    "Practical Tagalog — Free everyday Tagalog lessons from A0 to A2",
  );
  const description = t(
    dict,
    "Learn practical Tagalog (Filipino) for everyday life. Free lessons with audio, Anki decks, and speaking practice.",
  );

  return {
    title: {
      default: title,
      template: `%s · ${t(dict, curriculum.course.title)}`,
    },
    description,
    ...socialMetadata(lang, {
      title,
      description,
      siteName: t(dict, curriculum.course.title),
    }),
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

  const [curriculum, dict, catalog] = await Promise.all([
    getCurriculum(),
    getDictionary(lang),
    getWebMcpCatalog(lang),
  ]);

  return (
    <>
      <DocumentLang lang={lang} />
      <WebMcpTools catalog={catalog} />
      <SiteHeader lang={lang} dict={dict} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 sm:px-6">
        {children}
      </main>
      <SiteFooter dict={dict} title={t(dict, curriculum.course.title)} />
    </>
  );
}
