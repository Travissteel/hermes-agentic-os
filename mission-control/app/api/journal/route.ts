import { readDay, appendEntry } from "@/lib/journal";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? undefined;
  try {
    const day = await readDay(date);
    return Response.json(day);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  let body: { text?: string; body?: string; source?: string; date?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const text = (body.text ?? body.body ?? "").trim();
  if (!text) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }
  try {
    const entry = await appendEntry({
      body: text,
      source: body.source === "voice" ? "voice" : "text",
      date: body.date,
    });
    return Response.json(entry, { status: 201 });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 }
    );
  }
}
