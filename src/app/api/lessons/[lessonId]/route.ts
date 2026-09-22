import { flattenCurriculumLessons, getCurriculum, getLesson } from "@/lib/content";

export const dynamic = "force-static";

export async function generateStaticParams() {
  const curriculum = await getCurriculum();
  return flattenCurriculumLessons(curriculum).map((entry) => ({
    lessonId: entry.ref.id,
  }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await params;
  const lesson = await getLesson(lessonId);

  if (!lesson) {
    return Response.json({ error: "Lesson not found" }, { status: 404 });
  }

  return Response.json(lesson);
}
