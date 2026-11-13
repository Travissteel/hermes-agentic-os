"""Empty and stale research inputs fall back to a dated last-valid capture."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

import _path  # noqa: F401

from content.input_guard import combined_warning, resolve_all
from content.paths import REPO_ROOT

NOW = datetime(2026, 11, 13, 1, 0, tzinfo=timezone.utc)


class InputGuardTests(unittest.TestCase):
    def setUp(self) -> None:
        self._env = {
            key: os.environ.pop(key)
            for key in ("CONTENT_PERFORMANCE_INPUT", "CONTENT_X_RESEARCH_INPUT")
            if key in os.environ
        }

    def tearDown(self) -> None:
        os.environ.update(self._env)

    def test_empty_primary_uses_dated_snapshot_and_one_warning(self) -> None:
        with self._workspace() as (root, config):
            primary = root / "performance.json"
            primary.write_text("{}\n", encoding="utf-8")
            snapshot = root / "last-valid.json"
            snapshot.write_text(
                json.dumps(
                    {
                        "captured_at": "2026-11-02T06:00:00Z",
                        "source_date": "2026-11-02",
                        "source_path": "/previous/performance.json",
                        "payload": {"posts": [{"text": "kept"}]},
                    }
                ),
                encoding="utf-8",
            )
            # Touch the snapshot so mtime is "now". The label must stay 2 Nov.
            config["inputs"] = [
                self._spec(root, "performance", primary, snapshot),
                self._fresh_spec(root, "x_research"),
            ]
            results, warning = resolve_all(config, now=NOW)
            performance = results[0]
            self.assertEqual(performance.content, {"posts": [{"text": "kept"}]})
            self.assertEqual(performance.source_date, "2026-11-02")
            self.assertEqual(performance.label, "last valid capture from 2026-11-02")
            self.assertTrue(performance.used_fallback)
            self.assertEqual(performance.reason, "empty")
            self.assertIsNotNone(warning)
            assert warning is not None
            self.assertEqual(warning.count("WARNING"), 1)
            self.assertNotIn("\n", warning)
            self.assertIn("performance: empty, using last valid capture from 2026-11-02", warning)
            self.assertNotIn("x_research", warning)

    def test_stale_embedded_date_is_labelled_even_if_mtime_is_new(self) -> None:
        with self._workspace() as (root, config):
            primary = root / "x_research.json"
            primary.write_text(
                json.dumps({"generated_at": "2026-10-01T00:00:00Z", "ideas": ["old"]}),
                encoding="utf-8",
            )
            snapshot = root / "x-snap.json"
            config["inputs"] = [self._spec(root, "x_research", primary, snapshot, max_age=48)]
            results, warning = resolve_all(config, now=NOW)
            item = results[0]
            self.assertEqual(item.content, {"generated_at": "2026-10-01T00:00:00Z", "ideas": ["old"]})
            self.assertEqual(item.source_date, "2026-10-01")
            self.assertEqual(item.reason, "stale")
            self.assertIn("using last valid capture from 2026-10-01", warning or "")
            saved = json.loads(snapshot.read_text(encoding="utf-8"))
            self.assertEqual(saved["source_date"], "2026-10-01")

    def test_fresh_input_has_no_warning_and_seeds_snapshot(self) -> None:
        with self._workspace() as (root, config):
            primary = root / "performance.json"
            primary.write_text(
                json.dumps({"generated_at": "2026-11-12T00:00:00Z", "posts": ["fresh"]}),
                encoding="utf-8",
            )
            snapshot = root / "snap.json"
            config["inputs"] = [self._spec(root, "performance", primary, snapshot)]
            results, warning = resolve_all(config, now=NOW)
            self.assertIsNone(warning)
            self.assertFalse(results[0].used_fallback)
            self.assertEqual(results[0].label, "fresh capture 2026-11-12")
            self.assertTrue(snapshot.is_file())

            primary.write_text("{}\n", encoding="utf-8")
            again, warning = resolve_all(config, now=NOW)
            self.assertEqual(again[0].content, {"generated_at": "2026-11-12T00:00:00Z", "posts": ["fresh"]})
            self.assertIn("2026-11-12", warning or "")
            self.assertIn("empty", warning or "")

    def test_missing_without_fallback_warns_and_cli_exits_2(self) -> None:
        with self._workspace() as (root, config):
            missing = root / "nope.json"
            snapshot = root / "missing-snap.json"
            config["inputs"] = [self._spec(root, "performance", missing, snapshot)]
            config_path = root / "inputs.json"
            config_path.write_text(json.dumps(config), encoding="utf-8")
            manifest = root / "manifest.json"
            script = REPO_ROOT / "scripts" / "content" / "prepare_research_inputs.py"
            proc = subprocess.run(
                [
                    sys.executable,
                    str(script),
                    "--config",
                    str(config_path),
                    "--manifest",
                    str(manifest),
                    "--now",
                    "2026-11-13T01:00:00Z",
                ],
                check=False,
                capture_output=True,
                text=True,
                env={**os.environ, "CONTENT_PERFORMANCE_INPUT": "", "CONTENT_X_RESEARCH_INPUT": ""},
            )
            self.assertEqual(proc.returncode, 2, proc.stderr)
            self.assertEqual(proc.stdout.count("WARNING"), 1)
            self.assertIn("no last-valid capture", proc.stdout)
            saved = json.loads(manifest.read_text(encoding="utf-8"))
            self.assertIn("no last-valid capture", saved["warning"])

    def test_cli_empty_file_prints_dated_fallback(self) -> None:
        with self._workspace() as (root, config):
            primary = root / "x_research.json"
            primary.write_text("[]\n", encoding="utf-8")
            snapshot = root / "snap.json"
            snapshot.write_text(
                json.dumps(
                    {
                        "captured_at": "2026-11-02T06:00:00Z",
                        "source_path": "/old/x.json",
                        "payload": {"ideas": ["from november 2"]},
                    }
                ),
                encoding="utf-8",
            )
            config["inputs"] = [self._spec(root, "x_research", primary, snapshot)]
            config_path = root / "inputs.json"
            config_path.write_text(json.dumps(config), encoding="utf-8")
            manifest = root / "manifest.json"
            script = REPO_ROOT / "scripts" / "content" / "prepare_research_inputs.py"
            proc = subprocess.run(
                [
                    sys.executable,
                    str(script),
                    "--config",
                    str(config_path),
                    "--manifest",
                    str(manifest),
                    "--now",
                    "2026-11-13T01:00:00Z",
                ],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertEqual(
                proc.stdout.strip(),
                "WARNING: content inputs invalid — x_research: empty, using last valid capture from 2026-11-02.",
            )
            saved = json.loads(manifest.read_text(encoding="utf-8"))
            self.assertEqual(saved["inputs"]["x_research"]["label"], "last valid capture from 2026-11-02")
            self.assertEqual(saved["inputs"]["x_research"]["content"]["ideas"], ["from november 2"])

    def _spec(self, root: Path, name: str, primary: Path, snapshot: Path, max_age: int = 192) -> dict:
        return {
            "name": name,
            "max_age_hours": max_age,
            "primary": str(primary),
            "also_try": [],
            "snapshot": str(snapshot),
        }

    def _fresh_spec(self, root: Path, name: str) -> dict:
        primary = root / f"{name}-fresh.json"
        primary.write_text(
            json.dumps({"generated_at": "2026-11-12T00:00:00Z", "ideas": ["ok"]}),
            encoding="utf-8",
        )
        return self._spec(root, name, primary, root / f"{name}-snap.json")

    def _workspace(self):
        return _Tmp(self)


class _Tmp:
    def __init__(self, test: unittest.TestCase) -> None:
        self.test = test

    def __enter__(self):
        self.dir = __import__("tempfile").TemporaryDirectory()
        root = Path(self.dir.name)
        return root, {"inputs": []}

    def __exit__(self, *exc):
        self.dir.cleanup()


class WarningShapeTests(unittest.TestCase):
    def test_two_failures_are_one_line(self) -> None:
        from content.input_guard import Resolution

        warning = combined_warning(
            [
                Resolution("performance", True, "empty", "2026-11-02", "/a", {"posts": [1]}, "last valid capture from 2026-11-02"),
                Resolution("x_research", True, "stale", "2026-10-26", "/b", {"ideas": [1]}, "last valid capture from 2026-10-26"),
            ]
        )
        assert warning is not None
        self.assertEqual(warning.count("WARNING"), 1)
        self.assertNotIn("\n", warning)
        self.assertIn("performance: empty, using last valid capture from 2026-11-02", warning)
        self.assertIn("x_research: stale, using last valid capture from 2026-10-26", warning)


if __name__ == "__main__":
    unittest.main()
