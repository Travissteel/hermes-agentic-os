import { listGoals, createGoal } from "@/lib/goals";

export const dynamic = "force-dynamic";

export async function GET() {
  const goals = await listGoals();
  return Response.json({ goals });
}

export async function POST(request: Request) {
  let body: {
    title?: string;
    description?: string;
    targetDate?: string | null;
    tags?: string[];
    progress?: number;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }
  try {
    const goal = await createGoal({
      title: body.title,
      description: body.description,
      targetDate: body.targetDate,
      tags: body.tags,
      progress: body.progress,
    });
    return Response.json(goal, { status: 201 });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 }
    );
  }
}
