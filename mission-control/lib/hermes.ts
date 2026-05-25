import { readFile, readdir, stat } from "node:fs/promises";
import { PATHS } from "./paths";

export type HermesCron = {
  id: string;
  name: string;
  schedule: string;
  script: string | null;
  mode: "agent" | "no-agent";
  enabled: boolean;
  lastRunAt: string | null;
  lastStatus: string | null;
  nextRunAt: string | null;
  deliver: string | null;
};

export type HermesSession = {
  name: string;
  path: string;
  mtime: string;
  sizeKb: number;
};

function scheduleToString(sched: unknown): string {
  if (typeof sched === "string") return sched;
  if (sched && typeof sched === "object") {
    const s = sched as Record<string, unknown>;
    return (
      (s.display as string) ??
      (s.expr as string) ??
      JSON.stringify(sched)
    );
  }
  return String(sched);
}

function deliverToString(deliver: unknown): string | null {
  if (typeof deliver === "string") return deliver;
  if (Array.isArray(deliver) && deliver.length > 0) return String(deliver[0]);
  return null;
}

export async function getHermesCrons(): Promise<HermesCron[]> {
  try {
    const raw = await readFile(PATHS.hermes.cronJobs, "utf8");
    const data = JSON.parse(raw);
    const jobs: unknown[] = Array.isArray(data)
      ? data
      : ((data as { jobs?: unknown[] }).jobs ?? []);
    return jobs.map((jRaw) => {
      const j = jRaw as Record<string, unknown>;
      return {
        id: (j.id as string) ?? "",
        name: (j.name as string) ?? "(unnamed)",
        schedule: scheduleToString(j.schedule),
        script: (j.script as string) ?? null,
        mode: j.no_agent ? "no-agent" : "agent",
        enabled: j.enabled !== false,
        lastRunAt: (j.last_run_at as string) ?? (j.last_run as string) ?? null,
        lastStatus:
          (j.last_status as string) ?? (j.last_result as string) ?? null,
        nextRunAt: (j.next_run_at as string) ?? null,
        deliver: deliverToString(j.deliver),
      };
    });
  } catch (e) {
    console.error("getHermesCrons failed:", e);
    return [];
  }
}

export async function getRecentHermesSessions(
  limit = 10
): Promise<HermesSession[]> {
  try {
    const files = await readdir(PATHS.hermes.sessions);
    const enriched = await Promise.all(
      files
        .filter((f) => f.endsWith(".json") && f !== "sessions.json")
        .map(async (f) => {
          const fullPath = `${PATHS.hermes.sessions}/${f}`;
          const s = await stat(fullPath);
          return {
            name: f,
            path: fullPath,
            mtime: s.mtime.toISOString(),
            sizeKb: Math.round(s.size / 102.4) / 10,
          };
        })
    );
    return enriched
      .sort((a, b) => b.mtime.localeCompare(a.mtime))
      .slice(0, limit);
  } catch (e) {
    console.error("getRecentHermesSessions failed:", e);
    return [];
  }
}
