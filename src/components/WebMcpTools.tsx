"use client";

import { useEffect } from "react";
import type { WebMcpCatalog, WebMcpLesson } from "@/lib/webmcp-catalog";
import { registerWebMcpTools, type WebMcpToolDefinition } from "@/lib/webmcp";

export function WebMcpTools({ catalog }: { catalog: WebMcpCatalog }) {
  useEffect(() => {
    const controller = new AbortController();
    void registerWebMcpTools(createTools(catalog), controller.signal);
    return () => controller.abort();
  }, [catalog]);

  return null;
}

function createTools(catalog: WebMcpCatalog): WebMcpToolDefinition[] {
  return [
    {
      name: "get_page_context",
      title: "Get page context",
      description:
        "Read the current Tagalog course page: language, whether this is the home, a stage, or a lesson, and the matching ids and titles.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: () => pageContext(catalog),
    },
    {
      name: "list_lessons",
      title: "List lessons",
      description:
        "List stages and lessons in Practical Tagalog for Adult. Use this to discover lesson ids before opening or reading a lesson. Optionally filter by stage_id (0 or 1).",
      inputSchema: {
        type: "object",
        properties: {
          stage_id: {
            type: "string",
            description: "Optional stage id, such as 0 or 1.",
          },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: ({ stage_id }) => listLessons(catalog, optionalString(stage_id)),
    },
    {
      name: "get_lesson",
      title: "Get lesson",
      description:
        "Read a lesson's vocabulary, useful sentences, or pronunciation items. Pass a lesson id (lesson-1) or number (1). Omit lesson to use the lesson on the current page.",
      inputSchema: {
        type: "object",
        properties: {
          lesson: {
            type: "string",
            description: "Lesson id or number. Omit to use the current page.",
          },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: ({ lesson }) => {
        const found = resolveLesson(catalog, optionalString(lesson));
        if (!found) {
          return { ok: false, error: "Lesson not found. Call list_lessons first." };
        }
        return { ok: true, lesson: found };
      },
    },
    {
      name: "open_page",
      title: "Open page",
      description:
        "Open the course home, a stage list, or a lesson in this tab. For a stage, pass stage_id. For a lesson, pass lesson as an id or number.",
      inputSchema: {
        type: "object",
        properties: {
          target: {
            type: "string",
            enum: ["home", "stage", "lesson"],
            description: "Which page to open.",
          },
          stage_id: {
            type: "string",
            description: "Required when target is stage.",
          },
          lesson: {
            type: "string",
            description: "Lesson id or number. Required when target is lesson.",
          },
        },
        required: ["target"],
        additionalProperties: false,
      },
      execute: ({ target, stage_id, lesson }) =>
        openPage(
          catalog,
          optionalString(target),
          optionalString(stage_id),
          optionalString(lesson),
        ),
    },
    {
      name: "play_audio",
      title: "Play audio",
      description:
        "Play the Tagalog audio button for a word or sentence on the current lesson page. The text must match a phrase shown on this page, such as Kumusta? or Ako si Anna.",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Exact Tagalog word or sentence on this page.",
          },
        },
        required: ["text"],
        additionalProperties: false,
      },
      execute: ({ text }) => playAudio(optionalString(text)),
    },
    {
      name: "open_chatgpt_practice",
      title: "Open ChatGPT practice",
      description:
        "Open the ChatGPT voice-practice flow for the current standard lesson. Only works on a lesson page that already shows Practice with ChatGPT. Lesson 0 has no ChatGPT practice.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: () => openChatgptPractice(),
    },
    {
      name: "get_anki_deck",
      title: "Get Anki deck",
      description:
        "Return the Anki .apkg download URL for a lesson. Pass a lesson id or number, or omit to use the current lesson. Lesson 0 has no deck.",
      inputSchema: {
        type: "object",
        properties: {
          lesson: {
            type: "string",
            description: "Lesson id or number. Omit to use the current page.",
          },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: ({ lesson }) => {
        const found = resolveLesson(catalog, optionalString(lesson));
        if (!found) {
          return { ok: false, error: "Lesson not found. Call list_lessons first." };
        }
        if (!found.ankiHref) {
          return {
            ok: false,
            error: `Lesson ${found.number} has no Anki deck.`,
          };
        }
        return {
          ok: true,
          lesson: found.id,
          href: new URL(found.ankiHref, window.location.origin).href,
        };
      },
    },
  ];
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function allLessons(catalog: WebMcpCatalog): WebMcpLesson[] {
  return catalog.stages.flatMap((stage) => stage.lessons);
}

function findLesson(
  catalog: WebMcpCatalog,
  query: string,
): WebMcpLesson | undefined {
  const lessons = allLessons(catalog);
  const byId = lessons.find((lesson) => lesson.id === query);
  if (byId) return byId;

  const number = Number(query.replace(/^lesson-/, ""));
  if (!Number.isFinite(number)) return undefined;
  return lessons.find((lesson) => lesson.number === number);
}

function lessonFromPath(catalog: WebMcpCatalog): WebMcpLesson | undefined {
  const match = window.location.pathname.match(/\/lessons\/([^/]+)/);
  return match ? findLesson(catalog, match[1]) : undefined;
}

function resolveLesson(
  catalog: WebMcpCatalog,
  query?: string,
): WebMcpLesson | undefined {
  return query ? findLesson(catalog, query) : lessonFromPath(catalog);
}

function pageContext(catalog: WebMcpCatalog) {
  const path = window.location.pathname;
  const lesson = lessonFromPath(catalog);
  if (lesson) {
    return {
      lang: catalog.lang,
      page: "lesson",
      lesson: {
        id: lesson.id,
        number: lesson.number,
        title: lesson.title,
        stageId: lesson.stageId,
        stageTitle: lesson.stageTitle,
      },
    };
  }

  const stageMatch = path.match(/\/stages\/([^/]+)/);
  if (stageMatch) {
    const stage = catalog.stages.find((item) => item.id === stageMatch[1]);
    return {
      lang: catalog.lang,
      page: "stage",
      stage: stage
        ? { id: stage.id, title: stage.title, href: stage.href }
        : { id: stageMatch[1] },
    };
  }

  return {
    lang: catalog.lang,
    page: "home",
    course: catalog.course,
  };
}

function listLessons(catalog: WebMcpCatalog, stageId?: string) {
  const stages = stageId
    ? catalog.stages.filter((stage) => stage.id === stageId)
    : catalog.stages;

  if (stageId && stages.length === 0) {
    return { ok: false, error: `Stage ${stageId} not found.` };
  }

  return {
    ok: true,
    lang: catalog.lang,
    course: catalog.course,
    stages: stages.map((stage) => ({
      id: stage.id,
      title: stage.title,
      level: stage.level,
      goal: stage.goal,
      href: stage.href,
      lessons: stage.lessons.map((lesson) => ({
        id: lesson.id,
        number: lesson.number,
        title: lesson.title,
        goal: lesson.goal,
        href: lesson.href,
        hasChatgptPractice: lesson.hasChatgptPractice,
        hasAnkiDeck: Boolean(lesson.ankiHref),
      })),
    })),
  };
}

function openPage(
  catalog: WebMcpCatalog,
  target?: string,
  stageId?: string,
  lessonQuery?: string,
) {
  if (target === "home") {
    return navigate(`/${catalog.lang}`);
  }

  if (target === "stage") {
    if (!stageId) {
      return { ok: false, error: "stage_id is required when target is stage." };
    }
    const stage = catalog.stages.find((item) => item.id === stageId);
    if (!stage) {
      return { ok: false, error: `Stage ${stageId} not found.` };
    }
    return navigate(stage.href);
  }

  if (target === "lesson") {
    if (!lessonQuery) {
      return { ok: false, error: "lesson is required when target is lesson." };
    }
    const lesson = findLesson(catalog, lessonQuery);
    if (!lesson) {
      return { ok: false, error: `Lesson ${lessonQuery} not found.` };
    }
    return navigate(lesson.href);
  }

  return { ok: false, error: "target must be home, stage, or lesson." };
}

function playAudio(text?: string) {
  if (!text) {
    return { ok: false, error: "text is required." };
  }

  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button[title]"),
  );
  const match = buttons.find(
    (button) => button.title.normalize("NFC") === text.normalize("NFC"),
  );

  if (!match) {
    return {
      ok: false,
      error: `No audio button on this page for "${text}". Open the lesson first.`,
    };
  }

  match.click();
  return { ok: true, text: match.title };
}

function openChatgptPractice() {
  const trigger = document.querySelector<HTMLButtonElement>(
    "[data-webmcp='chatgpt-practice']",
  );

  if (!trigger) {
    return {
      ok: false,
      error:
        "This page has no ChatGPT practice. Open a standard lesson other than lesson 0 first.",
    };
  }

  trigger.click();
  return { ok: true, opened: "practice-modal" };
}

function navigate(href: string) {
  window.location.assign(href);
  return { ok: true, href };
}
