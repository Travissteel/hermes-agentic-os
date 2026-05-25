import { getProviders } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = await getProviders();
  return Response.json({ providers });
}
