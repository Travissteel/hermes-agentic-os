import { runAgyPrint } from "@/lib/antigravity";

export const dynamic = "force-dynamic";
// Allow the route handler itself to wait up to 5 minutes for agy.
export const maxDuration = 300;

type Body = {
  prompt?: string;
  continue?: boolean;
  conversation?: string;
  skipPermissions?: boolean;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const prompt = (body.prompt ?? "").trim();
  if (!prompt) {
    return Response.json({ ok: false, error: "prompt is required" }, { status: 400 });
  }
  if (prompt.length > 50_000) {
    return Response.json({ ok: false, error: "prompt too long (50k max)" }, { status: 400 });
  }

  const result = await runAgyPrint(prompt, {
    continue: body.continue,
    conversation: body.conversation,
    skipPermissions: body.skipPermissions,
    timeoutMs: 5 * 60_000,
  });

  return Response.json(result, { status: result.ok ? 200 : 502 });
}
