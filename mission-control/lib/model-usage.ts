import { readFile, readdir } from "node:fs/promises";
import { PATHS } from "./paths";

export type ModelWindow = {
  today: number;
  last7d: number;
  last30d: number;
  lifetime: number;
};

export type ModelUsageRow = {
  /** Raw model id as it appears in Hermes session files (e.g. "gpt-5.2"). */
  model: string;
  /** Provider family inferred from the model name (e.g. "openai-codex"). */
  family: string;
  sessions: ModelWindow;
  totalMessages: ModelWindow;
};

function familyOf(model: string): string {
  if (!model) return "unknown";
  const m = model.toLowerCase();
  if (m.startsWith("gpt-") || m.startsWith("o1") || m.startsWith("o3"))
    return "openai-codex";
  if (m.startsWith("claude-")) return "anthropic";
  if (m.startsWith("gemini-")) return "gemini";
  if (m.startsWith("kimi") || m.includes("moonshot")) return "moonshot";
  if (m.startsWith("qwen")) return "qwen";
  if (m.startsWith("deepseek")) return "deepseek";
  return "other";
}

const DAY_MS = 24 * 60 * 60 * 1000;

function windowFor(startMs: number, nowMs: number): keyof ModelWindow | null {
  const age = nowMs - startMs;
  if (age < 0) return null;
  if (age < DAY_MS) return "today";
  if (age < 7 * DAY_MS) return "last7d";
  if (age < 30 * DAY_MS) return "last30d";
  return null;
}

function bumpAllRelevant(target: ModelWindow, startMs: number, nowMs: number, amount: number): void {
  const age = nowMs - startMs;
  if (age < 0) return;
  target.lifetime += amount;
  if (age < DAY_MS) target.today += amount;
  if (age < 7 * DAY_MS) target.last7d += amount;
  if (age < 30 * DAY_MS) target.last30d += amount;
}

export async function getModelUsage(): Promise<ModelUsageRow[]> {
  const now = Date.now();
  const byModel = new Map<string, ModelUsageRow>();

  let files: string[];
  try {
    files = await readdir(PATHS.hermes.sessions);
  } catch {
    return [];
  }

  await Promise.all(
    files
      .filter((f) => f.startsWith("session_") && f.endsWith(".json"))
      .map(async (f) => {
        try {
          const raw = await readFile(`${PATHS.hermes.sessions}/${f}`, "utf8");
          const d = JSON.parse(raw) as {
            model?: string;
            session_start?: string;
            message_count?: number;
            messages?: unknown[];
          };
          const model = d.model || "unknown";
          const start = d.session_start
            ? new Date(d.session_start).getTime()
            : NaN;
          if (!Number.isFinite(start)) return;
          const msgs =
            typeof d.message_count === "number"
              ? d.message_count
              : Array.isArray(d.messages)
                ? d.messages.length
                : 0;

          let row = byModel.get(model);
          if (!row) {
            row = {
              model,
              family: familyOf(model),
              sessions: { today: 0, last7d: 0, last30d: 0, lifetime: 0 },
              totalMessages: { today: 0, last7d: 0, last30d: 0, lifetime: 0 },
            };
            byModel.set(model, row);
          }
          bumpAllRelevant(row.sessions, start, now, 1);
          bumpAllRelevant(row.totalMessages, start, now, msgs);
        } catch {
          // ignore malformed sessions
        }
      })
  );

  return Array.from(byModel.values()).sort(
    (a, b) => b.sessions.lifetime - a.sessions.lifetime
  );
}

export type FamilyUsageRow = ModelUsageRow & {
  /** Tracked models that summed into this family. */
  models: string[];
};

export async function getFamilyUsage(): Promise<FamilyUsageRow[]> {
  const rows = await getModelUsage();
  const byFamily = new Map<string, FamilyUsageRow>();
  for (const r of rows) {
    let existing = byFamily.get(r.family);
    if (!existing) {
      existing = {
        ...r,
        model: r.family,
        sessions: { ...r.sessions },
        totalMessages: { ...r.totalMessages },
        models: [r.model],
      };
      byFamily.set(r.family, existing);
    } else {
      for (const k of ["today", "last7d", "last30d", "lifetime"] as const) {
        existing.sessions[k] += r.sessions[k];
        existing.totalMessages[k] += r.totalMessages[k];
      }
      if (!existing.models.includes(r.model)) existing.models.push(r.model);
    }
  }
  return Array.from(byFamily.values()).sort(
    (a, b) => b.sessions.lifetime - a.sessions.lifetime
  );
}
