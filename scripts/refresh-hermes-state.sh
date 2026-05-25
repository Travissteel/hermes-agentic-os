#!/bin/bash
# Refresh ~/antigravity/shared/hermes-state.md with a live Hermes snapshot.
# Safe to run from anywhere, anytime — fully idempotent. Hermes can run this
# from a cron job; Claude Code can run it on demand.
#
# We deliberately don't use `set -e` / `pipefail`: a section failing
# (e.g. SIGPIPE from `head` closing a long pipe early) should not abort
# the whole refresh. Each section degrades gracefully.
set -u

OUT="$HOME/antigravity/shared/hermes-state.md"
TS=$(date '+%Y-%m-%d %H:%M %Z')

gateway_status=$(systemctl --user is-active hermes-gateway.service 2>/dev/null || echo "unknown")
webui_status=$(systemctl --user is-active hermes-webui.service 2>/dev/null || echo "unknown")
hermes_version=$(hermes --version 2>/dev/null | head -1 || echo "unknown")

{
  echo "# Hermes State Snapshot"
  echo ""
  echo "*Auto-generated $TS by \`scripts/refresh-hermes-state.sh\`*"
  echo ""
  echo "## Version & Services"
  echo ""
  echo "| Item | Value |"
  echo "|---|---|"
  echo "| Hermes | $hermes_version |"
  echo "| hermes-gateway | $gateway_status |"
  echo "| hermes-webui | $webui_status (http://127.0.0.1:8787) |"
  echo "| Model | gpt-5.2 via openai-codex |"
  echo ""
  echo "## Active Crons"
  echo ""
} > "$OUT"

python3 - "$OUT" << 'PYEOF'
import json
import sys
from pathlib import Path

out = Path(sys.argv[1])
jobs_path = Path.home() / ".hermes" / "cron" / "jobs.json"

with out.open("a") as f:
    try:
        data = json.loads(jobs_path.read_text())
        jobs = data.get("jobs", []) if isinstance(data, dict) else data
    except Exception as e:
        f.write(f"(error reading {jobs_path}: {e})\n")
        sys.exit(0)

    enabled = [j for j in jobs if j.get("enabled", True)]
    if not enabled:
        f.write("(no enabled crons)\n")
    else:
        f.write("| Name | Schedule | Script | Mode | Last run | Status |\n")
        f.write("|---|---|---|---|---|---|\n")
        for j in enabled:
            name = j.get("name", "?")
            sched = j.get("schedule", "?")
            if isinstance(sched, dict):
                sched = sched.get("display") or sched.get("expr") or str(sched)
            script = j.get("script") or "(agent)"
            mode = "no-agent" if j.get("no_agent") else "agent"
            last = j.get("last_run_at") or j.get("last_run") or "?"
            if isinstance(last, str) and "T" in last:
                last = last[:16].replace("T", " ")
            status = j.get("last_status") or j.get("last_result") or "?"
            f.write(f"| {name} | `{sched}` | `{script}` | {mode} | {last} | {status} |\n")
PYEOF

{
  echo ""
  echo "## Recent Sessions (5 most recent)"
  echo ""
  if compgen -G "$HOME/.hermes/sessions/*.json" > /dev/null; then
    ls -lt "$HOME"/.hermes/sessions/*.json 2>/dev/null \
      | head -5 \
      | awk '{print "- `" $9 "` — " $6, $7, $8}' \
      | sed "s|$HOME|~|g"
  else
    echo "(no sessions found)"
  fi
  echo ""
  echo "## Active Skills"
  echo ""
  if command -v hermes >/dev/null 2>&1; then
    # Use a tmpfile to avoid SIGPIPE from `head` killing the upstream pipe
    # under `set -o pipefail`.
    tmp=$(mktemp)
    hermes skills list 2>/dev/null > "$tmp" || true
    awk -F'│' '/enabled/ {gsub(/^ +| +$/, "", $2); gsub(/^ +| +$/, "", $3); print "- **" $2 "** (" $3 ")"}' "$tmp" | sed -n '1,20p'
    rm -f "$tmp"
  else
    echo "(hermes CLI not on PATH)"
  fi
  echo ""
} >> "$OUT"

echo "Refreshed → $OUT"
