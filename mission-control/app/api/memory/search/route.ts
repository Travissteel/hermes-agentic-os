import { searchMemory, countCorpus } from "@/lib/memory-search";
import type { MemorySource } from "@/lib/memory-search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const sourcesParam = url.searchParams.get("sources");
  const sources = sourcesParam
    ? (sourcesParam.split(",").filter((s) =>
        ["brain", "hermes", "claude"].includes(s)
      ) as MemorySource[])
    : undefined;

  // Empty query: still return corpus counts so the UI can render badges
  if (!q.trim()) {
    const counts = await countCorpus();
    return Response.json({
      query: "",
      totalHits: 0,
      hits: [],
      perSource: counts,
      durationMs: 0,
      corpusCounts: counts,
    });
  }

  const result = await searchMemory(q, { sources });
  const corpusCounts = await countCorpus();
  return Response.json({ ...result, corpusCounts });
}
