"use client";

import useSWR from "swr";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type { ModelGroup } from "@/lib/models";

const SOURCE_LABEL: Record<ModelGroup["source"], string> = {
  "hermes-catalog": "Hermes catalog",
  "ollama-local": "local Ollama",
};

function fmtCtx(n: number | null): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function fmtPrice(n: number | null): string {
  if (n === null) return "—";
  if (n === 0) return "free";
  return `$${n.toFixed(2)}/M`;
}

export function ModelShelf() {
  const { data, error, isLoading } = useSWR<{ groups: ModelGroup[] }>(
    "/api/models",
    fetcher,
    { refreshInterval: 60_000 }
  );
  const [active, setActive] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card className="border-dashed p-6 text-center text-xs text-muted-foreground">
        Loading models…
      </Card>
    );
  }
  if (error || !data || data.groups.length === 0) {
    return (
      <Card className="border-dashed p-6 text-center text-xs text-rose-400">
        Failed to load model catalog.
      </Card>
    );
  }

  const groups = data.groups;
  const selectedKey = active ?? groups[0]?.provider ?? null;
  const selected = groups.find((g) => g.provider === selectedKey) ?? groups[0];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {groups.map((g) => {
          const isActive = g.provider === selectedKey;
          return (
            <Button
              key={g.provider}
              size="sm"
              variant={isActive ? "secondary" : "ghost"}
              onClick={() => setActive(g.provider)}
              className={cn(
                "h-7 gap-2 px-3 text-[11px] uppercase tracking-wider",
                isActive && "border border-emerald-500/40"
              )}
            >
              <span>{g.provider}</span>
              <Badge
                variant="outline"
                className="h-4 border-border/60 px-1 font-mono text-[9px]"
              >
                {g.count}
              </Badge>
              <span className="text-[9px] text-muted-foreground">
                · {SOURCE_LABEL[g.source]}
              </span>
            </Button>
          );
        })}
      </div>

      <ScrollArea className="h-72 rounded-md border border-border/60 bg-card/30">
        <ul className="divide-y divide-border/40">
          {selected.models.map((m) => (
            <li
              key={m.id}
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3 py-2 text-[12px] hover:bg-secondary/40"
            >
              <code className="truncate font-mono text-foreground">
                {m.id}
              </code>
              <span className="font-mono text-[10px] text-muted-foreground">
                ctx {fmtCtx(m.context)}
              </span>
              <span className="font-mono text-[10px] text-emerald-300/80">
                in {fmtPrice(m.pricing?.promptUsdPerMillion ?? null)}
              </span>
              <span className="font-mono text-[10px] text-violet-300/80">
                out {fmtPrice(m.pricing?.completionUsdPerMillion ?? null)}
              </span>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
