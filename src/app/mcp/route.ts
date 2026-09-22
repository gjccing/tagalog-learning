import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  flattenCurriculumLessons,
  getCurriculum,
  getLesson,
  lessonNumberFromId,
} from "@/lib/content";

function jsonResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
  };
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_curriculum",
      {
        title: "Get curriculum",
        description:
          "Return the full Practical Tagalog curriculum: course metadata and stages with lesson summaries.",
        inputSchema: z.object({}),
      },
      async () => {
        const curriculum = await getCurriculum();
        return jsonResult({
          course: curriculum.course,
          stages: curriculum.stages,
        });
      },
    );

    server.registerTool(
      "list_lessons",
      {
        title: "List lessons",
        description:
          "List every lesson in the curriculum with id, number, title, goal, and stage.",
        inputSchema: z.object({}),
      },
      async () => {
        const curriculum = await getCurriculum();
        return jsonResult({
          lessons: flattenCurriculumLessons(curriculum).map((entry) => ({
            id: entry.ref.id,
            number: lessonNumberFromId(entry.ref.id),
            title: entry.ref.title,
            goal: entry.ref.goal,
            stageId: String(entry.stage.id),
            stageTitle: entry.stage.title,
          })),
        });
      },
    );

    server.registerTool(
      "get_lesson",
      {
        title: "Get lesson",
        description:
          "Return the full lesson JSON for a lesson id such as lesson-1.",
        inputSchema: z.object({
          id: z.string().min(1).describe("Lesson id, such as lesson-1."),
        }),
      },
      async ({ id }) => {
        const lesson = await getLesson(id);
        if (!lesson) {
          return {
            isError: true,
            content: [{ type: "text", text: `Lesson not found: ${id}` }],
          };
        }
        return jsonResult(lesson);
      },
    );
  },
  {
    serverInfo: {
      name: "tagalog-learning",
      version: "0.1.0",
    },
  },
);

export { handler as GET, handler as POST };
