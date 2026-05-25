import { updateGoal, deleteGoal } from "@/lib/goals";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/goals/[id]">
) {
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const updated = await updateGoal(id, body);
  if (!updated) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json(updated);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/goals/[id]">
) {
  const { id } = await ctx.params;
  const ok = await deleteGoal(id);
  if (!ok) return Response.json({ error: "not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
