/**
 * Read & parse Claude Code session transcripts.
 *
 * Sessions live as .jsonl files at
 *   ~/.claude/projects/<project>/<session-id>.jsonl
 *
 * Each line is one event. Types include:
 *   - user / assistant       — actual conversation turns
 *   - last-prompt            — index marker
 *   - file-history-snapshot  — file state checkpoint
 *   - queue-operation        — internal scheduling
 *   - attachment             — file attached to a turn
 *   - ai-title               — auto-generated session title
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const HOME = os.homedir();
const PROJECT_DIR = path.join(
  HOME,
  ".claude/projects/-home-travissteel-antigravity"
);

export type ClaudeSessionSummary = {
  id: string;
  filePath: string;
  modifiedAt: string;
  sizeBytes: number;
  /** Cheap proxy: actual line count parsed lazily on detail fetch. */
  approxMessageCount: number;
  title: string | null;
  firstUserText: string | null;
  gitBranch: string | null;
  cwd: string | null;
};

export type ToolUseBlock = {
  name: string;
  inputSummary: string;
};

export type ClaudeMessage = {
  index: number;
  role: "user" | "assistant" | "system" | "other";
  timestamp: string | null;
  text: string;
  toolUses: ToolUseBlock[];
  toolResultSummary: string | null;
};

export type ClaudeSessionDetail = {
  id: string;
  filePath: string;
  modifiedAt: string;
  sizeBytes: number;
  title: string | null;
  gitBranch: string | null;
  cwd: string | null;
  totalMessages: number;
  messages: ClaudeMessage[];
};

type Block = {
  type: string;
  text?: string;
  name?: string;
  input?: unknown;
  content?: unknown;
  is_error?: boolean;
};

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const c of content as Block[]) {
    if (c.type === "text" && typeof c.text === "string") parts.push(c.text);
  }
  return parts.join("\n\n");
}

function extractToolUses(content: unknown): ToolUseBlock[] {
  if (!Array.isArray(content)) return [];
  const uses: ToolUseBlock[] = [];
  for (const c of content as Block[]) {
    if (c.type === "tool_use") {
      const input = c.input ?? {};
      const summary = summarizeToolInput(input);
      uses.push({ name: c.name ?? "?", inputSummary: summary });
    }
  }
  return uses;
}

function summarizeToolInput(input: unknown): string {
  if (input == null) return "";
  if (typeof input === "string") return input.slice(0, 200);
  if (typeof input !== "object") return String(input);
  const obj = input as Record<string, unknown>;
  // Prefer common fields that identify the operation
  for (const k of ["file_path", "path", "command", "url", "query", "pattern", "description"]) {
    if (typeof obj[k] === "string") {
      const v = obj[k] as string;
      return v.length > 200 ? v.slice(0, 200) + "…" : v;
    }
  }
  const json = JSON.stringify(obj);
  return json.length > 200 ? json.slice(0, 200) + "…" : json;
}

function extractToolResult(content: unknown): { summary: string; isError: boolean } | null {
  if (!Array.isArray(content)) return null;
  for (const c of content as Block[]) {
    if (c.type === "tool_result") {
      const text = typeof c.content === "string"
        ? c.content
        : Array.isArray(c.content)
          ? extractText(c.content)
          : "";
      return {
        summary: text.length > 600 ? text.slice(0, 600) + "…" : text,
        isError: Boolean(c.is_error),
      };
    }
  }
  return null;
}

