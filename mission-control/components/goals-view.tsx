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
import type { Goal, GoalStatus } from "@/lib/goals";

const STATUS_TONE: Record<GoalStatus, string> = {
  active: "border-emerald-500/40 text-emerald-300",
  paused: "border-amber-500/40 text-amber-300",
  done: "border-sky-500/40 text-sky-300",
  abandoned: "border-zinc-700 text-muted-foreground",
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

  const pct = Math.round(goal.progress * 100);

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
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 font-mono text-[10px] uppercase",
            STATUS_TONE[goal.status]
          )}
        >
          {goal.status}
        </Badge>
      </div>

      {goal.description && (
        <p className="text-[11px] text-muted-foreground/90 leading-relaxed">
          {goal.description}
        </p>
      )}

      <div className="space-y-1">
        <div className="flex items-baseline justify-between text-[10px] text-muted-foreground">
          <span>Progress</span>
          <span className="font-mono">{pct}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          disabled={busy}
          onChange={(e) =>
            patch({ progress: Number(e.target.value) / 100 })
          }
          className="w-full accent-cyan-400"
        />
      </div>

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
