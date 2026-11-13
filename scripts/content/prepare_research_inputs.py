#!/usr/bin/env python3
"""Resolve performance and X-research inputs before drafting.

Prints one OK line, or one WARNING line when any input is empty, stale, or
missing. A dated last-valid capture is still returned in the manifest so the
run can continue. Exit 2 only when an input has no last-valid capture at all.
Does not post or call Postiz.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parents[1]
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from content.input_guard import ok_line, parse_datetime, resolve_all
from content.paths import research_config_path, research_manifest_path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate content research inputs and fall back to the last valid capture.")
    parser.add_argument("--config", type=Path, default=None)
    parser.add_argument("--manifest", type=Path, default=None)
    parser.add_argument("--now", default=None, help="ISO time used for the freshness check")
    args = parser.parse_args(argv)

    config_path = args.config or research_config_path()
    config = json.loads(config_path.read_text(encoding="utf-8"))
    now = parse_datetime(args.now) if args.now else None
    if args.now and now is None:
        print(f"ERROR: could not parse --now {args.now}", file=sys.stderr)
        return 2
    results, warning = resolve_all(config, now=now)

    manifest = args.manifest or research_manifest_path()
    manifest.parent.mkdir(parents=True, exist_ok=True)
    body = {
        "warning": warning,
        "inputs": {item.name: item.to_dict() for item in results},
    }
    manifest.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(warning or ok_line(results))
    print(f"manifest: {manifest}", file=sys.stderr)
    if any(item.content is None for item in results):
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
