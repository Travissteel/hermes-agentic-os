---
name: x-weekly-draft
category: content
description: "Draft Travis's weekly X long-form posts with the approved Content Lead voice and reject hard-ban violations before they are saved."
triggers:
  - "weekly x draft"
  - "long-form x post"
  - "sunday draft batch"
  - "content lead voice"
version: 1.0.0
author: Travis (approved voice, 27 Oct 2026)
license: MIT
metadata:
  hermes:
    tags: [Content, X, Drafts, Voice]
    related_skills: [daily-change-report]
---

# Weekly X long-form drafts

Use this for the Sunday weekly draft generator only. Do not publish, schedule, or send anything to Postiz.

The approved voice file is the drafting standard. Read it and follow it verbatim:

`~/antigravity/content/voice/content-lead-voice-prompt.txt`

If this checkout is not at `~/antigravity`, use the `content/voice/content-lead-voice-prompt.txt` inside the hermes-agentic-os checkout.

## What overrides the old playbook

`~/brain/Content/Long_Form_X_Post_Playbook.md` may still be used for anatomy and checklist structure. Drop every hook that is `named_contrast`, `reframe`, or any contrast-reframe (`not X, it's Y`, `X isn't Y. It's Z`, `Not X. Y.`, `less X, more Y`, `This isn't about X`). The voice prompt's HARD BANS win.

Full-length posts are allowed on X Premium (about 4000 characters). Do not enforce the 80-300 word line as a cap.

Print the prompt the model should see:

```bash
python3 ~/antigravity/scripts/content/weekly_draft_gate.py prompt
```

## Research inputs

Before drafting, resolve performance data and the X research capture:

```bash
python3 ~/antigravity/scripts/content/prepare_research_inputs.py
```

- One `OK:` line means both inputs were fresh and non-empty.
- One `WARNING:` line means something was empty, stale, or missing. Include that exact line once in the run output. Draft from the manifest entries whose `label` starts with `last valid capture from`, and keep that date visible. Do not silently switch files.
- Exit code 2 means there is no last-valid capture. Stop drafting that input and leave the warning in the run output.

The manifest is `~/antigravity/shared/content-inputs/resolved.json` (gitignored). Primary paths in `content/research-inputs.json` are hypotheses until the laptop files are confirmed. Override them with `CONTENT_PERFORMANCE_INPUT` and `CONTENT_X_RESEARCH_INPUT`.

## After drafting

Write posts to the drafts file the Sunday scheduler already reads (on the laptop that is `~/.hermes/drafts/<date>_week.json` — do not invent a second folder). Then:

```bash
python3 ~/antigravity/scripts/content/weekly_draft_gate.py check --file ~/.hermes/drafts/<date>_week.json
```

If the checker prints `REJECT`, do not mark that draft approved. Fix it against the voice prompt and check again. A passing draft is not permission to post.

## Leave these alone

Do not edit or trigger `ops-event-harvest`, the 8am/1pm/6pm content-harvest sessions, `leadgen-launch`, or `leadgen-nightly`.
