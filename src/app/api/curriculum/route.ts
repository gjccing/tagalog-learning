import { getCurriculum } from "@/lib/content";

export const dynamic = "force-static";

export async function GET() {
  const curriculum = await getCurriculum();
  return Response.json({
    course: curriculum.course,
    stages: curriculum.stages,
  });
}
