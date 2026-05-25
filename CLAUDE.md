# Antigravity Agentic OS

This workspace is the **shared operating layer** between Claude Code (you) and Hermes Agent. Both agents can see, write to, and build on work done here.

The system has three layers:
1. **Shared context (this layer)** — file-based state both agents read/write (`shared/`)
2. **Mission Control dashboard** — Next.js UI at `http://127.0.0.1:7777` (live; Overview + Models & APIs tabs, agent control rooms for Hermes / Claude Code / Antigravity, Goals lens in the brain rail)
3. **Per-agent control rooms** — Hermes WebUI iframe, Antigravity quick-prompt, Claude Code session browser (live)

---

## Shared State (the connective tissue)

Both Hermes and Claude Code read and write these files:

| File | Purpose | Written by |
|---|---|---|
| `shared/hermes-state.md` | Live Hermes snapshot — services, model, crons, recent sessions | `scripts/refresh-hermes-state.sh` (manual or cron) |
| `shared/activity-log.md` | Append-only log of every file Claude Code edits + Hermes deliveries | Claude Code (PostToolUse hook) + Hermes (when applicable) |
| `shared/notes.md` | Freeform shared scratchpad — decisions, context, ideas | Both agents |
| `shared/goals.json` | Active goals with progress (used by dashboard) | Both agents |

**Refresh Hermes state:** `bash ~/antigravity/scripts/refresh-hermes-state.sh`

**At the start of any session involving Hermes, automation, content, or SEO** — read `shared/hermes-state.md` and the tail of `shared/activity-log.md` to know what Hermes has been doing.

**Always read `shared/goals.json` at session start.** Active goals are Travis's current priorities. When you propose work or pick tasks, consider whether they advance an active goal. If a goal's `tracked_models` or tags match the area you're touching, mention it in your response (e.g. "this advances the *Ship Mission Control v1* goal"). Don't auto-update progress in the file — Travis owns that via the dashboard at `http://127.0.0.1:7777`.

---

## The Hermes Stack

- **Install:** `~/.hermes/hermes-agent/` (v0.13.0, 230 commits behind — `hermes update` available)
- **Config:** `~/.hermes/config.yaml`
- **Model:** `gpt-5.2` via `openai-codex` provider (OpenAI subscription OAuth)
- **Gateway:** `hermes-gateway.service` (systemd user unit) — Telegram bot, allowed user `1518423327`
- **WebUI:** `hermes-webui.service` at `http://127.0.0.1:8787` (three-panel: sessions / chat / workspace)
- **Skills enabled:** claude-code, codex, hermes-agent, opencode, claude-design, codebase-inspection, github-code-review, requesting-code-review

### Hermes file locations

| Path | Contents |
|---|---|
| `~/.hermes/config.yaml` | main config (model, gateway, terminal cwd, etc.) |
| `~/.hermes/.env` | API keys (chmod 600) |
| `~/.hermes/SOUL.md` | agent personality |
| `~/.hermes/cron/jobs.json` | scheduled job definitions |
| `~/.hermes/scripts/` | python scripts called by cron jobs |
| `~/.hermes/sessions/` | session JSON files |
| `~/.hermes/memories/` | learned memories |
| `~/.hermes/logs/agent.log` | agent log |
| `~/.hermes/skills/` | installed skills |

---

## Active Hermes Crons (9 jobs)

| Name | Schedule | Script | Mode | Purpose |
|---|---|---|---|---|
| `bsf-nightly-seo` | 2am daily | (agent) | agent | business-software-finder.com SEO content |
| `hf-nightly-seo` | 3am daily | (agent) | agent | hypnotherapy-finder.com SEO content |
| `Daily work report` | 6am daily | `postiz_yesterday_posts.py` | script | Yesterday's Postiz stats → Telegram |
| `content-ideas-research` | 10am Mon/Thu | `content_ideas_research.py` | no-agent | Content ideas research |
| `Weekly performance + voice sync` | 9pm Sat | `postiz_performance_weekly.py` | script | Postiz weekly performance |
| `x-viral-research-weekly` | 6am Sun | `x_research_weekly.py` | script | X viral content research |
| `content-weekly-synthesis` | 6:30am Sun | `content_weekly_synthesis.py` | no-agent | Weekly content synthesis |
| `Weekly draft generator` | 7am Sun | (agent) | agent | Generates draft posts for approval |
| `Weekly post scheduler` | 3pm Sun | `schedule_approved_drafts.py` | script | Schedules approved drafts to Postiz |

(Source of truth: `~/.hermes/cron/jobs.json`; `shared/hermes-state.md` mirrors this.)

---

## Active Projects

- **X Content Automation** — n8n DM workflow on `n8n.srv849680.hstgr.cloud`, full research pipeline (daily + weekly), hook taxonomy + 3-gate slop filter, posted via Postiz
- **BSF SEO** — business-software-finder.com, nightly Hermes cron 2am, GitHub repo for content commits
- **HF SEO** — hypnotherapy-finder.com, nightly cron 3am, needs `HF_GITHUB_TOKEN`
- **Beehiiv Newsletters** — connected through Postiz workflow
- **Obsidian Brain Vault** — `~/brain/` — shared knowledge base (brand, infra, content ideas). Journal entries from the dashboard will land in `~/brain/journal/YYYY-MM-DD.md`.

---

## Invoking Hermes from Claude Code

One-shot (no gateway, no session — clean stdin/stdout):
```bash
hermes -p "task here"
```

Interactive session:
```bash
hermes
```

Inspect Hermes state:
```bash
hermes cron list
hermes skills list
hermes gateway status
journalctl --user -u hermes-gateway -n 30 --no-pager
```

---

## Invoking Claude Code from Hermes

The `claude-code` skill is already enabled in Hermes. From a Hermes session:
```
/skill claude-code
```

Or directly via the Hermes terminal tool:
```bash
claude -p "task description" --allowedTools "Read,Edit,Bash" --max-turns 20
```

Print mode (`-p`) is preferred for automation — non-interactive, structured JSON output.

---

## Visibility Protocol

**Claude Code → Hermes:**
- Every `Write`, `Edit`, `NotebookEdit` is auto-logged to `shared/activity-log.md` via a PostToolUse hook
- For non-obvious decisions, also append a short prose note to `shared/notes.md`

**Hermes → Claude Code:**
- Run `bash ~/antigravity/scripts/refresh-hermes-state.sh` to dump live state into `shared/hermes-state.md`
- For ad-hoc context, append to `shared/notes.md`

**At session start, read:**
1. `shared/hermes-state.md` (when it was last refreshed — if >24h old, re-run the refresh script)
2. The last ~30 lines of `shared/activity-log.md`
3. `shared/notes.md` if anything's relevant

---

## Self-Improvement Protocol

After significant work, update memory at `~/.claude/projects/-home-travissteel-antigravity/memory/` if you learned something non-obvious about:
- The Hermes stack (new crons, config changes, broken integrations)
- The user's preferences or working style
- The codebase / infrastructure

This CLAUDE.md should also be updated when the system materially changes — new cron added, new project started, dashboard layer built, etc. Treat it as a living document.

---

## Conventions

- All shared files use **markdown** unless they need structure (`goals.json`)
- Activity log is append-only, chronological (latest at bottom) — scan with `tail -n 30 shared/activity-log.md`
- Times are AEST (system timezone)
- Don't write secrets into `shared/` — keep them in `~/.hermes/.env` (chmod 600)
