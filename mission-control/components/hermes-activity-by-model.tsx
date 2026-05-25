"use client";

import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type { FamilyUsageRow } from "@/lib/model-usage";

const FAMILY_LABEL: Record<string, { name: string; vendor: string; accent: string }> = {
  "openai-codex": {
    name: "OpenAI (Codex / ChatGPT)",
    vendor: "via ChatGPT Plus subscription OAuth",
    accent: "text-emerald-300",
  },
  anthropic: {
    name: "Anthropic (Claude)",
    vendor: "via Claude Pro OAuth",
    accent: "text-violet-300",
  },
  gemini: {
    name: "Google Gemini",
    vendor: "via GEMINI_API_KEY",
    accent: "text-sky-300",
  },
  moonshot: {
    name: "Moonshot / Kimi",
    vendor: "via OpenRouter",
    accent: "text-rose-300",
  },
  qwen: {
    name: "Qwen",
    vendor: "via Ollama or OpenRouter",
    accent: "text-amber-300",
  },
  deepseek: {
    name: "DeepSeek",
    vendor: "via OpenRouter or direct",
    accent: "text-cyan-300",
  },
  other: {
    name: "Other",
    vendor: "uncategorized",
    accent: "text-zinc-300",
  },
  unknown: {
    name: "Unknown",
    vendor: "(no model field in session)",
    accent: "text-zinc-500",
  },
};

function Bar({
  value,
  max,
  accent,
}: {
  value: number;
  max: number;
  accent: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all", accent)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

const BAR_BG: Record<string, string> = {
  "text-emerald-300": "bg-emerald-400",
  "text-violet-300": "bg-violet-400",
  "text-sky-300": "bg-sky-400",
  "text-rose-300": "bg-rose-400",
  "text-amber-300": "bg-amber-400",
  "text-cyan-300": "bg-cyan-400",
  "text-zinc-300": "bg-zinc-400",
  "text-zinc-500": "bg-zinc-600",
};

export function HermesActivityByModel() {
  const { data, isLoading, error } = useSWR<{ usage: FamilyUsageRow[] }>(
    "/api/hermes/model-usage",
    fetcher,
    { refreshInterval: 30_000 }
  );

  if (isLoading) {
    return (
      <Card className="border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
        Parsing Hermes session files…
      </Card>
    );
  }
  if (error || !data) {
    return (
      <Card className="border-dashed border-rose-500/40 p-6 text-center text-xs text-rose-300">
        Failed to read session usage.
      </Card>
    );
  }

  const rows = data.usage;
  if (rows.length === 0) {
    return (
      <Card className="border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
        No Hermes sessions found.
      </Card>
    );
  }

  // Use lifetime as the visual max so families with most usage fill the bar.
  const maxLifetime = Math.max(...rows.map((r) => r.sessions.lifetime), 1);

  return (
    <Card className="border-border/60 bg-card/40 p-4">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
          Real Activity from Hermes Sessions
        </h3>
        <span className="font-mono text-[10px] text-muted-foreground">
          parsed from ~/.hermes/sessions/
        </span>
      </div>
      <ul className="space-y-3">
        {rows.map((row) => {
          const meta =
            FAMILY_LABEL[row.family] ?? FAMILY_LABEL.other;
          const barBg = BAR_BG[meta.accent] ?? "bg-zinc-400";
          return (
            <li key={row.family} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <div
                    className={cn(
                      "truncate text-sm font-semibold",
                      meta.accent
                    )}
                  >
                    {meta.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {meta.vendor}
                    {row.models.length > 0 && (
                      <>
                        {" · "}
                        <code className="font-mono">
                          {row.models.join(", ")}
                        </code>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-baseline gap-2 font-mono text-[10px]">
                  <span className="text-muted-foreground">today</span>
                  <Badge
                    variant="outline"
                    className={cn("h-5 px-1.5 font-mono", meta.accent)}
                  >
                    {row.sessions.today}
                  </Badge>
                  <span className="text-muted-foreground">7d</span>
                  <Badge variant="outline" className="h-5 px-1.5 font-mono">
                    {row.sessions.last7d}
                  </Badge>
                  <span className="text-muted-foreground">total</span>
                  <Badge variant="outline" className="h-5 px-1.5 font-mono">
                    {row.sessions.lifetime}
                  </Badge>
                </div>
              </div>
              <Bar
                value={row.sessions.lifetime}
                max={maxLifetime}
                accent={barBg}
              />
              <div className="flex items-baseline justify-between text-[10px] text-muted-foreground">
                <span>
                  {row.totalMessages.lifetime.toLocaleString()} messages total
                </span>
                <span>
                  {row.totalMessages.today.toLocaleString()} today
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
