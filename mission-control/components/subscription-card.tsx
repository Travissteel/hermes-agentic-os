"use client";

import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";
import type { Subscription } from "@/app/api/subscriptions/route";
import type { FamilyUsageRow } from "@/lib/model-usage";

const VENDOR_ACCENT: Record<string, { border: string; text: string }> = {
  Anthropic: { border: "border-violet-500/40", text: "text-violet-300" },
  OpenAI: { border: "border-emerald-500/40", text: "text-emerald-300" },
  Google: { border: "border-sky-500/40", text: "text-sky-300" },
};

const STATUS_TONE: Record<Subscription["status"], string> = {
  active: "border-emerald-500/40 text-emerald-300",
  paused: "border-amber-500/40 text-amber-300",
  cancelled: "border-zinc-700 text-muted-foreground",
};

const BILLING_LABEL: Record<Subscription["billing"], string> = {
  monthly: "/mo",
  annual: "/yr",
  included: "incl.",
  usage: "usage",
};

function matchesPattern(model: string, patterns: string[]): boolean {
  return patterns.some((pat) => {
    if (!pat.includes("*")) return model === pat;
    const re = new RegExp("^" + pat.split("*").map(escapeReg).join(".*") + "$");
    return re.test(model);
  });
}
function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function useHermesUsage() {
  return useSWR<{ usage: FamilyUsageRow[] }>(
    "/api/hermes/model-usage",
    fetcher,
    { refreshInterval: 30_000 }
  );
}

function HermesActivity({ patterns }: { patterns: string[] | undefined }) {
  const { data, isLoading } = useHermesUsage();
  if (!patterns || patterns.length === 0) return null;

  const rows = data?.usage ?? [];
  // Sum across all family rows whose models match the sub's tracked_models patterns
  const today = rows.reduce((acc, r) => {
    if (matchesPattern(r.model, patterns)) return acc + r.sessions.today;
    return acc;
  }, 0);
  const week = rows.reduce((acc, r) => {
    if (matchesPattern(r.model, patterns)) return acc + r.sessions.last7d;
    return acc;
  }, 0);
  const lifetime = rows.reduce((acc, r) => {
    if (matchesPattern(r.model, patterns)) return acc + r.sessions.lifetime;
    return acc;
  }, 0);

  return (
    <div className="grid grid-cols-3 gap-2 text-center font-mono">
      <Stat label="today" value={isLoading ? "…" : today} />
      <Stat label="7d" value={isLoading ? "…" : week} />
      <Stat label="lifetime" value={isLoading ? "…" : lifetime} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/30 px-2 py-1.5">
      <div className="text-sm font-semibold text-foreground">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

export function SubscriptionCard({ sub }: { sub: Subscription }) {
  const accent =
    VENDOR_ACCENT[sub.vendor] ?? { border: "border-zinc-700", text: "text-zinc-300" };
  return (
    <Card className={cn("gap-3 border-border/60 bg-card/60 p-4 transition-colors hover:border-foreground/20 hover:bg-card")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-foreground">
            {sub.name}
          </h4>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {sub.vendor}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn("font-mono text-[10px] uppercase", STATUS_TONE[sub.status])}
        >
          {sub.status}
        </Badge>
      </div>

      <div className="flex items-baseline gap-1 font-mono">
        <span className={cn("text-2xl font-semibold", accent.text)}>
          ${sub.price_usd}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {BILLING_LABEL[sub.billing]}
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {sub.purpose}
      </p>

      {sub.tracked_models && (
        <>
          <Separator className="opacity-50" />
          <div>
            <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              Hermes sessions on this plan
            </div>
            <HermesActivity patterns={sub.tracked_models} />
          </div>
        </>
      )}

      {sub.features && sub.features.length > 0 && (
        <>
          <Separator className="opacity-50" />
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Includes
            </div>
            <ul className="space-y-0.5 text-[11px] text-muted-foreground/90">
              {sub.features.map((f, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className={accent.text}>·</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {sub.rate_limits && sub.rate_limits.length > 0 && (
        <>
          <Separator className="opacity-50" />
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Rate limits (reference)
            </div>
            <ul className="space-y-0.5 font-mono text-[10px] text-muted-foreground/90">
              {sub.rate_limits.map((rl, i) => (
                <li key={i} className="flex items-baseline justify-between gap-2">
                  <span className="truncate">{rl.label}</span>
                  <span className={cn("shrink-0 font-semibold", accent.text)}>
                    {rl.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {sub.docs_url && (
        <a
          href={sub.docs_url}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] text-muted-foreground hover:text-foreground hover:underline"
        >
          ↗ official docs
        </a>
      )}
    </Card>
  );
}
