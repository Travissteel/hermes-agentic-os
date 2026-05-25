"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Goal } from "@/lib/goals";
import type { JournalDay } from "@/lib/journal";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type BrainLens = "goals" | "journal" | "memory";

type Props = {
  selectedLens: BrainLens | null;
  onSelectLens: (lens: BrainLens | null) => void;
};

export function BrainRail({ selectedLens, onSelectLens }: Props) {
  const goals = useSWR<{ goals: Goal[] }>("/api/goals", fetcher, {
    refreshInterval: 30_000,
  });
  const active = (goals.data?.goals ?? [])
    .filter((g) => g.status === "active")
    .slice(0, 3);

  const today = todayISO();
  const journal = useSWR<JournalDay>(
    `/api/journal?date=${today}`,
    fetcher,
    { refreshInterval: 60_000 }
  );
  const todayEntries = journal.data?.entries ?? [];
  const latestEntry = todayEntries[todayEntries.length - 1];

  const memory = useSWR<{ corpusCounts: { brain: number; hermes: number; claude: number } }>(
    "/api/memory/search?q=",
    fetcher,
    { refreshInterval: 5 * 60_000 }
  );
  const corpus = memory.data?.corpusCounts ?? { brain: 0, hermes: 0, claude: 0 };
  const totalCorpus = corpus.brain + corpus.hermes + corpus.claude;

  return (
    <aside className="flex h-full flex-col gap-3 p-3">
      <header className="px-1">
        <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
          The Brain
        </h2>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Goals, journal, memory — click any section to open
        </p>
      </header>

      <SectionToggle
        title="Goals"
        active={selectedLens === "goals"}
        onClick={() =>
          onSelectLens(selectedLens === "goals" ? null : "goals")
        }
      >
        {active.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">
            No active goals.{" "}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectLens("goals");
              }}
              className="text-cyan-300 hover:underline"
            >
              Add one →
            </button>
          </p>
        ) : (
          <ul className="space-y-2">
            {active.map((g) => {
              const pct = Math.round(g.progress * 100);
              return (
                <li key={g.id} className="space-y-0.5">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="truncate text-[11px] text-foreground/90">
                      {g.title}
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-cyan-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionToggle>

      <SectionToggle
        title="Journal"
        active={selectedLens === "journal"}
        onClick={() =>
          onSelectLens(selectedLens === "journal" ? null : "journal")
        }
      >
        {todayEntries.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">
            No entries today.{" "}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectLens("journal");
              }}
              className="text-cyan-300 hover:underline"
            >
              Capture one →
            </button>
          </p>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between text-[11px]">
              <span className="text-foreground/90">
                {todayEntries.length}{" "}
                {todayEntries.length === 1 ? "entry today" : "entries today"}
              </span>
              <span className="font-mono text-[9px] text-muted-foreground">
                {latestEntry?.time}
              </span>
            </div>
            {latestEntry && (
              <p className="line-clamp-2 text-[10px] text-muted-foreground/90 leading-snug">
                {latestEntry.body}
              </p>
            )}
          </div>
        )}
      </SectionToggle>

      <SectionToggle
        title="Memory"
        active={selectedLens === "memory"}
        onClick={() =>
          onSelectLens(selectedLens === "memory" ? null : "memory")
        }
      >
        <div className="space-y-1 text-[10px] text-muted-foreground">
          <p>
            <span className="text-foreground/85 font-mono">
              {totalCorpus}
            </span>{" "}
            files indexed
          </p>
          <ul className="space-y-0.5">
            <li className="flex items-baseline justify-between">
              <span className="text-cyan-300/80">Obsidian</span>
              <span className="font-mono">{corpus.brain}</span>
            </li>
            <li className="flex items-baseline justify-between">
              <span className="text-emerald-300/80">Hermes</span>
              <span className="font-mono">{corpus.hermes}</span>
            </li>
            <li className="flex items-baseline justify-between">
              <span className="text-violet-300/80">Claude Code</span>
              <span className="font-mono">{corpus.claude}</span>
            </li>
          </ul>
        </div>
      </SectionToggle>

      <div className="mt-auto px-1">
        <Separator className="mb-2" />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onSelectLens(null)}
          disabled={selectedLens === null}
          className="h-7 w-full justify-start px-2 text-[10px] text-muted-foreground"
        >
          ← back to mission control
        </Button>
      </div>
    </aside>
  );
}

function SectionToggle({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "cursor-pointer gap-2 border-border/60 bg-transparent p-3 transition-colors",
        active
          ? "border-cyan-500/50 bg-cyan-500/5"
          : "hover:border-foreground/20 hover:bg-card/40"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <h3
          className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            active ? "text-cyan-300" : "text-muted-foreground"
          )}
        >
          {title}
        </h3>
        <span
          className={cn(
            "font-mono text-[10px]",
            active ? "text-cyan-300" : "text-muted-foreground/60"
          )}
        >
          {active ? "open" : "→"}
        </span>
      </div>
      {children}
    </Card>
  );
}
