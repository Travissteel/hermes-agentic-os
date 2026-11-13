#!/usr/bin/env python3
"""Build the weekly X draft prompt, or reject drafts that hit the voice hard bans.

Does not publish, schedule, or write to Postiz. `check` is read-only.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parents[1]
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from content.draft_prompt import assemble_from_files
from content.drafts import load_drafts
from content.paths import default_playbook_path
from content.voice_check import check_text


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Approved-voice prompt and hard-ban check for weekly X drafts.")
    sub = parser.add_subparsers(dest="cmd", required=True)

    prompt = sub.add_parser("prompt", help="Print the drafting prompt (verbatim voice, then safe playbook structure)")
    prompt.add_argument("--voice", type=Path, default=None)
    prompt.add_argument("--playbook", type=Path, default=None)

    check = sub.add_parser("check", help="Reject drafts that hit the approved hard bans")
    check.add_argument("--file", type=Path, required=True)
    check.add_argument("--json", action="store_true")

    args = parser.parse_args(argv)
    if args.cmd == "prompt":
        playbook = args.playbook if args.playbook is not None else default_playbook_path()
        if playbook.is_file():
            text = assemble_from_files(args.voice, playbook)
        else:
            print(
                f"playbook not found at {playbook}; using the voice prompt structure only",
                file=sys.stderr,
            )
            text = assemble_from_files(args.voice, None)
        sys.stdout.write(text)
        return 0

    try:
        drafts = load_drafts(args.file)
    except (OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    rejected = 0
    payload = []
    for label, text in drafts:
        result = check_text(text)
        payload.append({"label": label, "check": result.to_dict()})
        if result.ok:
            continue
        rejected += 1
        if args.json:
            continue
        for violation in result.violations:
            extra = f" :: {violation.excerpt}" if violation.excerpt else ""
            print(f"REJECT {label} {violation.code}: {violation.message}{extra}")
    if args.json:
        print(json.dumps({"rejected": rejected, "drafts": payload}, indent=2))
    elif rejected == 0:
        print(f"OK {len(drafts)} draft(s); none hit the voice hard bans.")
    else:
        print(f"{rejected} rejected, {len(drafts) - rejected} accepted.")
    return 1 if rejected else 0


if __name__ == "__main__":
    raise SystemExit(main())
