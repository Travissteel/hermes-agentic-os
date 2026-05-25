import { listSessions } from "@/lib/claude-sessions";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessions = await listSessions();
  return Response.json({ sessions });
}
