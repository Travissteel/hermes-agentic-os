---
name: daily-change-report
category: ops
description: "Append shipped commits, verified deployments, and blockers to one ledger, and report only what is new since the previous report."
triggers:
  - "daily change report"
  - "what shipped"
  - "new blockers"
  - "change ledger"
version: 1.0.0
author: Travis (local)
license: MIT
metadata:
  hermes:
    tags: [Ops, Report, Ledger]
    related_skills: [x-weekly-draft]
---

# Daily change report

One ledger: `~/antigravity/shared/change-log.jsonl` (gitignored, created on first append). Do not start a second log.

Record an event when an automation ships a commit, verifies a deployment, or hits a new blocker:

```bash
python3 ~/antigravity/scripts/content/change_log.py add --kind commit --summary "Ship voice check" --ref <sha>
python3 ~/antigravity/scripts/content/change_log.py add --kind deployment --summary "HF workers" --target hypnotherapy-finder --verified
python3 ~/antigravity/scripts/content/change_log.py add --kind blocker --summary "GSC token expired"
```

Deployment entries must pass `--verified` or `--unverified`. Unverified deployments show up labelled unverified.

The daily report is exception-only. It lists commits, deployments, and blockers appended since the previous report, then advances a cursor at `shared/change-report-cursor.json`. It does not repeat older items.

```bash
python3 ~/antigravity/scripts/content/daily_change_report.py
```

When there is nothing new the report says `No new changes or blockers.` Preview without moving the cursor by adding `--no-mark`.

Morning goal triage should paste that stdout in as its changes-and-blockers section and should not add older items underneath. This command does not send Telegram, email, or Postiz. The existing Postiz "Daily work report" cron is a separate stats post; do not rewrite it from this skill.

Do not edit or trigger `ops-event-harvest` or the 8am/1pm/6pm content-harvest sessions.
