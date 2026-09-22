import { getCurriculum, getLocatedLesson, lessonNumberFromId } from "@/lib/content";
import { getDictionary, parseLocale, t } from "@/lib/i18n";
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
  const locale = parseLocale(lang);
  const dict = getDictionary(locale);
  const [curriculum, located] = await Promise.all([
    getCurriculum(),
    getLocatedLesson(lessonId),
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
