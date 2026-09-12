# Hermes cron fixes — 12 September 2026

Source snapshots and regression tests for the installed scripts in `~/.hermes/scripts/`.
Configuration changes were applied through Hermes's locked cron update API. Existing working model overrides, paused publishers, site registry changes and workspace edits were preserved.

## Installed behavior

- Default and previously unpinned agent jobs use `gpt-5.6-terra`; HF retains `gpt-5.5`. A minimal request through the existing OpenAI Codex subscription returned `MODEL_OK`. Official model reference: https://developers.openai.com/api/docs/models/gpt-5.6-terra . Hermes's existing model/provider preflight is enabled by default.
- Research rejects missing sources and error placeholders. Weekly synthesis requires 10 usable hooks, 5 drafts and 2 promos. Invalid generation exits nonzero before replacing a good artifact. Old broken artifacts remain historical evidence and are excluded as research inputs.
- Scheduling runs once as a script, without a reporting model. Missing quality flags do not approve posts. A separate timestamped human approval record includes a SHA-256 digest of the exact draft. Editing the draft invalidates approval. Wrong-week, past-due and unknown-platform posts are blocked; X posts are blocked while the direct publisher is paused. Failed duplicate checks abort, and ambiguous POST failures are not retried.
- `leadgen_launch_preflight.py` imports each site's typed data with Bun and counts actual area, service, FAQ and blog entries. It returns `wakeAgent:false` when no live site is below its target. Verified counts: Ballarat restumping 22, Bendigo restumping 21, Townsville mechanic 15, Ballarat electrician 25; each target is 15.
- HF worklists carry stable work IDs and a JSON baseline. Targets with a recorded change wait 14 days before becoming eligible again. The HF prompt must stop on failed worklist regeneration rather than using stale cached data. Other site jobs record baseline and change evidence and check the same review interval before reworking a target.
- `record_site_change.py` checks clean Git state and absence of unpushed commits before writing evidence. Deployment IDs are recorded separately and are not treated as independent live verification. The legacy-report harvester checks commit existence, upstream ancestry and commit date; old regex-based ship counts are no longer used by the dashboard.
- DM counts use source event timestamps. Send-node completion is separate from provider-confirmed delivery. Paused jobs are listed for review, not automatically labelled critical. Active failures still affect health.
- A script-only health watchdog runs at :20 and :50, reports changed repeated-failure/delivery-error signatures and recovery through the existing Telegram destination, and stays silent for unchanged health.

## Approval from Telegram

Only after Travis explicitly approves the reviewed draft, Hermes's interactive session runs:

```sh
python3 ~/.hermes/scripts/approve_week_draft.py /path/to/YYYY-MM-DD_week.json --approved-by Travis --evidence telegram-message-reference
```

This records consent; it does not publish. The generator never grants human approval. The handoff is recorded in Hermes memory. `approved` remains a legacy quality field; new drafts also include `quality_passed`.

## Validation

```sh
python3 -m unittest discover -s scripts/hermes-cron/tests -v
```

13 tests passed: invalid captures, empty synthesis, good-artifact preservation, approval binding, absent approval, source timestamps, cooldown and expiry, Sunday scheduling, legitimate login wording, and ambiguous publish-failure handling. Scripts compiled successfully. Live checks covered model access, all four launch counts, event harvesting, dashboard refresh, and the HF permission failure. No publishing or deployment job was manually triggered.

## Outstanding access and operational issues

- Search Console lists `sc-domain:hypnotherapy-finder.com` as `siteUnverifiedUser` for the configured service account; queries return HTTP 403. Restore property access for `antigravity-gsc-connect@hypnotherapy-finder.iam.gserviceaccount.com`. Then run `~/.hermes/venvs/gsc/bin/python ~/.hermes/scripts/hf_gsc_worklist.py --days 90` to verify. No account permissions were changed.
- The refreshed event log reports 12 DM scan failures on September 11. This upgrade fixes their visibility; it does not repair the n8n DM workflow.
- Failed cron history remains intact until jobs actually run successfully; the dashboard may remain critical. Research and publication outcomes will be verified by subsequent scheduled runs, not inferred from the model smoke test.
- X direct publishing and the two other previously paused jobs remain paused. No old backlog was replayed.

## Backup and maintenance

Original configuration, cron jobs, changed scripts and the memory handoff are backed up at `~/.hermes/backups/cron-upgrade-20260912-091837/`. Do not overwrite live jobs.json with the backup while the scheduler is running; use `cron.jobs.update_job` for scoped restoration. Historical output and event files were retained.

For future edits, update these source snapshots, run tests, then copy changed scripts to `~/.hermes/scripts/`. Keep the installed scripts and source snapshots in sync.
