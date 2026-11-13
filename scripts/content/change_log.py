"""Append-only ledger of shipped commits, verified deployments, and blockers.

The daily report prints only entries added after the previous report's cursor.
The cursor lives beside the ledger so the ledger itself stays a pure log.
"""

from __future__ import annotations

import argparse
import fcntl
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parents[1]
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from content.paths import change_cursor_path, change_ledger_path

KINDS = ("commit", "deployment", "blocker")


def add_entry(
    ledger: Path,
    *,
    kind: str,
    summary: str,
    ref: str | None = None,
    target: str | None = None,
    source: str | None = None,
    verified: bool | None = None,
    ts: datetime | None = None,
) -> dict:
    if kind not in KINDS:
        raise ValueError(f"kind must be one of {', '.join(KINDS)}")
    clean = " ".join(summary.split())
    if not clean:
        raise ValueError("summary is empty")
    if kind == "deployment" and verified is None:
        raise ValueError("deployment entries need verified true or false")
    moment = ts or datetime.now(timezone.utc)
    entry: dict = {
        "id": str(uuid.uuid4()),
        "ts": moment.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        "kind": kind,
        "summary": clean,
    }
    if ref:
        entry["ref"] = ref
    if target:
        entry["target"] = target
    if source:
        entry["source"] = source
    if kind == "deployment":
        entry["verified"] = bool(verified)
    _append(ledger, entry)
    return entry


def read_entries(ledger: Path) -> tuple[list[dict], int]:
    if not ledger.is_file():
        return [], 0
    entries: list[dict] = []
    skipped = 0
    for line in ledger.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            item = json.loads(line)
        except json.JSONDecodeError:
            skipped += 1
            continue
        if isinstance(item, dict):
            entries.append(item)
        else:
            skipped += 1
    return entries, skipped


def read_cursor(path: Path) -> dict:
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def write_cursor(path: Path, *, last_id: str | None, reported_at: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"last_id": last_id, "reported_at": reported_at}
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def entries_since(entries: list[dict], last_id: str | None) -> list[dict]:
    if not last_id:
        return list(entries)
    for index, entry in enumerate(entries):
        if entry.get("id") == last_id:
            return entries[index + 1 :]
    # Unknown cursor would hide the ledger. Show everything and let the next
    # report advance past the current tail.
    return list(entries)


def render_report(
    fresh: list[dict],
    *,
    reported_at: str | None,
    skipped: int = 0,
) -> str:
    changes = [entry for entry in fresh if entry.get("kind") in ("commit", "deployment")]
    blockers = [entry for entry in fresh if entry.get("kind") == "blocker"]
    if reported_at:
        since = f"Since the previous report at {reported_at}."
    else:
        since = "Since the start of the ledger."
    lines = ["# Daily change report", since, ""]
    if not changes and not blockers:
        lines.append("No new changes or blockers.")
    else:
        if changes:
            lines.append("## Changes")
            lines.extend(_change_line(entry) for entry in changes)
            lines.append("")
        if blockers:
            lines.append("## Blockers")
            lines.extend(_blocker_line(entry) for entry in blockers)
            lines.append("")
    if skipped:
        lines.append(
            f"WARNING: skipped {skipped} unreadable ledger line(s)."
        )
    text = "\n".join(lines).rstrip() + "\n"
    return text


def build_report(ledger: Path, cursor: Path, *, mark: bool) -> str:
    entries, skipped = read_entries(ledger)
    state = read_cursor(cursor)
    fresh = entries_since(entries, state.get("last_id"))
    text = render_report(fresh, reported_at=state.get("reported_at"), skipped=skipped)
    if mark:
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        last_id = state.get("last_id")
        if fresh:
            last_id = fresh[-1].get("id") or last_id
        elif entries and not state.get("last_id"):
            last_id = entries[-1].get("id")
        write_cursor(cursor, last_id=last_id, reported_at=now)
    return text


def _change_line(entry: dict) -> str:
    extra: list[str] = []
    if entry.get("ref"):
        extra.append(str(entry["ref"]))
    if entry.get("target"):
        extra.append(str(entry["target"]))
    if entry.get("kind") == "deployment":
        extra.append("verified" if entry.get("verified") else "unverified")
    suffix = f" ({', '.join(extra)})" if extra else ""
    return f"- {str(entry.get('ts', ''))[:10]} {entry.get('kind')}: {entry.get('summary')}{suffix}"


def _blocker_line(entry: dict) -> str:
    return f"- {str(entry.get('ts', ''))[:10]} blocker: {entry.get('summary')}"


def _append(ledger: Path, entry: dict) -> None:
    ledger.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(entry, ensure_ascii=False, separators=(",", ":")) + "\n"
    with ledger.open("a", encoding="utf-8") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        handle.write(line)
        handle.flush()


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Append to the shared change ledger or print the exception-only daily report.")
    sub = parser.add_subparsers(dest="cmd", required=True)

    def add_paths(command: argparse.ArgumentParser) -> None:
        # On each subcommand so `--ledger` works after `add` / `report`.
        command.add_argument("--ledger", type=Path, default=None)
        command.add_argument("--cursor", type=Path, default=None)

    add = sub.add_parser("add", help="Append one commit, deployment, or blocker")
    add_paths(add)
    add.add_argument("--kind", required=True, choices=KINDS)
    add.add_argument("--summary", required=True)
    add.add_argument("--ref", default=None)
    add.add_argument("--target", default=None)
    add.add_argument("--source", default=None)
    verified = add.add_mutually_exclusive_group()
    verified.add_argument("--verified", action="store_true")
    verified.add_argument("--unverified", action="store_true")

    report = sub.add_parser("report", help="Print changes and blockers since the previous report")
    add_paths(report)
    report.add_argument("--no-mark", action="store_true", help="Print without advancing the cursor")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    ledger = args.ledger or change_ledger_path()
    cursor = args.cursor or change_cursor_path()
    if args.cmd == "add":
        verified: bool | None
        if args.verified:
            verified = True
        elif args.unverified:
            verified = False
        else:
            verified = None
        try:
            entry = add_entry(
                ledger,
                kind=args.kind,
                summary=args.summary,
                ref=args.ref,
                target=args.target,
                source=args.source,
                verified=verified,
            )
        except ValueError as exc:
            print(f"ERROR: {exc}", file=sys.stderr)
            return 2
        print(json.dumps(entry, ensure_ascii=False))
        return 0
    print(build_report(ledger, cursor, mark=not args.no_mark), end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
