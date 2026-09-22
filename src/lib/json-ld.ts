import { getStageHref, stageParentHref } from "@/lib/content";
import { getSiteUrl, localizedPath } from "@/lib/site";
import type { Locale } from "@/lib/locales";
import type { Curriculum, LocatedLesson, Stage } from "@/lib/types";

function absolute(pathname: string) {
  return `${getSiteUrl()}${pathname}`;
}

function interfaceLanguage(lang: Locale) {
  return lang === "zh-TW" ? "zh-Hant" : "en";
}

export function websiteJsonLd(lang: Locale, name: string, description: string) {
  const url = absolute(localizedPath(lang, "/"));

  return {
    "@type": "WebSite",
    "@id": `${url}#website`,
    name,
    description,
    url,
    inLanguage: [interfaceLanguage(lang), "tl"],
  };
}

export function courseJsonLd(
  lang: Locale,
  curriculum: Curriculum,
  name: string,
  description: string,
) {
  const url = absolute(localizedPath(lang, "/"));

  return {
    "@type": "Course",
    "@id": `${url}#course`,
    name,
    description,
    url,
    inLanguage: ["tl", interfaceLanguage(lang)],
    isAccessibleForFree: true,
    educationalLevel: "Beginner",
    teaches: "Tagalog",
    provider: {
      "@type": "Organization",
      name,
      url,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      category: "Free",
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      inLanguage: ["tl", interfaceLanguage(lang)],
    },
    numberOfCredits: 0,
    hasPart: curriculum.stages.map((stage) => ({
      "@type": "LearningResource",
      name: stage.title,
      description: stage.goal,
      educationalLevel: stage.level,
      url: absolute(getStageHref(lang, stage)),
    })),
  };
}

export function stageJsonLd(
  lang: Locale,
  stage: Stage,
  name: string,
  description: string,
  courseName: string,
) {
  const url = absolute(localizedPath(lang, `/stages/${stage.id}`));
  const home = absolute(localizedPath(lang, "/"));

  return {
    "@type": "LearningResource",
    "@id": `${url}#stage`,
    name,
    description,
    url,
    learningResourceType: "Unit",
    educationalLevel: stage.level,
    inLanguage: ["tl", interfaceLanguage(lang)],
    isAccessibleForFree: true,
    isPartOf: {
      "@type": "Course",
      name: courseName,
      url: home,
    },
    hasPart: stage.lessons.map((lesson) => ({
      "@type": "LearningResource",
      name: lesson.title,
      description: lesson.goal,
      url: absolute(localizedPath(lang, `/lessons/${lesson.id}`)),
    })),
  };
}

export function lessonJsonLd(
  lang: Locale,
  located: LocatedLesson,
  name: string,
  description: string,
  courseName: string,
  stageName: string,
) {
  const url = absolute(localizedPath(lang, `/lessons/${located.ref.id}`));
  const home = absolute(localizedPath(lang, "/"));
  const stageUrl = absolute(stageParentHref(lang, located.stage));

  return {
    "@type": "LearningResource",
    "@id": `${url}#lesson`,
    name,
    description,
    url,
    learningResourceType: "Lesson",
    educationalLevel: located.stage.level,
    inLanguage: ["tl", interfaceLanguage(lang)],
    isAccessibleForFree: true,
    teaches: "Tagalog",
    isPartOf: [
      { "@type": "Course", name: courseName, url: home },
      { "@type": "LearningResource", name: stageName, url: stageUrl },
    ],
  };
}

export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}

export function graphJsonLd(...nodes: Record<string, unknown>[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}
