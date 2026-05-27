import { readPrd } from "@/lib/ralph";
import { listGoals } from "@/lib/goals";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/goals/[id]/prd">
) {
  const { id } = await ctx.params;
  const goals = await listGoals();
  const goal = goals.find((g) => g.id === id);
  if (!goal) {
    return Response.json({ error: "goal not found" }, { status: 404 });
  }
  if (!goal.prdPath) {
    return Response.json(
      { error: "goal has no prdPath set", goalId: id },
      { status: 404 }
    );
  }
  const prd = await readPrd(goal.prdPath);
  if (!prd) {
    return Response.json(
      { error: "PRD file missing or invalid", prdPath: goal.prdPath },
      { status: 404 }
    );
  }
  return Response.json({ goalId: id, model: goal.model, prd });
}
