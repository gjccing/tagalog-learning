import { getCurriculum } from "@/lib/content";
import { getDictionary, isLocale, t } from "@/lib/i18n";
import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Practical Tagalog";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "en";
  const [curriculum, dict] = await Promise.all([
    getCurriculum(),
    getDictionary(locale),
  ]);

  return ogImage({
    eyebrow: t(dict, curriculum.course.title),
    title: t(dict, curriculum.course.title),
    subtitle: t(dict, curriculum.course.goal),
  });
}
