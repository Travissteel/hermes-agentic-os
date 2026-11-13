#!/usr/bin/env python3
"""Point the weekly-draft and morning-triage cron prompts at the repo checks.

Dry-run unless --apply is passed. Never creates jobs, never delivers a
message, and never edits ops-event-harvest, content-harvest, or leadgen crons.
The laptop jobs.json is not in this repo; if the file is absent this exits
without writing.
"""

from __future__ import annotations

import argparse
import copy
import json
import re
import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parents[1]
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from content.paths import REPO_ROOT

VOICE_MARKER = "<!-- content-lead-voice-override -->"
REPORT_MARKER = "<!-- daily-change-report -->"
PROTECTED = re.compile(
    r"ops-event-harvest|content-harvest|event-harvest|leadgen-launch|leadgen-nightly",
    re.IGNORECASE,
)
WEEKLY = re.compile(r"weekly\s+draft", re.IGNORECASE)
TRIAGE = re.compile(r"morning[- ]goal[- ]triage", re.IGNORECASE)


def voice_block(repo: Path) -> str:
    voice = repo / "content" / "voice" / "content-lead-voice-prompt.txt"
    prepare = repo / "scripts" / "content" / "prepare_research_inputs.py"
    gate = repo / "scripts" / "content" / "weekly_draft_gate.py"
    return (
        f"{VOICE_MARKER}\n"
        "Draft X long-form posts with the approved Content Lead voice. "
        "Read this file and follow it verbatim:\n"
        f"{voice}\n\n"
        "Before drafting, run:\n"
        f"python3 {prepare}\n\n"
        "If that command prints one WARNING line, include that line once in the run output "
        "and use the dated last-valid inputs it names. Do not draft from an empty input without that warning.\n\n"
        "After writing drafts to the existing scheduler file "
        "(~/.hermes/drafts/<date>_week.json unless this job already names a different file), run:\n"
        f"python3 {gate} check --file <that drafts file>\n\n"
        "Do not leave a rejected draft marked approved. named_contrast and reframe hooks are banned. "
        "Keep playbook structure only where it does not conflict with the voice prompt HARD BANS. "
        "Full-length posts are allowed on X Premium. Do not publish, schedule, or post.\n"
        "<!-- end content-lead-voice-override -->\n\n"
    )


def report_block(repo: Path) -> str:
    report = repo / "scripts" / "content" / "daily_change_report.py"
    record = repo / "scripts" / "content" / "change_log.py"
    return (
        f"{REPORT_MARKER}\n"
        f"Run: python3 {report}\n"
        "Put that stdout in the report as the changes-and-blockers section. "
        "It lists only commits, verified deployments, and blockers recorded since the previous report. "
        "Do not add older items. "
        f"Record new ones with python3 {record} add "
        "(kind commit, deployment, or blocker). "
        "Do not publish, schedule, or post, and do not send any message beyond this job's existing delivery.\n"
        "<!-- end daily-change-report -->\n\n"
    )


def plan_updates(jobs: list[dict], repo: Path) -> tuple[list[dict], list[str]]:
    """Return a copied job list and notes. Protected jobs are returned unchanged."""
    updated = copy.deepcopy(jobs)
    notes: list[str] = []
    saw_weekly = False
    saw_triage = False
    for job in updated:
        name = str(job.get("name") or "")
        if PROTECTED.search(name):
            notes.append(f"untouched (protected): {name}")
            continue
        if WEEKLY.search(name):
            saw_weekly = True
            changed = _prepend(job, voice_block(repo), VOICE_MARKER)
            skill_added = _add_skill(job, "x-weekly-draft")
            state = "update" if changed or skill_added else "already wired"
            notes.append(f"{state} weekly draft job: {name}")
            continue
        if TRIAGE.search(name):
            saw_triage = True
            changed = _prepend(job, report_block(repo), REPORT_MARKER)
            skill_added = _add_skill(job, "daily-change-report")
            state = "update" if changed or skill_added else "already wired"
            notes.append(f"{state} morning triage job: {name}")
    if not saw_weekly:
        notes.append("Weekly draft generator job not found; no cron was created.")
    if not saw_triage:
        notes.append("morning-goal-triage job not found; no cron was created.")
    return updated, notes


def load_jobs(path: Path) -> tuple[list[dict], dict | None]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        if not all(isinstance(item, dict) for item in data):
            raise ValueError(f"{path}: job list contains a non-object")
        return data, None
    if isinstance(data, dict) and isinstance(data.get("jobs"), list):
        jobs = data["jobs"]
        if not all(isinstance(item, dict) for item in jobs):
            raise ValueError(f"{path}: jobs contains a non-object")
        return jobs, data
    raise ValueError(f"{path}: unrecognised jobs.json shape")


def save_jobs(path: Path, jobs: list[dict], wrapper: dict | None) -> None:
    if wrapper is None:
        payload: object = jobs
    else:
        payload = dict(wrapper)
        payload["jobs"] = jobs
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def _prepend(job: dict, block: str, marker: str) -> bool:
    prompt = str(job.get("prompt") or "")
    if marker in prompt:
        return False
    job["prompt"] = block + prompt
    return True


def _add_skill(job: dict, name: str) -> bool:
    raw = job.get("skills")
    if raw is None:
        skills = [job["skill"]] if job.get("skill") else []
    elif isinstance(raw, str):
        skills = [raw]
    else:
        skills = [str(item) for item in raw]
    changed = name not in skills
    if changed:
        skills.append(name)
    job["skills"] = skills
    if not job.get("skill"):
        job["skill"] = skills[0] if skills else None
    return changed


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Dry-run or apply weekly-draft and triage prompt blocks.")
    parser.add_argument("--jobs", type=Path, default=Path.home() / ".hermes/cron/jobs.json")
    parser.add_argument("--repo", type=Path, default=REPO_ROOT)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args(argv)
    if not args.jobs.is_file():
        print(f"jobs.json not found at {args.jobs}")
        print("Nothing was changed.")
        print(
            "On the laptop, pull this repo, then run this script with --apply "
            "so the Weekly draft generator and morning-goal-triage prompts pick up the new checks."
        )
        return 0
    try:
        jobs, wrapper = load_jobs(args.jobs)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    updated, notes = plan_updates(jobs, args.repo)
    for note in notes:
        print(note)
    if not args.apply:
        print("dry-run; pass --apply to write jobs.json")
        return 0
    save_jobs(args.jobs, updated, wrapper)
    print(f"wrote {args.jobs}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
