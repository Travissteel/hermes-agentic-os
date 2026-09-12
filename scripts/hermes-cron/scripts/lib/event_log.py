from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

EVENTS_FILE = Path("~/.hermes/state/events.jsonl").expanduser()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def iter_events() -> list[dict[str, Any]]:
    if not EVENTS_FILE.exists():
        return []
    out: list[dict[str, Any]] = []
    with EVENTS_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except Exception:
                continue
    return out


def has_dedupe_key(dedupe_key: str) -> bool:
    if not dedupe_key or not EVENTS_FILE.exists():
        return False
    with EVENTS_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            if dedupe_key not in line:
                continue
            try:
                row = json.loads(line)
            except Exception:
                continue
            if row.get("dedupe_key") == dedupe_key:
                return True
    return False


def parse_event_ts(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def recent_events(hours: int = 24) -> list[dict[str, Any]]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    rows: list[dict[str, Any]] = []
    for row in iter_events():
        ts = parse_event_ts(row.get("ts"))
        if ts and ts >= cutoff:
            rows.append(row)
    return rows


def summarize_recent_events(hours: int = 24) -> dict[str, Any]:
    rows = recent_events(hours=hours)
    counts: dict[str, int] = {}
    for row in rows:
        counts[row.get("event_type", "unknown")] = counts.get(row.get("event_type", "unknown"), 0) + 1
    return {"hours": hours, "count": len(rows), "by_type": counts, "events": rows}


def append_event(event_type: str, *, system: str, status: str, summary: str, job_id: str | None = None,
                 brand: str | None = None, platform: str | None = None, asset_id: str | None = None,
                 source: str | None = None, metrics: dict[str, Any] | None = None,
                 extra: dict[str, Any] | None = None, dedupe_key: str | None = None) -> dict[str, Any] | None:
    if dedupe_key and has_dedupe_key(dedupe_key):
        return None
    event = {
        "ts": utc_now_iso(),
        "event_type": event_type,
        "system": system,
        "status": status,
        "summary": summary,
    }
    if job_id:
        event["job_id"] = job_id
    if brand:
        event["brand"] = brand
    if platform:
        event["platform"] = platform
    if asset_id:
        event["asset_id"] = asset_id
    if source:
        event["source"] = source
    if metrics is not None:
        event["metrics"] = metrics
    if dedupe_key:
        event["dedupe_key"] = dedupe_key
    if extra:
        event.update(extra)

    EVENTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with EVENTS_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")
    return event
