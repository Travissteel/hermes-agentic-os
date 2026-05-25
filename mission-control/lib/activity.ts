import { readFile } from "node:fs/promises";
import { PATHS } from "./paths";

export type ActivityEntry = {
  timestamp: string;
  agent: string;
  sessionId: string;
  tool: string;
  target: string;
};

const LINE_RE = /^- `([^`]+)` \[([^:]+):([^\]]+)\] \*\*([^*]+)\*\* → `([^`]+)`/;

export async function getActivity(limit = 50): Promise<ActivityEntry[]> {
  try {
    const raw = await readFile(PATHS.shared.activityLog, "utf8");
    const lines = raw.split("\n");
    const entries: ActivityEntry[] = [];
    for (const line of lines) {
      const m = LINE_RE.exec(line);
      if (m) {
        entries.push({
          timestamp: m[1],
          agent: m[2],
          sessionId: m[3],
          tool: m[4],
          target: m[5],
        });
      }
    }
    return entries.slice(-limit).reverse(); // newest first
  } catch (e) {
    console.error("getActivity failed:", e);
    return [];
  }
}
