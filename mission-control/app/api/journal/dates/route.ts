import { listDates } from "@/lib/journal";

export const dynamic = "force-dynamic";

export async function GET() {
  const dates = await listDates();
  return Response.json({ dates });
}
