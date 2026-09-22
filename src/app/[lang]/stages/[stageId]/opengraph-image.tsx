import { getCurriculum, getStage } from "@/lib/content";
import { getDictionary, isLocale, t } from "@/lib/i18n";
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
  const locale = isLocale(lang) ? lang : "en";
  const [curriculum, stage, dict] = await Promise.all([
    getCurriculum(),
    getStage(stageId),
    getDictionary(locale),
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
