"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ActivityFeed } from "@/components/activity-feed";
import { CronGrid } from "@/components/cron-grid";
import { ModelsApisView } from "@/components/models-apis-view";
import { AntigravityControlRoom } from "@/components/antigravity-control-room";
import { ClaudeCodeControlRoom } from "@/components/claude-code-control-room";
import { GoalsView } from "@/components/goals-view";
import { JournalView } from "@/components/journal-view";
import { MemoryView } from "@/components/memory-view";
import { Separator } from "@/components/ui/separator";

type BrainLens = "goals" | "journal" | "memory";

type Props = {
  selectedAgent: string | null;
  selectedLens: BrainLens | null;
};

export function CenterPane({ selectedAgent, selectedLens }: Props) {
  if (selectedLens === "goals") {
    return <GoalsView />;
  }
  if (selectedLens === "journal") {
    return <JournalView />;
  }
  if (selectedLens === "memory") {
    return <MemoryView />;
  }

  if (selectedAgent === "hermes") {
    return (
      <div className="flex h-full flex-col">
        <header className="border-b border-border/60 px-6 py-3">
          <h2 className="text-sm font-semibold text-emerald-300">
            Hermes — Live WebUI
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Embedded from http://127.0.0.1:8787 — full chat, sessions, workspace
          </p>
        </header>
        <iframe
          src="http://127.0.0.1:8787"
          title="Hermes WebUI"
          className="flex-1 border-0 bg-background"
        />
      </div>
    );
  }

  if (selectedAgent === "claude") {
    return <ClaudeCodeControlRoom />;
  }

  if (selectedAgent === "antigravity") {
    return <AntigravityControlRoom />;
  }

  return (
    <Tabs defaultValue="overview" className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border/60 px-6 pt-3">
        <TabsList className="bg-transparent p-0 gap-3">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-400 px-1 pb-2 text-xs uppercase tracking-wider"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="models-apis"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-400 px-1 pb-2 text-xs uppercase tracking-wider"
          >
            Models &amp; APIs
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="flex-1 min-h-0 m-0 outline-none">
        <div className="flex h-full flex-col gap-5 overflow-hidden p-6">
          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Active Crons
              </h2>
              <span className="text-[10px] text-muted-foreground">
                from ~/.hermes/cron/jobs.json
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Scheduled Hermes jobs, last result, and next firing time
            </p>
            <div className="mt-3">
              <CronGrid />
            </div>
          </section>

          <Separator />

          <section className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Activity Feed
              </h2>
              <span className="text-[10px] text-muted-foreground">
                from shared/activity-log.md · polling 2s
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Every Write / Edit / NotebookEdit by Claude Code, newest first
            </p>
            <div className="mt-3 flex-1 min-h-0">
              <ActivityFeed />
            </div>
          </section>
        </div>
      </TabsContent>

      <TabsContent value="models-apis" className="flex-1 min-h-0 m-0 outline-none">
        <ModelsApisView />
      </TabsContent>
    </Tabs>
  );
}
