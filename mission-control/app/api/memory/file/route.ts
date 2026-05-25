import { readMemoryFile } from "@/lib/memory-search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filePath = url.searchParams.get("path");
  if (!filePath) {
    return Response.json({ error: "path is required" }, { status: 400 });
  }
  const file = await readMemoryFile(filePath);
  if (!file) {
    return Response.json(
      { error: "not found or outside memory roots" },
      { status: 404 }
    );
  }
  return Response.json(file);
}
