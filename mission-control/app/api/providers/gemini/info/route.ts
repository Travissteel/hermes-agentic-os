import { getGeminiInfo } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function GET() {
  const info = await getGeminiInfo();
  return Response.json(info);
}
