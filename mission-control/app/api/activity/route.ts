import { getActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const activity = await getActivity(Number.isFinite(limit) ? limit : 50);
  return Response.json({ activity });
}
