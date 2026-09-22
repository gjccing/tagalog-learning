import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_TC } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WebMcpTools } from "@/components/WebMcpTools";
import { getCurriculum } from "@/lib/content";
import { getDictionary, isLocale, locales, t } from "@/lib/i18n";
import { getSiteUrl, socialMetadata } from "@/lib/site";
import { getWebMcpCatalog } from "@/lib/webmcp-catalog";

import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansTC = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

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
    metadataBase: new URL(getSiteUrl()),
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

  const [curriculum, catalog] = await Promise.all([
    getCurriculum(),
    getWebMcpCatalog(lang),
  ]);
  const dict = getDictionary(lang);

  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansTC.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <WebMcpTools catalog={catalog} />
        <SiteHeader lang={lang} dict={dict} />
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 sm:px-6">
          {children}
        </main>
        <SiteFooter dict={dict} title={t(dict, curriculum.course.title)} />
      </body>
      <Analytics />
      <SpeedInsights />
    </html>
  );
}
