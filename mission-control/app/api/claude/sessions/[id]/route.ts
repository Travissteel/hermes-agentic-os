import { getSessionDetail } from "@/lib/claude-sessions";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/claude/sessions/[id]">
) {
  const { id } = await ctx.params;
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "500");
  const detail = await getSessionDetail(id, {
    limit: Number.isFinite(limit) ? limit : 500,
  });
  if (!detail) {
    return Response.json({ error: "session not found" }, { status: 404 });
  }
  return Response.json(detail);
}
