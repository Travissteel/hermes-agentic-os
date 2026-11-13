"""Freshness and non-empty checks for content research inputs.

When the configured file is missing, empty, or older than its max age, the
newest non-empty capture is returned and labelled with that capture's date.
One warning string covers every bad input in the run. A fresh, non-empty
file produces no warning and refreshes the last-valid snapshot.

Existing dated copies and an explicit snapshot are both accepted as the
last valid input. The snapshot stores the capture date, not the time it was
copied, so a later empty primary cannot look fresh just because the file was
touched.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


DATE_KEYS = (
    "captured_at",
    "generated_at",
    "as_of",
    "created_at",
    "updated_at",
    "date",
)
CONTENT_KEYS = (
    "items",
    "posts",
    "drafts",
    "results",
    "data",
    "queries",
    "tweets",
    "captures",
    "ideas",
    "entries",
    "threads",
)
_META_KEYS = set(DATE_KEYS) | {
    "source",
    "ok",
    "status",
    "source_path",
    "source_date",
    "label",
}
_EMPTY_TEXT = {
    "",
    "null",
    "none",
    "n/a",
    "na",
    "no data",
    "no results",
    "empty",
    "[]",
    "{}",
    "undefined",
}
_TEXT_DATE = re.compile(
    r"^(?:captured_at|generated_at|as_of|date)\s*[:=]\s*(\S+)",
    re.IGNORECASE | re.MULTILINE,
)


@dataclass
class Loaded:
    path: Path
    payload: object
    captured_at: datetime | None
    empty: bool


@dataclass
class Resolution:
    name: str
    used_fallback: bool
    reason: str | None
    source_date: str | None
    source_path: str | None
    content: object
    label: str

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "used_fallback": self.used_fallback,
            "reason": self.reason,
            "source_date": self.source_date,
            "source_path": self.source_path,
            "label": self.label,
            "content": self.content,
        }


def resolve_all(
    config: dict,
    *,
    now: datetime | None = None,
) -> tuple[list[Resolution], str | None]:
    moment = now or datetime.now(timezone.utc)
    results = [resolve_spec(spec, now=moment) for spec in config.get("inputs", [])]
    return results, combined_warning(results)


def resolve_spec(spec: dict, *, now: datetime | None = None) -> Resolution:
    moment = now or datetime.now(timezone.utc)
    name = str(spec.get("name") or "input")
    max_age = float(spec.get("max_age_hours") or 192)
    primary = _primary_path(spec)
    snapshot = _expand(str(spec.get("snapshot") or f"~/.hermes/content/last-valid/{name}.json"))

    candidates = _candidate_paths(spec, primary)
    loaded = [item for item in (_load(path) for path in candidates) if item is not None]
    primary_loaded = next((item for item in loaded if item.path == primary), None)
    if primary_loaded is None and primary.is_file():
        primary_loaded = _load(primary)

    fresh = [
        item
        for item in loaded
        if not item.empty and _is_fresh(item.captured_at, moment, max_age)
    ]
    if fresh:
        best = max(fresh, key=_sort_key)
        _save_snapshot(snapshot, best)
        date = _ymd(best.captured_at)
        return Resolution(
            name=name,
            used_fallback=False,
            reason=None,
            source_date=date,
            source_path=str(best.path),
            content=best.payload,
            label=f"fresh capture {date}",
        )

    snap = _load(snapshot)
    options = [item for item in loaded if not item.empty]
    if snap is not None and not snap.empty and all(item.path != snap.path for item in options):
        options.append(snap)
    reason = _primary_reason(primary_loaded)
    if not options:
        return Resolution(
            name=name,
            used_fallback=True,
            reason=reason,
            source_date=None,
            source_path=str(primary),
            content=None,
            label=f"{reason}, no last-valid capture",
        )
    best = max(options, key=_sort_key)
    _save_snapshot(snapshot, best)
    date = _ymd(best.captured_at)
    return Resolution(
        name=name,
        used_fallback=True,
        reason=reason,
        source_date=date,
        source_path=str(best.path),
        content=best.payload,
        label=f"last valid capture from {date}",
    )


def combined_warning(results: list[Resolution]) -> str | None:
    bad = [item for item in results if item.used_fallback or item.content is None]
    if not bad:
        return None
    bits: list[str] = []
    for item in bad:
        if item.content is None:
            bits.append(f"{item.name}: {item.reason}, no last-valid capture")
        else:
            bits.append(
                f"{item.name}: {item.reason}, using last valid capture from {item.source_date}"
            )
    return "WARNING: content inputs invalid — " + "; ".join(bits) + "."


def ok_line(results: list[Resolution]) -> str:
    bits = [f"{item.name} fresh ({item.source_date})" for item in results]
    if not bits:
        return "OK: no content inputs configured."
    return "OK: " + "; ".join(bits) + "."


def _primary_path(spec: dict) -> Path:
    env_name = spec.get("env_override")
    if env_name and os.environ.get(str(env_name)):
        return _expand(os.environ[str(env_name)])
    return _expand(str(spec.get("primary") or ""))


def _candidate_paths(spec: dict, primary: Path) -> list[Path]:
    paths: list[Path] = [primary]
    for extra in spec.get("also_try") or []:
        paths.append(_expand(str(extra)))
    dated = spec.get("dated_dir")
    if dated:
        directory = _expand(str(dated))
        if directory.is_dir():
            for child in sorted(directory.iterdir()):
                if not child.is_file() or child.name.startswith("."):
                    continue
                if child.suffix.lower() not in {".json", ".txt", ".md"}:
                    continue
                if child.name.endswith(".tmp"):
                    continue
                paths.append(child.resolve())
    seen: set[Path] = set()
    unique: list[Path] = []
    for path in paths:
        if path in seen or path == Path():
            continue
        seen.add(path)
        unique.append(path)
    return unique


def _primary_reason(primary: Loaded | None) -> str:
    if primary is None:
        return "missing"
    if primary.empty:
        return "empty"
    return "stale"


def _expand(value: str) -> Path:
    return Path(os.path.expanduser(value)).resolve()


def _load(path: Path) -> Loaded | None:
    if not path.is_file():
        return None
    raw = path.read_text(encoding="utf-8", errors="replace")
    if not raw.strip():
        captured = datetime.fromtimestamp(path.stat().st_mtime, timezone.utc)
        return Loaded(path, None, captured, True)
    payload: object
    if path.suffix.lower() == ".json" or raw.lstrip()[:1] in "{[":
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = {"_text": raw}
    else:
        payload = {"_text": raw}
    captured: datetime | None = None
    if _is_envelope(payload):
        assert isinstance(payload, dict)
        captured = parse_datetime(str(payload.get("captured_at") or ""))
        payload = payload.get("payload")
    else:
        captured = extract_captured(payload, path)
    if captured is None:
        captured = datetime.fromtimestamp(path.stat().st_mtime, timezone.utc)
    return Loaded(path, payload, captured, is_empty(payload))


def _is_envelope(payload: object) -> bool:
    return (
        isinstance(payload, dict)
        and "payload" in payload
        and "captured_at" in payload
        and "source_path" in payload
    )


def _save_snapshot(path: Path, item: Loaded) -> None:
    captured = item.captured_at or datetime.now(timezone.utc)
    envelope = {
        "captured_at": captured.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_date": _ymd(captured),
        "source_path": str(item.path),
        "payload": item.payload,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(envelope, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def extract_captured(payload: object, path: Path) -> datetime | None:
    if isinstance(payload, dict):
        for key in DATE_KEYS:
            if payload.get(key):
                parsed = parse_datetime(str(payload[key]))
                if parsed:
                    return parsed
        if "_text" in payload:
            found = _date_in_text(str(payload.get("_text") or ""))
            if found:
                return found
    if isinstance(payload, str):
        found = _date_in_text(payload)
        if found:
            return found
    match = re.search(r"(20\d{2}-\d{2}-\d{2})", path.name)
    if match:
        return parse_datetime(match.group(1))
    compact = re.search(r"(20\d{2})(\d{2})(\d{2})", path.name)
    if compact:
        return parse_datetime(f"{compact.group(1)}-{compact.group(2)}-{compact.group(3)}")
    return None


def _date_in_text(text: str) -> datetime | None:
    match = _TEXT_DATE.search(text)
    if not match:
        return None
    return parse_datetime(match.group(1))


def parse_datetime(value: str) -> datetime | None:
    text = value.strip().strip('"').strip("'")
    if not text:
        return None
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y%m%d"):
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def is_empty(payload: object) -> bool:
    if payload is None:
        return True
    if isinstance(payload, str):
        return _text_empty(payload)
    if isinstance(payload, list):
        return all(is_empty(item) for item in payload) if payload else True
    if isinstance(payload, dict):
        if set(payload.keys()) <= {"_text"}:
            return _text_empty(str(payload.get("_text") or ""))
        present = [key for key in CONTENT_KEYS if key in payload]
        if present:
            return all(is_empty(payload[key]) for key in present)
        extra = [key for key in payload.keys() if key not in _META_KEYS]
        if not extra:
            return True
        return all(is_empty(payload[key]) for key in extra)
    return False


def _text_empty(value: str) -> bool:
    return value.strip().lower() in _EMPTY_TEXT


def _is_fresh(captured: datetime | None, now: datetime, max_age_hours: float) -> bool:
    if captured is None:
        return False
    hours = (now - captured).total_seconds() / 3600
    if hours < -24:
        return False
    return hours <= max_age_hours


def _sort_key(item: Loaded) -> datetime:
    return item.captured_at or datetime.min.replace(tzinfo=timezone.utc)


def _ymd(moment: datetime | None) -> str | None:
    if moment is None:
        return None
    return moment.astimezone(timezone.utc).strftime("%Y-%m-%d")
