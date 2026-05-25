"use client";

import { useEffect, useRef, useState } from "react";
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
import type {
  JournalDay,
  JournalDateSummary,
  EntrySource,
} from "@/lib/journal";

// Minimal Web Speech API typing — not in stdlib.
type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function JournalView() {
  const [date, setDate] = useState<string>(todayISO());
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "unsupported">("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Hold a stable buffer of finalized transcripts so interim results don't overwrite them
  const finalsRef = useRef<string>("");

  const day = useSWR<JournalDay>(
    `/api/journal?date=${date}`,
    fetcher,
    { refreshInterval: 0 }
  );

  const dates = useSWR<{ dates: JournalDateSummary[] }>(
    "/api/journal/dates",
    fetcher,
    { refreshInterval: 60_000 }
  );

  // Set up Web Speech API once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceState("unsupported");
      return;
    }
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-AU";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const t = res[0].transcript;
        if (res.isFinal) {
          finalsRef.current += (finalsRef.current ? " " : "") + t.trim();
        } else {
          interim += t;
        }
      }
      setText(finalsRef.current + (interim ? " " + interim : ""));
    };
    r.onerror = (e) => {
      setVoiceError(e.error || "speech error");
      setVoiceState("idle");
    };
    r.onend = () => {
      setVoiceState((s) => (s === "listening" ? "idle" : s));
    };
    recognitionRef.current = r;
    return () => {
      try {
        r.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  function toggleVoice() {
    const r = recognitionRef.current;
    if (!r) return;
    setVoiceError(null);
    if (voiceState === "listening") {
      r.stop();
      setVoiceState("idle");
    } else {
      finalsRef.current = text.trim();
      try {
        r.start();
        setVoiceState("listening");
      } catch (e) {
        setVoiceError(e instanceof Error ? e.message : "start failed");
      }
    }
  }

  async function send(source: EntrySource) {
    const body = text.trim();
    if (!body || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: body, source, date }),
      });
      if (res.ok) {
        setText("");
        finalsRef.current = "";
        await day.mutate();
        await dates.mutate();
      }
    } finally {
      setSubmitting(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      send(voiceState === "listening" ? "voice" : "text");
    }
  }

  const entries = day.data?.entries ?? [];
  const isToday = date === todayISO();
  const allDates = dates.data?.dates ?? [];

  return (
    <div className="grid h-full grid-cols-[1fr_14rem] gap-4 overflow-hidden p-4">
      {/* Main column */}
      <div className="flex min-h-0 flex-col gap-4">
        <header className="shrink-0 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-300">
              Journal · {date}
              {isToday && (
                <Badge
                  variant="outline"
                  className="ml-2 h-4 border-emerald-500/40 px-1 font-mono text-[9px] text-emerald-300"
                >
                  today
                </Badge>
              )}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Appends to{" "}
              <code className="font-mono">
                ~/brain/journal/{date}.md
              </code>{" "}
              — Obsidian-indexed
            </p>
          </div>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || todayISO())}
            className="h-8 w-40"
          />
        </header>

        {/* Compose */}
        <Card className="shrink-0 gap-3 p-3">
          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              finalsRef.current = e.target.value;
            }}
            onKeyDown={onKeyDown}
            placeholder={
              voiceState === "listening"
                ? "Listening… speak now (Ctrl+Enter to save)"
                : "Type your entry…   (Ctrl/⌘+Enter to save)"
            }
            disabled={submitting}
            className={cn(
              "min-h-24 resize-y text-[13px] leading-relaxed",
              voiceState === "listening" && "border-rose-500/40 bg-rose-500/5"
            )}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                onClick={toggleVoice}
                disabled={voiceState === "unsupported" || submitting}
                size="sm"
                variant="outline"
                className={cn(
                  "h-8 gap-1.5 px-3",
                  voiceState === "listening"
                    ? "border-rose-500/60 text-rose-300 hover:bg-rose-500/10"
                    : "border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
                )}
                title={
                  voiceState === "unsupported"
                    ? "Web Speech API not available in this browser"
                    : voiceState === "listening"
                      ? "Stop dictation"
                      : "Start dictation"
                }
              >
                <span
                  className={cn(
                    "inline-block h-2 w-2 rounded-full",
                    voiceState === "listening"
                      ? "animate-pulse bg-rose-400 shadow-[0_0_6px] shadow-rose-400/60"
                      : voiceState === "unsupported"
                        ? "bg-zinc-600"
                        : "bg-cyan-400"
                  )}
                />
                <span className="font-mono text-[11px] uppercase tracking-wider">
                  {voiceState === "listening" ? "Listening" : "Voice"}
                </span>
              </Button>
              {voiceError && (
                <span className="text-[10px] text-rose-300">{voiceError}</span>
              )}
            </div>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setText("");
                  finalsRef.current = "";
                }}
                disabled={!text || submitting}
                className="h-8 px-3"
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  send(voiceState === "listening" ? "voice" : "text")
                }
                disabled={!text.trim() || submitting}
                className="h-8 px-4 bg-cyan-500 hover:bg-cyan-400 text-zinc-950"
              >
                {submitting ? "Saving…" : "Save entry →"}
              </Button>
            </div>
          </div>
          {voiceState === "unsupported" && (
            <p className="text-[10px] text-amber-300">
              Voice dictation requires a Chromium-based browser with Web Speech
              API enabled. Type entries above instead.
            </p>
          )}
        </Card>

        {/* Entries */}
        <Card className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <div className="flex shrink-0 items-baseline justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </h3>
            <span className="text-[10px] text-muted-foreground">
              newest first
            </span>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <ol className="space-y-2 pr-3">
              {entries.length === 0 ? (
                <li className="rounded-md border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
                  {day.isLoading ? "Loading…" : `No entries for ${date}.`}
                </li>
              ) : (
                entries
                  .slice()
                  .reverse()
                  .map((e) => (
                    <li
                      key={e.id}
                      className="rounded-md border border-border/60 bg-card/40 p-3"
                    >
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="font-mono text-[11px] text-cyan-300">
                          {e.time}
                        </span>
                        {e.source === "voice" && (
                          <Badge
                            variant="outline"
                            className="h-4 border-rose-500/40 px-1 font-mono text-[9px] uppercase text-rose-300"
                          >
                            voice
                          </Badge>
                        )}
                      </div>
                      <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-foreground/90">
                        {e.body}
                      </pre>
                    </li>
                  ))
              )}
            </ol>
          </ScrollArea>
        </Card>
      </div>

      {/* Right sidebar: date list */}
      <aside className="flex min-h-0 flex-col gap-3">
        <header>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Recent days
          </h3>
        </header>
        <Separator />
        <ScrollArea className="flex-1 min-h-0">
          <ul className="space-y-1">
            {allDates.map((d) => (
              <li key={d.date}>
                <button
                  type="button"
                  onClick={() => setDate(d.date)}
                  className={cn(
                    "flex w-full items-baseline justify-between rounded-md border px-2.5 py-1.5 text-left transition-colors",
                    date === d.date
                      ? "border-cyan-500/40 bg-cyan-500/5"
                      : "border-transparent hover:border-border/60 hover:bg-secondary/30"
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-[11px]",
                      date === d.date ? "text-cyan-300" : "text-foreground/85"
                    )}
                  >
                    {d.date}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {d.entryCount}
                  </span>
                </button>
              </li>
            ))}
            {allDates.length === 0 && (
              <li className="text-[11px] text-muted-foreground">
                No journal days yet. Write your first entry on the left.
              </li>
            )}
          </ul>
        </ScrollArea>
      </aside>
    </div>
  );
}
