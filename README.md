# Hermes Agentic OS

A local-first **Mission Control dashboard** that unifies three AI agents — **Hermes Agent**, **Claude Code**, and **Google Antigravity (`agy`)** — into one browser tab. File-based shared context, Next.js 16 dashboard, no SaaS dependencies beyond the AI provider subscriptions you already pay for.

The agents do the work; this OS makes them legible to each other and to you.

---

## What's in here

### Three-rail dashboard (`mission-control/`)

`http://127.0.0.1:7777` — Next.js 16 + Tailwind 4 + shadcn/ui + Bun, served by a systemd user service.

- **Left rail — Agent roster** with live status dots (working / idle / offline) for Hermes, Claude Code, Antigravity. Click any agent → control room.
- **Center pane — Mission Control tabs:**
  - **Overview** — live Hermes cron grid (polls 30 s), real activity feed (polls 2 s, shows every file Claude Code edits)
  - **Models & APIs** — subscriptions, providers with redacted key previews, real OpenRouter cost progress bars, Hermes-tracked sessions per model family, 70+ available models grouped by provider
- **Right rail — The Brain:** Goals tracker, Journal (text + voice via Web Speech API), Memory search

### Per-agent control rooms

- **Hermes** — embeds the existing `hermes-webui.service` as an iframe
- **Claude Code** — read-only session browser: lists every `~/.claude/projects/<this-project>/<id>.jsonl`, parses transcripts, renders user/assistant turns with inline tool calls and collapsible tool results
- **Antigravity** — quick-prompt form → POST `/api/antigravity/print` → spawns `agy -p` → renders response in ~10 s. Conversation history sidebar.

### The Brain (Layer 2b)

- **Goals** — full CRUD with progress sliders, status transitions, target dates, tag filters. Backed by `shared/goals.json` so Hermes can read goals during cron-driven work.
- **Journal** — text or voice (Web Speech API in Chromium) → appends to `~/brain/journal/YYYY-MM-DD.md` so Obsidian auto-indexes
- **Memory search** — one search box across the Obsidian vault, Hermes memories, and Claude Code auto-memory (~80+ files). Excerpts with match highlighting, file preview pane.

### Shared context layer

| File (in `shared/`) | What |
|---|---|
| `activity-log.md` | Auto-appended by a Claude Code PostToolUse hook (`scripts/log-activity.sh`) |
| `hermes-state.md` | Live Hermes snapshot, refreshed by `scripts/refresh-hermes-state.sh` |
| `goals.json` | Active goals — read by both the dashboard and Hermes crons |
| `subscriptions.json` | Manually-curated AI subscriptions you pay for |
| `notes.md` | Freeform shared scratchpad |

### Hermes additions

- **`skills/antigravity/SKILL.md`** — orchestration guide so Hermes can delegate to `agy -p` the same way it delegates to `claude -p` (full decision matrix for choosing between Claude / Codex / Antigravity)
- **`morning-goal-triage` cron** — 7 am daily, reads `goals.json` + `activity-log.md`, sends a Telegram brief categorising goals as on-track / needs-attention / overdue (set up via `hermes cron create`; not committed because it's a per-machine `~/.hermes/cron/jobs.json` entry)
- **`CLAUDE.md`** — auto-loaded by Claude Code in this workspace; instructs it to read `goals.json` at session start and surface goal-advancing work

### What's wired vs not

| Surface | Status |
|---|---|
| Hermes ↔ Claude Code shared state | ✅ via `shared/` files + hook |
| Hermes ↔ Antigravity delegation | ✅ via `skills/antigravity/SKILL.md` |
| OpenRouter live spend (real progress bars) | ✅ |
| Gemini model count + free-tier limits | ✅ |
| NotebookLM auth + deep-links to each notebook | ✅ |
| Antigravity prompt-from-dashboard | ✅ |
| Claude Code session transcripts in the UI | ✅ |
| Voice journal → Obsidian | ✅ |
| Unified memory search | ✅ |
| Goal triage cron → Telegram | ✅ |

---

## Stack

- Next.js 16 (App Router, RSC) + Tailwind 4 + shadcn/ui + Bun
- TypeScript strict, route handlers read filesystem directly (no DB)
- SWR client-side polling (2 s activity feed, 5 s agents, 30 s crons + OpenRouter)
- systemd user service for auto-start
- Filesystem-backed: `~/brain/` (Obsidian), `~/.hermes/`, `~/.claude/projects/`, `~/.gemini/antigravity-cli/`, `~/.notebooklm/`

## Known quirks (if you fork)

- Don't run `bun run dev` from the **Antigravity IDE's integrated terminal** — `ELECTRON_RUN_AS_NODE=1`, `VSCODE_*`, and `CHROME_DESKTOP` leak in and break `agy`'s auth realm. `lib/antigravity.ts::cleanEnv()` strips those vars before spawn as a defence.
- `agy -p` hangs forever if stdin is left as an unclosed pipe — always `stdio: ["ignore", "pipe", "pipe"]`.
- Subscription quotas (ChatGPT Plus, Claude Pro, Google AI Premium) aren't queryable. The dashboard shows what's honestly queryable (OpenRouter $, Gemini models) plus Hermes-session-counts as a real activity proxy.

## Setup

Hermes + Claude Code + Antigravity installs are out of scope. Once you have all three:

```bash
git clone https://github.com/Travissteel/hermes-agentic-os.git ~/antigravity
cd ~/antigravity/mission-control && bun install && bun run build
cp ../shared/goals.example.json ../shared/goals.json
cp ../shared/subscriptions.example.json ../shared/subscriptions.json
bun run start    # or wire as a systemd service
```

Hook up the Claude Code PostToolUse hook (see `scripts/log-activity.sh`) and symlink `skills/antigravity` into `~/.hermes/skills/`.

## Licence

MIT — see [LICENSE](LICENSE).

Built with Claude Code (claude-sonnet-4-6), May 2026.
