"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type {
  ClaudeSessionSummary,
  ClaudeSessionDetail,
} from "@/lib/claude-sessions";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const diff = Date.now() - t;
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function shortTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function ClaudeCodeControlRoom() {
  const sessions = useSWR<{ sessions: ClaudeSessionSummary[] }>(
    "/api/claude/sessions",
    fetcher,
    { refreshInterval: 30_000 }
  );

  const allSessions = sessions.data?.sessions ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const effectiveId = selectedId ?? allSessions[0]?.id ?? null;

  const detail = useSWR<ClaudeSessionDetail>(
    effectiveId
      ? `/api/claude/sessions/${effectiveId}?limit=400`
      : null,
    fetcher,
    { refreshInterval: effectiveId === allSessions[0]?.id ? 5_000 : 0 }
  );

  return (
    <div className="grid h-full grid-cols-[18rem_1fr] gap-3 p-3 overflow-hidden">
      {/* Session list */}
      <aside className="flex min-h-0 flex-col gap-2">
        <header>
          <h2 className="text-sm font-semibold text-violet-300">
            Claude Code Sessions
          </h2>
          <p className="text-[10px] text-muted-foreground">
            ~/.claude/projects/-home-travissteel-antigravity/ ·{" "}
            {allSessions.length} sessions
          </p>
        </header>
        <ScrollArea className="flex-1 min-h-0">
          <ul className="space-y-1.5 pr-2">
            {allSessions.map((s, i) => {
              const isActive = effectiveId === s.id;
              const isCurrent = i === 0;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className={cn(
                      "w-full rounded-md border px-2.5 py-2 text-left transition-colors",
                      isActive
                        ? "border-violet-500/40 bg-violet-500/5"
                        : "border-border/60 hover:border-foreground/20 hover:bg-secondary/30"
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-1">
                      <code className="truncate font-mono text-[11px] text-foreground">
                        {s.id.slice(0, 8)}
                      </code>
                      <div className="flex shrink-0 items-center gap-1">
                        {isCurrent && (
                          <Badge
                            variant="outline"
                            className="h-4 border-emerald-500/40 px-1 font-mono text-[9px] text-emerald-300"
                          >
                            live
                          </Badge>
                        )}
                        <span className="font-mono text-[9px] text-muted-foreground">
                          {fmtSize(s.sizeBytes)}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] text-foreground/85">
                      {s.firstUserText ?? "(no user prompt found)"}
                    </p>
                    <div className="mt-1 flex items-baseline justify-between text-[10px] text-muted-foreground">
                      <span>{relativeTime(s.modifiedAt)}</span>
                      <span className="font-mono">
                        ~{s.approxMessageCount} msg
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
            {sessions.isLoading && (
              <li className="text-[11px] text-muted-foreground">Loading…</li>
            )}
          </ul>
        </ScrollArea>
      </aside>

      {/* Transcript */}
      <main className="flex min-h-0 flex-col gap-2">
        <header className="shrink-0 flex items-baseline justify-between border-b border-border/60 pb-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {detail.data?.title ??
                detail.data?.id?.slice(0, 8) ??
                "Select a session"}
            </h3>
            {detail.data && (
              <p className="text-[10px] text-muted-foreground font-mono">
                {detail.data.id} ·{" "}
                {detail.data.gitBranch && (
                  <>git:{detail.data.gitBranch} · </>
                )}
                {detail.data.totalMessages} messages total ·{" "}
                showing {detail.data.messages.length}
              </p>
            )}
          </div>
        </header>
        <ScrollArea className="flex-1 min-h-0">
          {detail.isLoading && (
            <p className="p-4 text-xs text-muted-foreground">
              Loading transcript…
            </p>
          )}
          {detail.error && (
            <p className="p-4 text-xs text-rose-300">
              Failed to load transcript.
            </p>
          )}
          {detail.data && (
            <ol className="space-y-2 pr-3">
              {detail.data.messages.map((m) => (
                <MessageBlock key={m.index} m={m} />
              ))}
              {detail.data.messages.length === 0 && (
                <li className="p-4 text-xs text-muted-foreground">
                  (no visible messages)
                </li>
              )}
            </ol>
          )}
        </ScrollArea>
      </main>
    </div>
  );
}

function MessageBlock({
  m,
}: {
  m: ClaudeSessionDetail["messages"][number];
}) {
  const isUser = m.role === "user";
  const isAssistant = m.role === "assistant";
  return (
    <li
      className={cn(
        "rounded-md border px-3 py-2 text-[12px]",
        isUser
          ? "border-emerald-500/20 bg-emerald-500/5"
          : isAssistant
            ? "border-violet-500/20 bg-violet-500/5"
            : "border-border/40 bg-card/30"
      )}
    >
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span
          className={cn(
            "font-mono text-[10px] uppercase tracking-wider",
            isUser
              ? "text-emerald-300"
              : isAssistant
                ? "text-violet-300"
                : "text-muted-foreground"
          )}
        >
          {m.role}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          #{m.index} · {shortTime(m.timestamp)}
        </span>
      </div>
      {m.text && (
        <pre className="whitespace-pre-wrap break-words font-sans leading-relaxed text-foreground/90">
          {m.text}
        </pre>
      )}
      {m.toolUses.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {m.toolUses.map((t, i) => (
            <div key={i} className="font-mono text-[11px] text-amber-300/80">
              <span className="text-amber-400">⚙</span> {t.name}
              {t.inputSummary && (
                <span className="ml-1 text-muted-foreground">
                  {" — "}{t.inputSummary}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {m.toolResultSummary && (
        <details className="mt-1.5">
          <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
            tool_result ({m.toolResultSummary.length} chars)
          </summary>
          <pre className="mt-1 whitespace-pre-wrap break-words rounded bg-background/50 p-1.5 font-mono text-[10px] text-muted-foreground">
            {m.toolResultSummary}
          </pre>
        </details>
      )}
    </li>
  );
}
