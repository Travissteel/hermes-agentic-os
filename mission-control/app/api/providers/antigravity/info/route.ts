import { getAntigravityInfo } from "@/lib/antigravity";

export const dynamic = "force-dynamic";

export async function GET() {
  const info = await getAntigravityInfo();
  return Response.json(info);
}
