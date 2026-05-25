"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { StatusDot } from "@/components/status-dot";
import { cn } from "@/lib/utils";
import type { Agent } from "@/app/api/agents/route";

const AGENT_ACCENT: Record<Agent["id"], string> = {
  hermes: "text-emerald-300",
  claude: "text-violet-300",
  antigravity: "text-sky-300",
};

type Props = {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export function AgentRoster({ selectedId, onSelect }: Props) {
  const { data, error } = useSWR<{ agents: Agent[] }>("/api/agents", fetcher, {
    refreshInterval: 5_000,
  });

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Failed to load agents.
      </div>
    );
  }

  const agents = data?.agents ?? [];

  return (
    <nav className="flex h-full flex-col gap-1 p-3">
      <header className="px-2 pb-3">
        <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Agents
        </h2>
      </header>

      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "group flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
          selectedId === null
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        )}
      >
        <span className="grid h-6 w-6 place-items-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">
          ⟁
        </span>
        <span className="flex-1 truncate font-medium">Mission Control</span>
      </button>

      <div className="my-2 h-px bg-border/60" />

      {agents.map((agent) => {
        const active = selectedId === agent.id;
        return (
          <button
            key={agent.id}
            type="button"
            onClick={() => onSelect(agent.id)}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
              active
                ? "bg-secondary"
                : "hover:bg-secondary/60"
            )}
          >
            <StatusDot status={agent.status} />
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "truncate text-sm font-medium",
                  AGENT_ACCENT[agent.id]
                )}
              >
                {agent.name}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {agent.detail}
              </div>
            </div>
          </button>
        );
      })}

      {!data && (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          Loading agents…
        </div>
      )}

      <div className="mt-auto px-3 py-2 text-[10px] text-muted-foreground">
        Polling every 5s
      </div>
    </nav>
  );
}
