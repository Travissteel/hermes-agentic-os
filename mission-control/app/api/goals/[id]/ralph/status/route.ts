import { listGoals } from "@/lib/goals";
import { getRalphStatus } from "@/lib/ralph-runner";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/goals/[id]/ralph/status">
) {
  const { id } = await ctx.params;
  const goals = await listGoals();
  const goal = goals.find((g) => g.id === id);
  if (!goal) return Response.json({ error: "goal not found" }, { status: 404 });
  if (!goal.prdPath) {
    return Response.json(
      {
        state: "idle",
        logPath: "",
        logTail: "",
        lastExitCode: null,
        lastFinishedAt: null,
      },
      { status: 200 }
    );
  }
  const status = await getRalphStatus(goal.prdPath);
  return Response.json(status);
}
