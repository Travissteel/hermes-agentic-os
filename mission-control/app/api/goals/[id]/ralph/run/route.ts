import { listGoals } from "@/lib/goals";
import { startRalphRun } from "@/lib/ralph-runner";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/goals/[id]/ralph/run">
) {
  const { id } = await ctx.params;
  let body: { maxIterations?: number } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }

  const goals = await listGoals();
  const goal = goals.find((g) => g.id === id);
  if (!goal) return Response.json({ error: "goal not found" }, { status: 404 });
  if (!goal.prdPath) {
    return Response.json(
      { error: "goal has no prdPath set" },
      { status: 400 }
    );
  }

  const result = await startRalphRun({
    goalId: goal.id,
    prdPath: goal.prdPath,
    model: goal.model,
    goalTitle: goal.title,
    maxIterations: body.maxIterations,
  });

  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: result.status ?? 500 }
    );
  }
  return Response.json(result, { status: 200 });
}
