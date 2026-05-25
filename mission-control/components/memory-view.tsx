"use client";

import { useEffect, useState, useDeferredValue } from "react";
import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type {
  SearchHit,
  MemorySource,
  MemoryFileContent,
} from "@/lib/memory-search";

const SOURCE_LABEL: Record<MemorySource, { name: string; accent: string; tone: string }> = {
  brain: {
    name: "Obsidian Brain",
    accent: "text-cyan-300",
    tone: "border-cyan-500/40 text-cyan-300",
  },
  hermes: {
    name: "Hermes Memory",
    accent: "text-emerald-300",
    tone: "border-emerald-500/40 text-emerald-300",
  },
  claude: {
    name: "Claude Code Auto-Memory",
    accent: "text-violet-300",
    tone: "border-violet-500/40 text-violet-300",
  },
};

type SearchResponse = {
  query: string;
  totalHits: number;
  hits: SearchHit[];
  perSource: Record<MemorySource, number>;
  corpusCounts: Record<MemorySource, number>;
  durationMs: number;
};

function highlight(text: string, needle: string): React.ReactNode {
  if (!needle) return text;
  const lower = text.toLowerCase();
  const q = needle.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) {
      parts.push(text.slice(i));
      break;
    }
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark
        key={key++}
        className="rounded-sm bg-amber-500/30 px-0.5 text-amber-100"
      >
        {text.slice(idx, idx + needle.length)}
      </mark>
    );
    i = idx + needle.length;
  }
  return parts;
}

