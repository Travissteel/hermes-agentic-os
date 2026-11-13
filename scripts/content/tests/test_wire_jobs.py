"""Cron prompt wiring stays off protected harvest and leadgen jobs."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import _path  # noqa: F401

from content.paths import REPO_ROOT
from content.wire_hermes_jobs import REPORT_MARKER, VOICE_MARKER, plan_updates


JOBS = {
    "jobs": [
        {
            "id": "weekly",
            "name": "Weekly draft generator",
            "prompt": "Use ~/brain/Content/Long_Form_X_Post_Playbook.md. Hook taxonomy includes named_contrast and reframe.",
            "skills": ["content"],
            "skill": "content",
            "schedule": "0 7 * * 0",
            "no_agent": False,
        },
        {
            "id": "triage",
            "name": "morning-goal-triage",
            "prompt": "Triage goals and send the usual brief.",
            "skills": [],
            "schedule": "0 7 * * *",
        },
        {
            "id": "harvest",
            "name": "ops-event-harvest",
            "prompt": "DO NOT TOUCH harvest prompt",
            "schedule": "0 9 * * 1",
        },
        {
            "id": "sessions",
            "name": "content-harvest 8am",
            "prompt": "DO NOT TOUCH 8am content harvest",
            "schedule": "0 8 * * *",
        },
        {
            "id": "leadgen",
            "name": "leadgen-launch",
            "prompt": "Launch burst. Leave this prompt alone.",
            "schedule": "0 8,13,18 * * *",
            "script": "leadgen",
        },
    ]
}


class WireJobTests(unittest.TestCase):
    def test_apply_updates_only_allowlisted_jobs(self) -> None:
        script = REPO_ROOT / "scripts" / "content" / "wire_hermes_jobs.py"
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "jobs.json"
            path.write_text(json.dumps(JOBS), encoding="utf-8")
            original = path.read_text(encoding="utf-8")
            dry = subprocess.run(
                [sys.executable, str(script), "--jobs", str(path), "--repo", str(REPO_ROOT)],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(dry.returncode, 0, dry.stderr)
            self.assertIn("dry-run", dry.stdout)
            self.assertEqual(path.read_text(encoding="utf-8"), original)

            applied = subprocess.run(
                [sys.executable, str(script), "--jobs", str(path), "--repo", str(REPO_ROOT), "--apply"],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(applied.returncode, 0, applied.stderr)
            saved = json.loads(path.read_text(encoding="utf-8"))
            by_name = {job["name"]: job for job in saved["jobs"]}

            weekly = by_name["Weekly draft generator"]
            self.assertIn(VOICE_MARKER, weekly["prompt"])
            self.assertIn("content-lead-voice-prompt.txt", weekly["prompt"])
            self.assertIn("named_contrast and reframe hooks are banned", weekly["prompt"])
            self.assertIn(JOBS["jobs"][0]["prompt"], weekly["prompt"])
            self.assertEqual(weekly["skills"], ["content", "x-weekly-draft"])
            self.assertEqual(weekly["skill"], "content")
            self.assertEqual(weekly["schedule"], "0 7 * * 0")

            triage = by_name["morning-goal-triage"]
            self.assertIn(REPORT_MARKER, triage["prompt"])
            self.assertIn("daily_change_report.py", triage["prompt"])
            self.assertIn("daily-change-report", triage["skills"])
            self.assertIn("Triage goals", triage["prompt"])

            for name in ("ops-event-harvest", "content-harvest 8am", "leadgen-launch"):
                before = next(job for job in JOBS["jobs"] if job["name"] == name)
                after = by_name[name]
                self.assertEqual(after.get("prompt"), before.get("prompt"))
                self.assertEqual(after.get("schedule"), before.get("schedule"))
                self.assertNotIn("skills", after)

            again = subprocess.run(
                [sys.executable, str(script), "--jobs", str(path), "--repo", str(REPO_ROOT), "--apply"],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertIn("already wired weekly draft job", again.stdout)
            reloaded = json.loads(path.read_text(encoding="utf-8"))
            weekly_again = next(job for job in reloaded["jobs"] if job["name"] == "Weekly draft generator")
            self.assertEqual(weekly_again["prompt"].count(VOICE_MARKER), 1)

    def test_missing_jobs_file_changes_nothing(self) -> None:
        script = REPO_ROOT / "scripts" / "content" / "wire_hermes_jobs.py"
        missing = Path(tempfile.gettempdir()) / "does-not-exist-hermes-jobs.json"
        if missing.exists():
            missing.unlink()
        proc = subprocess.run(
            [sys.executable, str(script), "--jobs", str(missing)],
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("Nothing was changed.", proc.stdout)
        self.assertFalse(missing.exists())

    def test_plan_refuses_protected_name_even_if_it_looks_like_drafting(self) -> None:
        jobs = [
            {
                "name": "content-harvest weekly draft",
                "prompt": "leave me",
            }
        ]
        updated, notes = plan_updates(jobs, REPO_ROOT)
        self.assertEqual(updated[0]["prompt"], "leave me")
        self.assertTrue(any("untouched (protected)" in note for note in notes))
        self.assertTrue(any("not found" in note for note in notes))


if __name__ == "__main__":
    unittest.main()
