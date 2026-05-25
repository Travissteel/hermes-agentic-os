---
name: antigravity
category: autonomous-ai-agents
description: "Delegate fast / long-context / parallel-agent work to Google's Antigravity CLI (agy), powered by Gemini 3.5 Flash. Use when speed, 2M-token context, or Gemini's free-via-subscription quota matters."
triggers:
  - "delegate to Antigravity"
  - "delegate to agy"
  - "use Gemini 3.5 Flash"
  - "summarize long context with Gemini"
  - "run multi-agent task with Antigravity"
  - "use Google AI Premium quota"
  - "fast cheap one-shot via Gemini"
version: 1.0.0
author: Travis (local)
license: MIT
metadata:
  hermes:
    tags: [Coding-Agent, Gemini, Google, Long-Context, Multi-Agent, Print-Mode, Automation]
    related_skills: [claude-code, codex, hermes-agent]
---

# Antigravity (`agy`) — Hermes Orchestration Guide

Delegate work to [Google Antigravity](https://antigravity.google/) — the multi-agent development platform launched at I/O 2026 that replaced the Gemini CLI on June 18, 2026. Antigravity runs **Gemini 3.5 Flash (Medium)** by default and is included in the user's existing **Google One AI Premium** subscription (no extra cost, no API key needed once signed in).

## Prerequisites — verify before delegating

```
terminal(command="agy --version", timeout=5)         # should print 1.0.2 or later
terminal(command="ls -la ~/.gemini/antigravity-cli/implicit/", timeout=2)  # token file present = signed in
```

If `implicit/` is empty or missing, the user has not signed in. Tell the user to run `agy` once in their own terminal to complete the Google OAuth flow (it opens a visible browser; agy CANNOT auth via Hermes's headless context — the browser flow will time out invisibly after 30s).

## Two Orchestration Modes

### Mode 1: Print Mode (`-p`) — PREFERRED

One-shot, non-interactive, exits cleanly. Mirrors `claude -p` / `codex -p` patterns.

```
terminal(command="agy -p 'Summarise the contents of CHANGELOG.md in 3 bullet points' --print-timeout 60s", workdir="/path/to/project", timeout=70)
```

Typical latency: **~8–15 seconds** for short prompts. Allow at least 60s timeout for non-trivial tasks (long context, multi-file analysis).

**When to choose `agy` over `claude-code` or `codex`:**

| Task | Best agent | Why |
|---|---|---|
| Multi-file code refactor, deep architecture work | **claude-code** | Claude is strongest at complex coding |
| General Hermes orchestration, content pipeline, scheduled work | **codex** (default) | already running, no spin-up cost |
| **Long-context summarization** (single file > 50KB, full repo digest) | **agy** | Gemini's 2M-token context |
| **Fast cheap one-shots** (classification, extraction, translation) | **agy** | Flash is faster + cheaper than gpt-5.2 or claude-sonnet |
| Parallel work across many similar inputs | **agy** | Gemini quota under Premium sub is generous |
| Image / vision tasks | **agy** | Gemini multimodal is built in |

### Mode 2: Interactive PTY via tmux

Use when Hermes needs to do multi-turn work, watch the trajectory, or use Antigravity slash commands. The pattern mirrors the `claude-code` skill exactly — see that skill's "Interactive PTY via tmux" section for the orchestration template. Substitute `agy` for `claude` and `agy-work` for `claude-work` as the tmux session name.

Note: `agy` interactive mode opens a TUI (Bubble Tea framework) that requires a real TTY. Inside `tmux` it works fine; running it from a regular `terminal()` call without tmux will fail with `error opening TTY`.

## Useful Flags

| Flag | Purpose |
|---|---|
| `-p`, `--print` | Non-interactive one-shot (this is what you want most of the time) |
| `--print-timeout 5m` | Wait up to 5 minutes for response (default is 5m, override only if needed) |
| `--continue`, `-c` | Continue the most recent conversation |
| `--conversation <ID>` | Resume a specific conversation by id |
| `--add-dir <PATH>` | Add a directory to the workspace (repeatable) — gives `agy` filesystem context |
| `--sandbox` | Run with terminal restrictions enabled (use for untrusted instructions) |
| `--dangerously-skip-permissions` | Auto-approve all tool requests (avoid unless task is well-scoped) |

## Workspace Context

When delegating a task that needs file context, use `--add-dir`:

```
terminal(command="agy -p 'Find every TODO in the codebase and explain priority' --add-dir /home/travissteel/sites/business-software-finder --print-timeout 120s", timeout=130)
```

`agy` also picks up `~/.antigravitycli` project files automatically when run from a project directory (the user's `~/antigravity/` workspace is a registered project — id `4fe5dd83-c759-4913-a809-04099e6ba508`).

## Plugins

```
terminal(command="agy plugin list", timeout=5)
terminal(command="agy plugin install <name>", timeout=30)
```

Plugins extend agent capabilities (e.g. additional tools, file types, integrations). Check what's installed before assuming a capability exists.

## Output Handling

Unlike `claude -p`, `agy -p` does **not** emit structured JSON by default — it prints prose. If you need structured output, instruct it in the prompt:

```
agy -p 'Return ONLY valid JSON matching {"items": [string]} — no prose, no markdown fences.'
```

For session/token tracking, check the cli.log:

```
terminal(command="tail -20 ~/.gemini/antigravity-cli/cli.log", timeout=2)
```

## Latency Note

End-to-end Hermes-delegates-to-agy via this skill measured at **~10 minutes** for a trivial "say one word" task (2026-05-25 baseline). That is the full Hermes agent loop (parse → load skill → plan → terminal tool → wait for agy → parse output → final response), not raw `agy -p` (~10s). **This skill is appropriate for automation / cron contexts** where end-to-end latency doesn't matter. For interactive use, call `agy -p` directly without going through Hermes.

## Pitfalls

- **Headless auth fails silently.** Do not invoke `agy -p` from a fresh install with no token — it launches headless Chrome that the user can't see and times out at 30s with no useful error. Always verify `~/.gemini/antigravity-cli/implicit/` is non-empty first.
- **TUI mode requires a TTY.** Interactive `agy` (no `-p`) without tmux fails with `bubbletea: error opening TTY`. Always wrap in tmux for interactive use.
- **First-print latency is ~10s minimum.** Don't set `--print-timeout` below 30s for anything non-trivial.
- **`agy` is separate from the Antigravity IDE** (`~/.antigravity/`). They share a parent account but have independent auth and config. Don't conflate them.
- **Quota is shared with Gemini Advanced** under Google One AI Premium. Heavy `agy` usage will eat into the same monthly quota that powers Gemini in Gmail/Docs/etc. — be mindful for parallel batch jobs.

## Related Reading

- Official docs: https://antigravity.google/
- I/O 2026 launch: https://developers.googleblog.com/build-with-google-antigravity-our-new-agentic-development-platform/
- Gemini CLI transition: https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/
- Companion skills: `claude-code` (for deep coding), `codex` (Hermes default), `hermes-agent` (self-delegation)