export function MemoryView() {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [filters, setFilters] = useState<Record<MemorySource, boolean>>({
    brain: true,
    hermes: true,
    claude: true,
  });
  const [openFile, setOpenFile] = useState<string | null>(null);

  const activeSources = (Object.keys(filters) as MemorySource[]).filter(
    (s) => filters[s]
  );
  const searchKey = deferred.trim()
    ? `/api/memory/search?q=${encodeURIComponent(deferred.trim())}&sources=${activeSources.join(",")}`
    : `/api/memory/search?q=`;
  const { data, isLoading } = useSWR<SearchResponse>(searchKey, fetcher, {
    keepPreviousData: true,
  });

  const fileDetail = useSWR<MemoryFileContent>(
    openFile ? `/api/memory/file?path=${encodeURIComponent(openFile)}` : null,
    fetcher
  );

  const corpus = data?.corpusCounts ?? { brain: 0, hermes: 0, claude: 0 };
  const totalCorpus = corpus.brain + corpus.hermes + corpus.claude;

  useEffect(() => {
    // Esc closes the open file
    if (!openFile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenFile(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openFile]);

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden p-4">
      <header className="shrink-0 space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-300">
              Memory Search
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {totalCorpus} files across Obsidian, Hermes &amp; Claude Code
              auto-memory
            </p>
          </div>
          {data?.query && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {data.totalHits} hits · {data.durationMs}ms
            </span>
          )}
        </div>

        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search keywords… (case-insensitive; substring)"
          className="h-9 font-mono text-[13px]"
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Sources:
          </span>
          {(["brain", "hermes", "claude"] as const).map((s) => (
            <SourceToggle
              key={s}
              source={s}
              count={corpus[s]}
              hits={data?.perSource[s] ?? 0}
              active={filters[s]}
              onToggle={() =>
                setFilters((prev) => ({ ...prev, [s]: !prev[s] }))
              }
              isSearching={!!data?.query}
            />
          ))}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_1fr] gap-3 overflow-hidden">
        {/* Hits list */}
        <ScrollArea className="rounded-md border border-border/60 bg-card/20">
          <ol className="space-y-2 p-2">
            {!data?.query && !isLoading && (
              <li className="rounded-md border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
                Type a query to search across all memory sources.
              </li>
            )}
            {data?.query && data.hits.length === 0 && (
              <li className="rounded-md border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
                No matches for{" "}
                <code className="rounded bg-muted px-1 font-mono text-foreground">
                  {data.query}
                </code>
                .
              </li>
            )}
            {data?.hits.map((hit) => {
              const isOpen = openFile === hit.filePath;
              const meta = SOURCE_LABEL[hit.source];
              return (
                <li key={hit.filePath}>
                  <button
                    type="button"
                    onClick={() => setOpenFile(hit.filePath)}
                    className={cn(
                      "w-full rounded-md border px-3 py-2 text-left transition-colors",
                      isOpen
                        ? "border-cyan-500/40 bg-cyan-500/5"
                        : "border-border/60 hover:border-foreground/20 hover:bg-secondary/30"
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="min-w-0">
                        <div className={cn("truncate text-sm font-semibold", meta.accent)}>
                          {hit.fileTitle}
                        </div>
                        <code className="block truncate font-mono text-[10px] text-muted-foreground">
                          {hit.relPath}
                        </code>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge
                          variant="outline"
                          className={cn("font-mono text-[9px] uppercase", meta.tone)}
                        >
                          {hit.source}
                        </Badge>
                        <span className="font-mono text-[9px] text-muted-foreground">
                          {hit.matchCount} hit{hit.matchCount === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                    <ul className="mt-1.5 space-y-0.5">
                      {hit.matches.slice(0, 3).map((m, i) => (
                        <li
                          key={i}
                          className="font-mono text-[11px] leading-relaxed text-muted-foreground/90"
                        >
                          <span className="mr-1 text-muted-foreground/60">
                            L{m.lineNumber}:
                          </span>
                          {highlight(m.line, data.query)}
                        </li>
                      ))}
                      {hit.matches.length > 3 && (
                        <li className="text-[10px] text-muted-foreground/60">
                          + {hit.matchCount - 3} more
                        </li>
                      )}
                    </ul>
                  </button>
                </li>
              );
            })}
          </ol>
        </ScrollArea>

        {/* File preview */}
        <Card className="flex min-h-0 flex-col gap-2 p-3">
          {!openFile && (
            <div className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">
              Click a result to preview the file.
            </div>
          )}
          {openFile && fileDetail.data && (
            <>
              <header className="shrink-0 flex items-start justify-between gap-2 border-b border-border/60 pb-2">
                <div className="min-w-0">
                  <h3
                    className={cn(
                      "truncate text-sm font-semibold",
                      SOURCE_LABEL[fileDetail.data.source].accent
                    )}
                  >
                    {fileDetail.data.relPath.split("/").pop()}
                  </h3>
                  <code className="block truncate font-mono text-[10px] text-muted-foreground">
                    {fileDetail.data.filePath}
                  </code>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setOpenFile(null)}
                  className="h-6 px-2 text-[10px]"
                >
                  close (esc)
                </Button>
              </header>
              <ScrollArea className="flex-1 min-h-0">
                <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-foreground/90">
                  {fileDetail.data.content}
                </pre>
              </ScrollArea>
              <div className="shrink-0 flex items-baseline justify-between text-[10px] text-muted-foreground">
                <span>{(fileDetail.data.sizeBytes / 1024).toFixed(1)} KB</span>
                <span>
                  modified{" "}
                  {new Date(fileDetail.data.modifiedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </>
          )}
          {openFile && fileDetail.isLoading && (
            <p className="p-4 text-xs text-muted-foreground">Loading…</p>
          )}
          {openFile && fileDetail.error && (
            <p className="p-4 text-xs text-rose-300">Failed to load file.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function SourceToggle({
  source,
  count,
  hits,
  active,
  onToggle,
  isSearching,
}: {
  source: MemorySource;
  count: number;
  hits: number;
  active: boolean;
  onToggle: () => void;
  isSearching: boolean;
}) {
  const meta = SOURCE_LABEL[source];
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors",
        active
          ? `${meta.tone} bg-card/40`
          : "border-border/60 text-muted-foreground hover:bg-secondary/30"
      )}
    >
      <span className={active ? "font-semibold" : ""}>{meta.name}</span>
      <Separator orientation="vertical" className="h-3" />
      <span className="font-mono text-[10px]">
        {isSearching ? `${hits}/` : ""}
        {count}
      </span>
    </button>
  );
}
