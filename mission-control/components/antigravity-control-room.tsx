"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type { AntigravityConversation, AgyPrintResult } from "@/lib/antigravity";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
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

export function AntigravityControlRoom() {
  const [prompt, setPrompt] = useState("");
  const [continueConvo, setContinueConvo] = useState(true);
  const [skipPermissions, setSkipPermissions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<AgyPrintResult | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const convos = useSWR<{ conversations: AntigravityConversation[] }>(
    "/api/antigravity/conversations",
    fetcher,
    { refreshInterval: 10_000 }
  );

  useEffect(() => {
    if (busy) {
      const start = Date.now();
      tickerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - start);
      }, 200);
    } else if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [busy]);

  async function send() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setResult(null);
    setElapsedMs(0);
    try {
      const res = await fetch("/api/antigravity/print", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          continue: continueConvo,
          skipPermissions,
        }),
      });
      const data = (await res.json()) as AgyPrintResult;
      setResult(data);
      // Refresh conversation list (new convo may have been created)
      convos.mutate();
    } catch (e) {
      setResult({
        ok: false,
        response: "",
        durationMs: 0,
        exitCode: null,
        error: e instanceof Error ? e.message : "request failed",
      });
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="grid h-full grid-cols-[1fr_18rem] gap-4 p-4 overflow-hidden">
      {/* Main column */}
      <div className="flex min-h-0 flex-col gap-4">
        <header className="shrink-0">
          <h2 className="text-sm font-semibold text-sky-300">
            Antigravity — Quick Prompt
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Runs <code className="font-mono">agy -p</code> from
            <code className="ml-1 font-mono">~/antigravity</code>. ~10s for
            short prompts; up to 5 min for heavy ones.
          </p>
        </header>

        {/* Compose */}
        <Card className="shrink-0 gap-3 p-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask Gemini 3.5 Flash anything…   (⌘/Ctrl + Enter to send)"
            disabled={busy}
            className="min-h-28 resize-y font-mono text-[13px]"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-[11px]">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={continueConvo}
                  onChange={(e) => setContinueConvo(e.target.checked)}
                  disabled={busy}
                  className="accent-sky-400"
                />
                <span className="text-muted-foreground">
                  Continue this workspace&apos;s convo
                </span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={skipPermissions}
                  onChange={(e) => setSkipPermissions(e.target.checked)}
                  disabled={busy}
                  className="accent-rose-400"
                />
                <span className="text-muted-foreground">
                  Skip tool approvals
                </span>
              </label>
            </div>
            <Button
              onClick={send}
              disabled={busy || !prompt.trim()}
              size="sm"
              className="h-8 px-4 bg-sky-500 hover:bg-sky-400 text-zinc-950"
            >
              {busy ? (
                <span className="font-mono">
                  running… {(elapsedMs / 1000).toFixed(1)}s
                </span>
              ) : (
                <span>Send →</span>
              )}
            </Button>
          </div>
        </Card>

        {/* Response */}
        <Card className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <div className="flex shrink-0 items-baseline justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Response
            </h3>
            {result && (
              <div className="flex items-center gap-2 font-mono text-[10px]">
                <Badge
                  variant="outline"
                  className={cn(
                    result.ok
                      ? "border-emerald-500/40 text-emerald-300"
                      : "border-rose-500/40 text-rose-300"
                  )}
                >
                  {result.ok ? "ok" : `exit ${result.exitCode ?? "?"}`}
                </Badge>
                <span className="text-muted-foreground">
                  {(result.durationMs / 1000).toFixed(1)}s
                </span>
              </div>
            )}
          </div>
          <ScrollArea className="flex-1 min-h-0 rounded-md border border-border/60 bg-background/40">
            {!result && !busy && (
              <p className="p-4 text-xs text-muted-foreground">
                Response will appear here.
              </p>
            )}
            {busy && (
              <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-sky-400" />
                Asking Gemini 3.5 Flash via agy…
              </div>
            )}
            {result?.ok && (
              <pre className="whitespace-pre-wrap break-words p-4 font-mono text-[13px] leading-relaxed text-foreground">
                {result.response}
              </pre>
            )}
            {result && !result.ok && (
              <div className="space-y-2 p-4">
                <p className="text-xs font-semibold text-rose-300">
                  agy failed
                </p>
                {result.error && (
                  <pre className="whitespace-pre-wrap break-words rounded bg-rose-500/10 p-2 font-mono text-[11px] text-rose-200">
                    {result.error}
                  </pre>
                )}
                {result.response && (
                  <pre className="whitespace-pre-wrap break-words p-2 font-mono text-[12px] text-muted-foreground">
                    {result.response}
                  </pre>
                )}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>

      {/* Right sidebar: conversation list */}
      <aside className="flex min-h-0 flex-col gap-3">
        <header className="shrink-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Conversations
          </h3>
          <p className="text-[10px] text-muted-foreground">
            ~/.gemini/antigravity-cli/conversations/
          </p>
        </header>
        <Separator />
        <ScrollArea className="flex-1 min-h-0">
          <ul className="space-y-1.5">
            {(convos.data?.conversations ?? []).map((c) => (
              <li
                key={c.id}
                className={cn(
                  "rounded-md border px-2.5 py-2 text-[11px] transition-colors",
                  c.isCurrent
                    ? "border-sky-500/40 bg-sky-500/5"
                    : "border-border/60 hover:border-foreground/20"
                )}
              >
                <div className="flex items-baseline justify-between gap-1">
                  <code className="truncate font-mono text-foreground">
                    {c.id.slice(0, 8)}
                  </code>
                  {c.isCurrent && (
                    <Badge
                      variant="outline"
                      className="h-4 border-sky-500/40 px-1 font-mono text-[9px] text-sky-300"
                    >
                      current
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 flex items-baseline justify-between text-muted-foreground">
                  <span>{relativeTime(c.modifiedAt)}</span>
                  <span className="font-mono">{fmtSize(c.sizeBytes)}</span>
                </div>
              </li>
            ))}
            {!convos.data && (
              <li className="text-[11px] text-muted-foreground">Loading…</li>
            )}
            {convos.data?.conversations.length === 0 && (
              <li className="text-[11px] text-muted-foreground">
                No conversations yet.
              </li>
            )}
          </ul>
        </ScrollArea>
      </aside>
    </div>
  );
}