export async function listSessions(): Promise<ClaudeSessionSummary[]> {
  let files: string[];
  try {
    files = await readdir(PROJECT_DIR);
  } catch {
    return [];
  }

  const summaries = await Promise.all(
    files
      .filter((f) => f.endsWith(".jsonl"))
      .map(async (f): Promise<ClaudeSessionSummary | null> => {
        const fullPath = path.join(PROJECT_DIR, f);
        try {
          const s = await stat(fullPath);
          // Read up to first ~64 KB to extract title + first user text + branch
          // without scanning multi-MB files.
          const id = f.replace(/\.jsonl$/, "");
          const head = await readFile(fullPath, { encoding: "utf8" }).then(
            (text) => text.slice(0, 65536)
          );
          let title: string | null = null;
          let firstUserText: string | null = null;
          let gitBranch: string | null = null;
          let cwd: string | null = null;
          let lineCount = 0;
          for (const line of head.split("\n")) {
            if (!line.trim()) continue;
            lineCount++;
            try {
              const d = JSON.parse(line) as Record<string, unknown>;
              if (d.type === "ai-title" && typeof d.title === "string") {
                title = d.title as string;
              }
              if (d.type === "user" && firstUserText === null) {
                const m = d.message as { content?: unknown; role?: string } | undefined;
                if (m?.role === "user") {
                  let t = extractText(m.content);
                  // Strip leading <ide_opened_file>…</ide_opened_file> noise so
                  // the first real human prompt becomes the displayed title.
                  t = t
                    .replace(/^<ide_opened_file>[\s\S]*?<\/ide_opened_file>\s*/i, "")
                    .replace(/^<system-reminder>[\s\S]*?<\/system-reminder>\s*/i, "")
                    .trim();
                  if (t) firstUserText = t.slice(0, 200);
                }
              }
              if (typeof d.gitBranch === "string" && !gitBranch) {
                gitBranch = d.gitBranch as string;
              }
              if (typeof d.cwd === "string" && !cwd) {
                cwd = d.cwd as string;
              }
            } catch {
              // ignore malformed lines
            }
          }
          // Estimate total messages by scaling: avg bytes per line we saw vs full file size
          const headBytes = head.length;
          const approx = lineCount > 0 && headBytes > 0
            ? Math.round((lineCount / headBytes) * s.size)
            : lineCount;
          return {
            id,
            filePath: fullPath,
            modifiedAt: s.mtime.toISOString(),
            sizeBytes: s.size,
            approxMessageCount: approx,
            title,
            firstUserText,
            gitBranch,
            cwd,
          };
        } catch (e) {
          console.error("session summary failed for", f, e);
          return null;
        }
      })
  );

  return summaries
    .filter((x): x is ClaudeSessionSummary => x !== null)
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

export async function getSessionDetail(
  id: string,
  opts: { limit?: number } = {}
): Promise<ClaudeSessionDetail | null> {
  // Basic safety: only allow UUID-like ids.
  if (!/^[a-f0-9-]{20,}$/i.test(id)) return null;
  const filePath = path.join(PROJECT_DIR, `${id}.jsonl`);
  let raw: string;
  let s: { mtime: Date; size: number };
  try {
    [raw, s] = await Promise.all([
      readFile(filePath, "utf8"),
      stat(filePath),
    ]);
  } catch {
    return null;
  }

  const messages: ClaudeMessage[] = [];
  let title: string | null = null;
  let gitBranch: string | null = null;
  let cwd: string | null = null;
  let index = 0;

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const d = JSON.parse(line) as Record<string, unknown>;
      if (d.type === "ai-title" && typeof d.title === "string") {
        title = d.title as string;
        continue;
      }
      if (typeof d.gitBranch === "string" && !gitBranch) gitBranch = d.gitBranch as string;
      if (typeof d.cwd === "string" && !cwd) cwd = d.cwd as string;

      if (d.type !== "user" && d.type !== "assistant") continue;
      const m = d.message as { content?: unknown; role?: string } | undefined;
      if (!m) continue;
      const role =
        m.role === "user" || m.role === "assistant" || m.role === "system"
          ? m.role
          : (d.type as "user" | "assistant");
      const text = extractText(m.content);
      const toolUses = extractToolUses(m.content);
      const toolResult = extractToolResult(m.content);

      // Skip empty/internal messages
      if (!text && toolUses.length === 0 && !toolResult) continue;

      messages.push({
        index: index++,
        role,
        timestamp: typeof d.timestamp === "string" ? (d.timestamp as string) : null,
        text,
        toolUses,
        toolResultSummary: toolResult ? toolResult.summary : null,
      });
    } catch {
      // ignore
    }
  }

  const limit = opts.limit ?? 500;
  const sliced = messages.length > limit ? messages.slice(-limit) : messages;

  return {
    id,
    filePath,
    modifiedAt: s.mtime.toISOString(),
    sizeBytes: s.size,
    title,
    gitBranch,
    cwd,
    totalMessages: messages.length,
    messages: sliced,
  };
}
