import { getConversations } from "@/lib/antigravity";

export const dynamic = "force-dynamic";

export async function GET() {
  const conversations = await getConversations();
  return Response.json({ conversations });
}
