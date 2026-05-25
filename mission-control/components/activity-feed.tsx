"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActivityEntry } from "@/lib/activity";

const AGENT_COLOR: Record<string, string> = {
  claude: "border-violet-500/40 text-violet-300",
  hermes: "border-emerald-500/40 text-emerald-300",
};

const TOOL_COLOR: Record<string, string> = {
  Write: "text-emerald-400",
  Edit: "text-amber-300",
  NotebookEdit: "text-cyan-300",
};

function timeAgo(ts: string): string {
  const t = new Date(ts.replace(" ", "T")).getTime();
  if (!Number.isFinite(t)) return ts;
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

export function ActivityFeed() {
  const { data, error } = useSWR<{ activity: ActivityEntry[] }>(
    "/api/activity?limit=40",
    fetcher,
    { refreshInterval: 2_000 }
  );

  if (error) {
    return <p className="text-sm text-destructive">Failed to load activity.</p>;
  }

  const entries = data?.activity ?? [];

  return (
    <ScrollArea className="h-[calc(100vh-22rem)] pr-3">
      <ol className="space-y-2 text-sm">
        {entries.length === 0 && (
          <li className="rounded-md border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
            No activity yet. Edit a file via Claude Code to see it appear here.
          </li>
        )}
        {entries.map((e, i) => (
          <li
            key={`${e.timestamp}-${i}`}
            className="group flex items-start gap-3 rounded-md border border-transparent px-3 py-2 hover:border-border/60 hover:bg-secondary/40"
          >
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 font-mono text-[10px] uppercase",
                AGENT_COLOR[e.agent] ?? "text-muted-foreground"
              )}
            >
              {e.agent}:{e.sessionId.slice(0, 6)}
            </Badge>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 truncate">
                <span
                  className={cn(
                    "font-semibold",
                    TOOL_COLOR[e.tool] ?? "text-foreground"
                  )}
                >
                  {e.tool}
                </span>
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {e.target}
                </span>
              </div>
            </div>
            <time
              className="shrink-0 font-mono text-[10px] text-muted-foreground"
              title={e.timestamp}
            >
              {timeAgo(e.timestamp)}
            </time>
          </li>
        ))}
      </ol>
    </ScrollArea>
  );
}
