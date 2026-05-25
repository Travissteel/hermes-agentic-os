"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { StatusDot } from "@/components/status-dot";
import type { Agent } from "@/app/api/agents/route";

export function HeaderBar() {
  const { data } = useSWR<{ agents: Agent[] }>("/api/agents", fetcher, {
    refreshInterval: 5_000,
  });

  const allUp = (data?.agents ?? []).every((a) => a.status !== "offline");
  const aggregateStatus = !data
    ? "idle"
    : allUp
      ? "working"
      : "offline";

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-emerald-500/20 to-violet-500/20 text-xs font-bold">
          ⟁
        </span>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight">
            Antigravity
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Mission Control
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="hidden sm:inline font-mono">
          127.0.0.1:7777
        </span>
        <span className="hidden sm:inline opacity-50">·</span>
        <span className="flex items-center gap-1.5">
          <StatusDot status={aggregateStatus} size="sm" />
          {aggregateStatus === "working" ? "all systems live" : "checking…"}
        </span>
      </div>
    </header>
  );
}
