"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type { Goal, GoalStatus, GoalModel } from "@/lib/goals-types";
import { GOAL_MODELS } from "@/lib/goals-types";
import type { RalphPrd } from "@/lib/ralph";

const STATUS_TONE: Record<GoalStatus, string> = {
  active: "border-emerald-500/40 text-emerald-300",
  paused: "border-amber-500/40 text-amber-300",
  done: "border-sky-500/40 text-sky-300",
  abandoned: "border-zinc-700 text-muted-foreground",
};

const MODEL_TONE: Record<GoalModel, string> = {
  hermes: "border-emerald-500/40 text-emerald-300",
  claude: "border-violet-500/40 text-violet-300",
  amp: "border-amber-500/40 text-amber-300",
  antigravity: "border-sky-500/40 text-sky-300",
};

const MODEL_HINT: Record<GoalModel, string> = {
  hermes: "Hermes orchestrates ralph.sh + posts progress (default supervisor)",
  claude: "Direct ralph.sh --tool claude — fastest, uses Claude Pro quota",
  amp: "Direct ralph.sh --tool amp — separate billing",
  antigravity: "agy-driven loop (Phase B — not yet wired)",
};

const STATUS_NEXT: Record<GoalStatus, GoalStatus[]> = {
  active: ["paused", "done", "abandoned"],
  paused: ["active", "done", "abandoned"],
  done: ["active"],
  abandoned: ["active"],
};

function daysUntil(iso: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso + "T00:00:00").getTime();
  if (!Number.isFinite(t)) return null;
  const days = Math.round((t - Date.now()) / 86_400_000);
  if (days < -1) return `${-days}d overdue`;
  if (days === -1) return "yesterday";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `${days}d`;
}

export function GoalsView() {
  const { data, mutate, isLoading } = useSWR<{ goals: Goal[] }>(
    "/api/goals",
    fetcher
  );
  const goals = data?.goals ?? [];
  const [adding, setAdding] = useState(false);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-6">
        <header className="flex items-baseline justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-300">
              Goals
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Active priorities for this stack. Backed by{" "}
              <code className="font-mono">shared/goals.json</code> — Hermes
              reads this during crons.
            </p>
          </div>
          {!adding && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAdding(true)}
              className="h-7 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
            >
              + New Goal
            </Button>
          )}
        </header>

        {adding && (
          <NewGoalForm
            onCancel={() => setAdding(false)}
            onCreated={async () => {
              setAdding(false);
              await mutate();
            }}
          />
        )}

        {isLoading && (
          <p className="text-xs text-muted-foreground">Loading goals…</p>
        )}

        {!isLoading && goals.length === 0 && !adding && (
          <Card className="border-dashed border-border/60 p-8 text-center text-xs text-muted-foreground">
            No goals yet. Click <strong className="text-foreground">+ New Goal</strong> to add the first one.
          </Card>
        )}

        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} onChange={mutate} />
          ))}
        </ul>
      </div>
    </ScrollArea>
  );
}

function NewGoalForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [tags, setTags] = useState("");
  const [prdPath, setPrdPath] = useState("");
  const [model, setModel] = useState<GoalModel>("hermes");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/goals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          targetDate: targetDate.trim() || null,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          prdPath: prdPath.trim() || null,
          model,
        }),
      });
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="gap-3 border-cyan-500/40 bg-cyan-500/5 p-4">
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Title
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ship X feature, hit Y subscribers, etc."
          autoFocus
        />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Description (optional)
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Context, success criteria, blockers…"
          className="min-h-20 text-[13px]"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Target date (optional)
          </label>
          <Input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Tags (comma-separated)
          </label>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="bsf, seo, content"
          />
        </div>
      </div>
      <Separator className="opacity-50" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr]">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Ralph PRD path (optional)
          </label>
          <Input
            value={prdPath}
            onChange={(e) => setPrdPath(e.target.value)}
            placeholder="~/antigravity/ralphs/<slug>/prd.json"
            className="font-mono text-[12px]"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Linked PRD auto-derives progress from <code className="font-mono">passes:true</code> count.
          </p>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Ralph runner
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as GoalModel)}
            className={cn(
              "h-9 w-full rounded-md border bg-background px-2 text-[13px]",
              MODEL_TONE[model]
            )}
          >
            {GOAL_MODELS.map((m) => (
              <option key={m} value={m} className="bg-background">
                {m}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {MODEL_HINT[model]}
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={submit}
          disabled={!title.trim() || submitting}
          className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950"
        >
          {submitting ? "Creating…" : "Create goal"}
        </Button>
      </div>
    </Card>
  );
}

function GoalCard({
  goal,
  onChange,
}: {
  goal: Goal;
  onChange: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const due = daysUntil(goal.targetDate);

  // If a PRD is attached, load it; derived progress overrides stored progress.
  const prdReq = useSWR<{ goalId: string; model: GoalModel; prd: RalphPrd }>(
    goal.prdPath ? `/api/goals/${goal.id}/prd` : null,
    fetcher,
    { refreshInterval: 15_000 }
  );
  const prd = prdReq.data?.prd ?? null;
  const hasPrd = Boolean(goal.prdPath);
  const derivedProgress = prd ? prd.progress : null;
  const pct = Math.round(((derivedProgress ?? goal.progress)) * 100);

  async function patch(body: Partial<Goal>) {
    setBusy(true);
    try {
      await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      await onChange();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete "${goal.title}"?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
      await onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      className={cn(
        "gap-2 border-border/60 bg-card/60 p-4",
        goal.status === "done" && "opacity-70",
        goal.status === "abandoned" && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">{goal.title}</h4>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge
            variant="outline"
            className={cn("font-mono text-[10px] uppercase", STATUS_TONE[goal.status])}
          >
            {goal.status}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "font-mono text-[9px] uppercase",
              MODEL_TONE[goal.model]
            )}
            title={MODEL_HINT[goal.model]}
          >
            {goal.model}
          </Badge>
        </div>
      </div>

      {goal.description && (
        <p className="text-[11px] text-muted-foreground/90 leading-relaxed">
          {goal.description}
        </p>
      )}

      {hasPrd ? (
        <PrdBlock
          goal={goal}
          prd={prd}
          isLoading={prdReq.isLoading}
          error={prdReq.error}
        />
      ) : (
        <div className="space-y-1">
          <div className="flex items-baseline justify-between text-[10px] text-muted-foreground">
            <span>Progress (manual)</span>
            <span className="font-mono">{pct}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={pct}
            disabled={busy}
            onChange={(e) => patch({ progress: Number(e.target.value) / 100 })}
            className="w-full accent-cyan-400"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
        {due && (
          <span className="font-mono">
            {goal.targetDate} ·{" "}
            <span
              className={cn(
                due.includes("overdue")
                  ? "text-rose-300"
                  : due === "today" || due === "tomorrow"
                    ? "text-amber-300"
                    : "text-foreground/70"
              )}
            >
              {due}
            </span>
          </span>
        )}
        {goal.tags.length > 0 && (
          <>
            {due && <Separator orientation="vertical" className="h-3" />}
            <div className="flex flex-wrap gap-1">
              {goal.tags.map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="h-4 border-border/60 px-1 font-mono text-[9px]"
                >
                  {t}
                </Badge>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap gap-1">
          {STATUS_NEXT[goal.status].map((next) => (
            <Button
              key={next}
              size="sm"
              variant="ghost"
              onClick={() => patch({ status: next })}
              disabled={busy}
              className="h-6 px-2 font-mono text-[10px] uppercase"
            >
              → {next}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={remove}
          disabled={busy}
          className="h-6 px-2 text-[10px] text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
        >
          delete
        </Button>
      </div>
    </Card>
  );
}

type RalphRunState = {
  state: "idle" | "running";
  pid?: number;
  startedAt?: string;
  runForSeconds?: number;
  model?: GoalModel;
  toolFlag?: string;
  maxIterations?: number;
  logPath: string;
  logTail: string;
  lastExitCode: number | null;
  lastFinishedAt: string | null;
};

function PrdBlock({
  goal,
  prd,
  isLoading,
  error,
}: {
  goal: Goal;
  prd: RalphPrd | null;
  isLoading: boolean;
  error: unknown;
}) {
  if (isLoading) {
    return (
      <div className="rounded-md border border-dashed border-border/60 p-3 text-[11px] text-muted-foreground">
        Loading PRD…
      </div>
    );
  }
  if (error || !prd) {
    return (
      <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3 text-[11px] text-rose-300">
        PRD missing or unreadable at{" "}
        <code className="font-mono">{goal.prdPath}</code>
      </div>
    );
  }

  const pct = Math.round(prd.progress * 100);
  const sorted = prd.userStories
    .slice()
    .sort((a, b) => {
      // Pending first, then by priority
      if (a.passes !== b.passes) return a.passes ? 1 : -1;
      return a.priority - b.priority;
    });
  const top = sorted.slice(0, 6);
  const remaining = sorted.length - top.length;

  return (
    <div className="space-y-2 rounded-md border border-cyan-500/20 bg-cyan-500/5 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-300">
              PRD
            </span>
            {prd.branchName && (
              <code className="truncate font-mono text-[10px] text-muted-foreground">
                {prd.branchName}
              </code>
            )}
          </div>
          <code className="block truncate font-mono text-[9px] text-muted-foreground">
            {goal.prdPath}
          </code>
        </div>
        <div className="shrink-0 text-right font-mono">
          <div className="text-sm text-emerald-300">
            {prd.passingCount}/{prd.totalCount}
          </div>
          <div className="text-[9px] text-muted-foreground">{pct}% pass</div>
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-400"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="space-y-1 pt-1">
        {top.map((s) => (
          <li
            key={s.id}
            className="flex items-baseline gap-2 text-[11px] leading-relaxed"
          >
            <span
              className={cn(
                "inline-block w-3 shrink-0 text-center font-mono",
                s.passes ? "text-emerald-400" : "text-muted-foreground/60"
              )}
            >
              {s.passes ? "✓" : "☐"}
            </span>
            <code
              className={cn(
                "shrink-0 font-mono text-[9px]",
                s.passes ? "text-emerald-400/70" : "text-muted-foreground/80"
              )}
            >
              {s.id}
            </code>
            <span
              className={cn(
                "truncate",
                s.passes ? "text-muted-foreground line-through" : "text-foreground/90"
              )}
            >
              {s.title}
            </span>
          </li>
        ))}
        {remaining > 0 && (
          <li className="pl-5 text-[10px] text-muted-foreground/70">
            + {remaining} more stor{remaining === 1 ? "y" : "ies"}
          </li>
        )}
      </ul>

      <RalphRunner goal={goal} prdProgressPct={pct} />
    </div>
  );
}

function RalphRunner({
  goal,
  prdProgressPct,
}: {
  goal: Goal;
  prdProgressPct: number;
}) {
  const status = useSWR<RalphRunState>(
    `/api/goals/${goal.id}/ralph/status`,
    fetcher,
    {
      // Poll fast while running, slow when idle
      refreshInterval: (latest) =>
        latest?.state === "running" ? 3_000 : 15_000,
    }
  );

  const [busy, setBusy] = useState(false);
  const [logExpanded, setLogExpanded] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const state = status.data;
  const running = state?.state === "running";

  async function run() {
    if (running || busy) return;
    const confirmText =
      goal.model === "claude" || goal.model === "hermes"
        ? `Spawn Ralph (${goal.model} runner → claude-code) on "${goal.title}"?\n\nClaude Pro quota will be consumed per iteration. The loop runs up to 20 iterations by default.`
        : `Spawn Ralph (${goal.model} runner) on "${goal.title}"?`;
    if (!confirm(confirmText)) return;
    setBusy(true);
    setRunError(null);
    try {
      const res = await fetch(`/api/goals/${goal.id}/ralph/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setRunError(data.error ?? `HTTP ${res.status}`);
      }
      await status.mutate();
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    if (!running || busy) return;
    if (!confirm("Stop the running Ralph loop?")) return;
    setBusy(true);
    setRunError(null);
    try {
      const res = await fetch(`/api/goals/${goal.id}/ralph/stop`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) setRunError(data.error ?? `HTTP ${res.status}`);
      await status.mutate();
    } finally {
      setBusy(false);
    }
  }

  const elapsedLabel = state?.runForSeconds
    ? state.runForSeconds < 60
      ? `${state.runForSeconds}s`
      : state.runForSeconds < 3600
        ? `${Math.floor(state.runForSeconds / 60)}m ${state.runForSeconds % 60}s`
        : `${Math.floor(state.runForSeconds / 3600)}h ${Math.floor((state.runForSeconds % 3600) / 60)}m`
    : null;

  return (
    <div className="space-y-2 border-t border-cyan-500/10 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>
            runner:{" "}
            <span className={MODEL_TONE[goal.model].split(" ")[1]}>
              {goal.model}
            </span>
          </span>
          {running && (
            <>
              <Separator orientation="vertical" className="h-3" />
              <span className="flex items-center gap-1.5 font-mono text-emerald-300">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/60" />
                running · {elapsedLabel}
                {state?.maxIterations ? ` · max ${state.maxIterations} iter` : ""}
              </span>
            </>
          )}
          {!running && state?.lastFinishedAt && (
            <>
              <Separator orientation="vertical" className="h-3" />
              <span className="font-mono text-[10px] text-muted-foreground/80">
                last finished{" "}
                {new Date(state.lastFinishedAt).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {state.lastExitCode !== null && (
                  <span
                    className={cn(
                      "ml-1",
                      state.lastExitCode === 0
                        ? "text-emerald-300"
                        : "text-rose-300"
                    )}
                  >
                    (exit {state.lastExitCode})
                  </span>
                )}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {running ? (
            <Button
              size="sm"
              variant="outline"
              onClick={stop}
              disabled={busy}
              className="h-6 border-rose-500/40 px-2 text-[10px] text-rose-300 hover:bg-rose-500/10"
            >
              ■ Stop
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={run}
              disabled={busy || prdProgressPct >= 100 || goal.model === "antigravity"}
              className="h-6 border-cyan-500/40 px-2 text-[10px] text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-40"
              title={
                prdProgressPct >= 100
                  ? "All stories pass — nothing for Ralph to do"
                  : goal.model === "antigravity"
                    ? "agy runner ships in Phase C"
                    : "Spawn ralph.sh in the goal's workspace"
              }
            >
              ▶ Run Ralph
            </Button>
          )}
          {(state?.logTail || running) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setLogExpanded((v) => !v)}
              className="h-6 px-2 text-[10px] text-muted-foreground"
            >
              {logExpanded ? "hide log" : "show log"}
            </Button>
          )}
        </div>
      </div>

      {runError && (
        <p className="text-[10px] text-rose-300">{runError}</p>
      )}

      {logExpanded && (
        <pre className="max-h-48 overflow-auto rounded bg-background/60 p-2 font-mono text-[10px] leading-snug text-muted-foreground">
          {state?.logTail || "(no log output yet)"}
        </pre>
      )}
    </div>
  );
}
