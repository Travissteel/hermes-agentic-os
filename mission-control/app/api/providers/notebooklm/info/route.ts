import { getNotebookLMInfo } from "@/lib/notebooklm";

export const dynamic = "force-dynamic";

export async function GET() {
  const info = await getNotebookLMInfo();
  return Response.json(info);
}
