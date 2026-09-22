import type { MetadataRoute } from "next";
import {
  flattenCurriculumLessons,
  getCurriculum,
  getStageHref,
} from "@/lib/content";
import { locales } from "@/lib/locales";
import {
  getSiteUrl,
  languageAlternates,
  localizedPath,
  pagePath,
} from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const curriculum = await getCurriculum();
  const paths = new Set<string>(["/"]);

  for (const stage of curriculum.stages) {
    const href = getStageHref("en", stage);
    if (href.startsWith("/en/stages/")) {
      paths.add(href.replace(/^\/en/, "") || "/");
    }
  }

  for (const entry of flattenCurriculumLessons(curriculum)) {
    paths.add(`/lessons/${entry.ref.id}`);
  }

  return [...paths].flatMap((pathname) => {
    const path = pagePath(pathname);
    const languages = Object.fromEntries(
      Object.entries(languageAlternates(path)).map(([key, value]) => [
        key,
        `${site}${value}`,
      ]),
    );

    return locales.map((lang) => ({
      url: `${site}${localizedPath(lang, path)}`,
      changeFrequency: path === "" ? "weekly" : "monthly",
      priority: path === "" ? 1 : path.startsWith("/lessons") ? 0.8 : 0.6,
      alternates: { languages },
    }));
  });
}
