import { listGoals } from "@/lib/goals";
import { stopRalphRun } from "@/lib/ralph-runner";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/goals/[id]/ralph/stop">
) {
  const { id } = await ctx.params;
  const goals = await listGoals();
  const goal = goals.find((g) => g.id === id);
  if (!goal) return Response.json({ error: "goal not found" }, { status: 404 });
  if (!goal.prdPath) {
    return Response.json(
      { error: "goal has no prdPath set" },
      { status: 400 }
    );
  }
  const result = await stopRalphRun(goal.prdPath);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 409 });
  }
  return Response.json({ ok: true });
}
