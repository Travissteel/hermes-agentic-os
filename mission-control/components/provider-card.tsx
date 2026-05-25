"use client";

import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UsageBar } from "@/components/usage-bar";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type { Provider } from "@/lib/providers";
import type { OpenRouterUsage } from "@/lib/openrouter";
import type { GeminiInfo } from "@/lib/gemini";
import type { NotebookLMInfo } from "@/lib/notebooklm";
import type { AntigravityInfo } from "@/lib/antigravity";

const CATEGORY_ACCENT: Record<Provider["category"], string> = {
  "ai-model": "border-emerald-500/40 text-emerald-300",
  service: "border-cyan-500/40 text-cyan-300",
  platform: "border-violet-500/40 text-violet-300",
  config: "border-zinc-600 text-zinc-300",
};

function OpenRouterUsageBlock() {
  const { data, error, isLoading } = useSWR<{ usage: OpenRouterUsage }>(
    "/api/providers/openrouter/usage",
    fetcher,
    { refreshInterval: 30_000 }
  );
  if (isLoading) {
    return <p className="text-[11px] text-muted-foreground">Fetching usage…</p>;
  }
  if (error || !data) {
    return <p className="text-[11px] text-rose-400">Usage unavailable.</p>;
  }
  const u = data.usage;
  return (
    <div className="space-y-2 pt-1">
      <UsageBar
        label={u.limitReset ? `Today (${u.limitReset} cap)` : "Daily"}
        value={u.usageDaily}
        max={u.limit}
      />
      <UsageBar label="This week" value={u.usageWeekly} max={null} />
      <UsageBar label="This month" value={u.usageMonthly} max={null} />
      <UsageBar label="Lifetime" value={u.usageLifetime} max={null} />
    </div>
  );
}

