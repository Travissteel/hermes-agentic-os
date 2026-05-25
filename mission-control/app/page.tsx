"use client";

import { useState } from "react";
import { AgentRoster } from "@/components/agent-roster";
import { CenterPane } from "@/components/center-pane";
import { BrainRail } from "@/components/brain-rail";
import { HeaderBar } from "@/components/header-bar";

type BrainLens = "goals" | "journal" | "memory";

export default function Home() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedLens, setSelectedLens] = useState<BrainLens | null>(null);

  // Selecting an agent dismisses the brain lens, and vice versa, so the
  // center pane only ever shows one thing at a time.
  function handleAgentSelect(id: string | null) {
    setSelectedAgent(id);
    if (id !== null) setSelectedLens(null);
  }
  function handleLensSelect(lens: BrainLens | null) {
    setSelectedLens(lens);
    if (lens !== null) setSelectedAgent(null);
  }

  return (
    <div className="flex h-screen flex-col">
      <HeaderBar />
      <div className="grid flex-1 min-h-0 grid-cols-[14rem_1fr_18rem] divide-x divide-border/60">
        <AgentRoster
          selectedId={selectedAgent}
          onSelect={handleAgentSelect}
        />
        <main className="min-w-0 overflow-hidden bg-background">
          <CenterPane
            selectedAgent={selectedAgent}
            selectedLens={selectedLens}
          />
        </main>
        <BrainRail
          selectedLens={selectedLens}
          onSelectLens={handleLensSelect}
        />
      </div>
    </div>
  );
}
