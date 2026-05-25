import { getAllModels } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function GET() {
  const groups = await getAllModels();
  return Response.json({ groups });
}
