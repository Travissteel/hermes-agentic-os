"""Ledger append, and a report that shows only items since the previous report."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import _path  # noqa: F401

from content.change_log import add_entry, build_report
from content.paths import REPO_ROOT


class ChangeLogTests(unittest.TestCase):
    def test_report_is_exception_only(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            ledger = root / "change-log.jsonl"
            cursor = root / "cursor.json"
            add_entry(ledger, kind="commit", summary="Ship voice check", ref="abc123")
            add_entry(ledger, kind="blocker", summary="GSC token expired")

            first = build_report(ledger, cursor, mark=True)
            self.assertIn("Ship voice check", first)
            self.assertIn("abc123", first)
            self.assertIn("GSC token expired", first)
            self.assertIn("## Changes", first)
            self.assertIn("## Blockers", first)

            second = build_report(ledger, cursor, mark=True)
            self.assertIn("No new changes or blockers.", second)
            self.assertNotIn("Ship voice check", second)
            self.assertNotIn("GSC token expired", second)

            add_entry(
                ledger,
                kind="deployment",
                summary="HF workers",
                target="hypnotherapy-finder",
                verified=True,
            )
            third = build_report(ledger, cursor, mark=True)
            self.assertIn("HF workers", third)
            self.assertIn("verified", third)
            self.assertNotIn("Ship voice check", third)
            self.assertNotIn("GSC token expired", third)
            self.assertNotIn("## Blockers", third)

    def test_cli_round_trip(self) -> None:
        record = REPO_ROOT / "scripts" / "content" / "change_log.py"
        report = REPO_ROOT / "scripts" / "content" / "daily_change_report.py"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            ledger = root / "change-log.jsonl"
            cursor = root / "cursor.json"
            common = ["--ledger", str(ledger), "--cursor", str(cursor)]
            added = subprocess.run(
                [sys.executable, str(record), "add", "--kind", "commit", "--summary", "Ship voice check", "--ref", "abc123", *common],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(added.returncode, 0, added.stderr)
            entry = json.loads(added.stdout)
            self.assertEqual(entry["kind"], "commit")
            self.assertTrue(ledger.is_file())
            self.assertEqual(len(ledger.read_text(encoding="utf-8").splitlines()), 1)

            subprocess.run(
                [sys.executable, str(record), "add", "--kind", "blocker", "--summary", "GSC token expired", *common],
                check=True,
                capture_output=True,
                text=True,
            )
            first = subprocess.run(
                [sys.executable, str(report), *common],
                check=True,
                capture_output=True,
                text=True,
            )
            self.assertIn("Ship voice check", first.stdout)
            self.assertIn("GSC token expired", first.stdout)

            second = subprocess.run(
                [sys.executable, str(report), *common],
                check=True,
                capture_output=True,
                text=True,
            )
            self.assertIn("No new changes or blockers.", second.stdout)
            self.assertNotIn("Ship voice check", second.stdout)
            self.assertNotIn("GSC token expired", second.stdout)

    def test_deployment_requires_verified_flag(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            ledger = Path(tmp) / "log.jsonl"
            with self.assertRaises(ValueError):
                add_entry(ledger, kind="deployment", summary="HF workers")


if __name__ == "__main__":
    unittest.main()
