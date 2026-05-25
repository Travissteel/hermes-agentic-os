"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HermesCron } from "@/lib/hermes";

function relativeNext(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = t - Date.now();
  if (diff <= 0) return "due";
  const m = Math.round(diff / 60_000);
  if (m < 60) return `in ${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `in ${h}h`;
  const d = Math.round(h / 24);
  return `in ${d}d`;
}

function relativeLast(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  const h = Math.round(diff / 3_600_000);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function CronGrid() {
  const { data, error } = useSWR<{ crons: HermesCron[] }>(
    "/api/hermes/crons",
    fetcher,
    { refreshInterval: 30_000 }
  );

  if (error) {
    return <p className="text-sm text-destructive">Failed to load crons.</p>;
  }

  const crons = data?.crons ?? [];
  const enabled = crons.filter((c) => c.enabled);

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {enabled.length === 0 && (
        <Card className="col-span-full border-dashed p-6 text-center text-sm text-muted-foreground">
          {data ? "No active crons." : "Loading crons…"}
        </Card>
      )}
      {enabled.map((c) => {
        const okay = c.lastStatus === "ok";
        return (
          <Card
            key={c.id}
            className="group gap-2 border-border/60 bg-card/60 p-3 transition-colors hover:border-emerald-500/40 hover:bg-card"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="truncate text-sm font-medium text-foreground">
                {c.name}
              </h4>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 font-mono text-[10px] uppercase",
                  okay
                    ? "border-emerald-500/40 text-emerald-300"
                    : "border-amber-500/40 text-amber-300"
                )}
              >
                {c.lastStatus ?? "—"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                {c.schedule}
              </code>
              <span className="opacity-50">·</span>
              <span>{c.mode}</span>
              {c.deliver && (
                <>
                  <span className="opacity-50">·</span>
                  <span>→ {c.deliver}</span>
                </>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>last {relativeLast(c.lastRunAt)}</span>
              <span className="font-mono text-emerald-300/70">
                next {relativeNext(c.nextRunAt)}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
