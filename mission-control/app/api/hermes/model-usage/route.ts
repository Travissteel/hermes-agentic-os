import { getModelUsage, getFamilyUsage } from "@/lib/model-usage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const groupBy = url.searchParams.get("groupBy") ?? "family";
  if (groupBy === "model") {
    const usage = await getModelUsage();
    return Response.json({ usage });
  }
  const usage = await getFamilyUsage();
  return Response.json({ usage });
}
