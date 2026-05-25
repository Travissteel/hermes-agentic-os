import { getHermesCrons } from "@/lib/hermes";

export const dynamic = "force-dynamic";

export async function GET() {
  const crons = await getHermesCrons();
  return Response.json({ crons });
}
