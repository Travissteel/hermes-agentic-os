import { getOpenRouterUsage } from "@/lib/openrouter";

export const dynamic = "force-dynamic";

export async function GET() {
  const usage = await getOpenRouterUsage();
  if (!usage) {
    return Response.json(
      { error: "OpenRouter not configured or API unreachable" },
      { status: 503 }
    );
  }
  return Response.json({ usage });
}
