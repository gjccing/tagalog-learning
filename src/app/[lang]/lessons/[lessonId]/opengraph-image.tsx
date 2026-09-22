import { getCurriculum, getLocatedLesson, lessonNumberFromId } from "@/lib/content";
import { getDictionary, isLocale, t } from "@/lib/i18n";
import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Practical Tagalog lesson";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ lang: string; lessonId: string }>;
}) {
  const { lang, lessonId } = await params;
  const locale = isLocale(lang) ? lang : "en";
  const [curriculum, located, dict] = await Promise.all([
    getCurriculum(),
    getLocatedLesson(lessonId),
    getDictionary(locale),
  ]);

  if (!located) {
    return ogImage({
      eyebrow: t(dict, curriculum.course.title),
      title: t(dict, "Lesson not found"),
    });
  }

  return ogImage({
    eyebrow: t(dict, "Lesson {n}", { n: lessonNumberFromId(located.ref.id) }),
    title: t(dict, located.ref.title),
    subtitle: t(dict, located.ref.goal),
  });
}
