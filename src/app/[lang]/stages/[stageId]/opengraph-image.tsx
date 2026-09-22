import { getCurriculum, getStage } from "@/lib/content";
import { getDictionary, parseLocale, t } from "@/lib/i18n";
import { ogContentType, ogImage, ogSize } from "@/lib/og";

export const alt = "Practical Tagalog stage";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ lang: string; stageId: string }>;
}) {
  const { lang, stageId } = await params;
  const locale = parseLocale(lang);
  const dict = getDictionary(locale);
  const [curriculum, stage] = await Promise.all([
    getCurriculum(),
    getStage(stageId),
  ]);

  if (!stage) {
    return ogImage({
      eyebrow: t(dict, curriculum.course.title),
      title: t(dict, "Stage not found"),
    });
  }

  return ogImage({
    eyebrow: t(dict, "Stage {id}", { id: stage.id }),
    title: t(dict, stage.title),
    subtitle: t(dict, stage.goal),
  });
}