function GeminiInfoBlock() {
  const { data, isLoading } = useSWR<GeminiInfo>(
    "/api/providers/gemini/info",
    fetcher,
    { refreshInterval: 5 * 60_000 }
  );
  if (isLoading) return <p className="text-[11px] text-muted-foreground">Checking…</p>;
  if (!data) return null;
  if (!data.available) {
    return (
      <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-2 text-[11px] text-rose-300">
        {data.error ?? "Unavailable"}
      </div>
    );
  }
  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">Models accessible</span>
        <span className="font-mono text-emerald-300">{data.modelCount}</span>
      </div>
      <div>
        <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Free-tier limits (reference)
        </div>
        <ul className="space-y-0.5 font-mono text-[10px] text-muted-foreground/90">
          {data.freeTierLimits.slice(0, 4).map((rl) => (
            <li key={rl.model} className="flex justify-between gap-2">
              <span className="truncate">{rl.model}</span>
              <span className="shrink-0 text-emerald-300/80">
                {rl.rpm}/min · {rl.rpd}/day
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Live usage tracking not available — Google AI Studio quotas are not
        exposed via the API.
      </p>
    </div>
  );
}

function NotebookLMInfoBlock() {
  const { data, isLoading } = useSWR<NotebookLMInfo>(
    "/api/providers/notebooklm/info",
    fetcher,
    { refreshInterval: 60_000 }
  );
  if (isLoading) return <p className="text-[11px] text-muted-foreground">Checking…</p>;
  if (!data) return null;

  const STATUS_LABEL: Record<NotebookLMInfo["authStatus"], { label: string; tone: string }> = {
    valid: { label: "auth valid", tone: "border-emerald-500/40 text-emerald-300" },
    expired: { label: "auth expired", tone: "border-amber-500/40 text-amber-300" },
    missing: { label: "not authenticated", tone: "border-rose-500/40 text-rose-300" },
    unknown: { label: "unknown", tone: "border-zinc-700 text-zinc-300" },
  };

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className={cn("font-mono text-[10px] uppercase", STATUS_LABEL[data.authStatus].tone)}>
          {STATUS_LABEL[data.authStatus].label}
        </Badge>
        {data.storageStateAgeDays !== null && (
          <span className="font-mono text-[10px] text-muted-foreground">
            session {data.storageStateAgeDays}d old
          </span>
        )}
      </div>

      {data.authStatus === "valid" && (
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Notebooks</span>
          <span className="font-mono text-emerald-300">{data.notebookCount ?? "?"}</span>
        </div>
      )}

      {data.authStatus !== "valid" && (
        <div className="rounded-md border border-border/60 bg-muted/30 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Re-authenticate
          </div>
          <code className="mt-1 block select-all font-mono text-[10px] text-foreground">
            {data.reauthCommand}
          </code>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Run in your terminal — opens a browser for Google OAuth.
          </p>
        </div>
      )}

      {data.recentNotebooks.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Recent notebooks
          </div>
          <ul className="space-y-1 text-[11px]">
            {data.recentNotebooks.map((n) => {
              const date = n.createdAt
                ? new Date(n.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                : null;
              return (
                <li key={n.id} className="group">
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-baseline justify-between gap-2 rounded px-1 py-0.5 hover:bg-secondary/40"
                    title={`Open ${n.title} in NotebookLM`}
                  >
                    <span className="truncate text-foreground/90 group-hover:text-sky-300">
                      {n.title}
                    </span>
                    {date && (
                      <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
                        {date}
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            ↗ click any notebook to open in NotebookLM
          </p>
        </div>
      )}
    </div>
  );
}

function AntigravityInfoBlock() {
  const { data, isLoading } = useSWR<AntigravityInfo>(
    "/api/providers/antigravity/info",
    fetcher,
    { refreshInterval: 60_000 }
  );
  if (isLoading) return <p className="text-[11px] text-muted-foreground">Checking…</p>;
  if (!data) return null;

  const STATUS_LABEL: Record<AntigravityInfo["authStatus"], { label: string; tone: string }> = {
    "signed-in": { label: "signed in", tone: "border-emerald-500/40 text-emerald-300" },
    missing: { label: "not signed in", tone: "border-rose-500/40 text-rose-300" },
    unknown: { label: "unknown", tone: "border-zinc-700 text-zinc-300" },
  };

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className={cn("font-mono text-[10px] uppercase", STATUS_LABEL[data.authStatus].tone)}>
          {STATUS_LABEL[data.authStatus].label}
        </Badge>
        {data.version && (
          <span className="font-mono text-[10px] text-muted-foreground">
            agy v{data.version}
          </span>
        )}
      </div>

      {data.authStatus === "signed-in" && (
        <>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Default model</span>
            <span className="font-mono text-sky-300">{data.defaultModel}</span>
          </div>
          {data.tokenAgeMinutes !== null && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Token refreshed</span>
              <span className="font-mono text-muted-foreground">
                {data.tokenAgeMinutes < 60
                  ? `${data.tokenAgeMinutes}m ago`
                  : `${Math.round(data.tokenAgeMinutes / 60)}h ago`}
              </span>
            </div>
          )}
          {data.lastCliActivityAt && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Last CLI activity</span>
              <span className="font-mono text-muted-foreground">
                {new Date(data.lastCliActivityAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </>
      )}

      {data.authStatus !== "signed-in" && (
        <div className="rounded-md border border-border/60 bg-muted/30 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Sign in
          </div>
          <code className="mt-1 block select-all font-mono text-[10px] text-foreground">
            agy
          </code>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Run in your terminal — opens a browser for Google sign-in.
          </p>
        </div>
      )}
    </div>
  );
}

export function ProviderCard({ provider }: { provider: Provider }) {
  const showsRichInfo =
    provider.infoSlug === "openrouter" ||
    provider.infoSlug === "gemini" ||
    provider.infoSlug === "notebooklm" ||
    provider.infoSlug === "antigravity";

  return (
    <Card
      className={cn(
        "gap-2 border-border/60 bg-card/60 p-4 transition-colors",
        provider.isConfigured
          ? "hover:border-foreground/20 hover:bg-card"
          : "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-foreground">
            {provider.displayName}
          </h4>
          <code className="text-[10px] font-mono text-muted-foreground">
            {provider.authMethod === "session"
              ? "(browser session)"
              : provider.envVar}
          </code>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge
            variant="outline"
            className={cn(
              "font-mono text-[10px] uppercase",
              CATEGORY_ACCENT[provider.category]
            )}
          >
            {provider.category}
          </Badge>
          {provider.hasLiveUsage && (
            <Badge
              variant="outline"
              className="border-emerald-500/40 text-emerald-300 font-mono text-[10px] uppercase"
            >
              live
            </Badge>
          )}
        </div>
      </div>

      {provider.authMethod === "env-var" && (
        <div className="font-mono text-[11px] text-muted-foreground">
          {provider.isConfigured ? provider.keyPreview ?? "(set)" : "(missing)"}
        </div>
      )}

      {showsRichInfo && <Separator className="opacity-50" />}
      {provider.infoSlug === "openrouter" && provider.isConfigured && <OpenRouterUsageBlock />}
      {provider.infoSlug === "gemini" && provider.isConfigured && <GeminiInfoBlock />}
      {provider.infoSlug === "notebooklm" && <NotebookLMInfoBlock />}
      {provider.infoSlug === "antigravity" && <AntigravityInfoBlock />}
    </Card>
  );
}
