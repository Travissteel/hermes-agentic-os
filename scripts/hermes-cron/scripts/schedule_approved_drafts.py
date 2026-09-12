#!/usr/bin/env python3
"""Read the approved week draft and schedule all posts.

Behavior:
- Facebook / Instagram -> schedule in Postiz
- X -> queue for direct X publisher (~/.hermes/state/x_publish_queue.json)

Reads the most recent ~/.hermes/drafts/YYYY-MM-DD_week.json.
Skips posts where "approved" is false.
Prints a JSON summary to stdout (for Hermes cron context).

Requires env:
- POSTIZ_API_KEY
"""

from __future__ import annotations

import json
import os
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode

from lib.event_log import append_event

POSTIZ_BASE = "http://127.0.0.1:4007/api/public/v1"
DRAFTS_DIR = os.path.expanduser("~/.hermes/drafts")
ENV_FILE = os.path.expanduser("~/.hermes/.env")
X_QUEUE_FILE = Path("~/.hermes/state/x_publish_queue.json").expanduser()
X_STALE_GRACE_HOURS = 6


def env_or_file(key: str, default: str = "") -> str:
    value = os.environ.get(key)
    if value:
        return value
    try:
        with open(ENV_FILE, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                if k.strip() != key:
                    continue
                v = v.strip()
                if len(v) >= 2 and ((v[0] == v[-1] == '"') or (v[0] == v[-1] == "'")):
                    v = v[1:-1]
                return v
    except FileNotFoundError:
        pass
    return default


# NOTE: keys must match the draft JSON `platform` values.
PROVIDER_TYPE = {
    # Canonical keys
    "X": "x",
    "FB_UGS": "facebook",
    "FB_HYPNO": "facebook",
    "IG_UGS": "instagram-standalone",

    # Back-compat keys (older draft generator variants)
    "FB/UGS": "facebook",
    "FB/HYPNO": "facebook",
    "IG/UGS": "instagram-standalone",
}

EXTRA_SETTINGS = {
    "X": {"who_can_reply_post": "everyone"},

    "FB_UGS": {},
    "FB_HYPNO": {},
    "FB/UGS": {},
    "FB/HYPNO": {},

    # Postiz requires post_type for instagram-standalone.
    "IG_UGS": {"post_type": "post"},
    "IG/UGS": {"post_type": "post"},
}


def find_latest_draft() -> str | None:
    if not os.path.isdir(DRAFTS_DIR):
        return None
    files = sorted(
        [f for f in os.listdir(DRAFTS_DIR) if f.endswith("_week.json")],
        reverse=True,
    )
    return os.path.join(DRAFTS_DIR, files[0]) if files else None


def schedule_post(api_key: str, integration_id: str, platform: str, date_utc: str, text: str, media: list | None = None) -> dict:
    provider = PROVIDER_TYPE.get(platform, "x")
    settings = {"__type": provider, **EXTRA_SETTINGS.get(platform, {})}
    media = media or []
    payload = json.dumps({
        "type": "schedule",
        "date": date_utc,
        "shortLink": False,
        "tags": [],
        "posts": [{
            "integration": {"id": integration_id},
            "value": [{"content": text, "image": media}],
            "settings": settings,
        }],
    }).encode()
    req = urllib.request.Request(
        f"{POSTIZ_BASE}/posts",
        data=payload,
        headers={"Authorization": api_key, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def _parse_iso(dt: str) -> datetime:
    """Parse ISO timestamps that may be '...Z' into aware UTC datetimes."""
    s = (dt or "").strip()
    if not s:
        raise ValueError("empty datetime")
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return datetime.fromisoformat(s).astimezone(timezone.utc)


def _norm_iso(dt: str) -> str:
    """Canonical ISO string for comparisons (seconds resolution, UTC, with Z)."""
    return _parse_iso(dt).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_x_queue() -> dict:
    if not X_QUEUE_FILE.exists():
        return {"items": []}
    obj = json.loads(X_QUEUE_FILE.read_text(encoding="utf-8"))
    if isinstance(obj, list):
        obj = {"items": obj}
    obj.setdefault("items", [])
    return obj


def save_x_queue(data: dict) -> None:
    X_QUEUE_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = X_QUEUE_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(X_QUEUE_FILE)


def is_stale_x_post(date_utc: str, *, grace_hours: int = X_STALE_GRACE_HOURS) -> bool:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=grace_hours)
    return _parse_iso(date_utc) < cutoff


def queue_x_post(post: dict) -> tuple[str, dict]:
    queue = load_x_queue()
    items = queue.setdefault("items", [])
    norm_date = _norm_iso(post.get("date_utc", ""))
    norm_text = " ".join((post.get("text", "") or "").strip().lower().split())

    for item in items:
        if item.get("post_id") == post.get("id") and item.get("date_utc_norm") == norm_date:
            return "existing", item
        if (
            item.get("integration_id") == post.get("integration_id")
            and item.get("date_utc_norm") == norm_date
            and item.get("text_norm") == norm_text
        ):
            return "existing", item

    entry = {
        "post_id": post.get("id"),
        "platform": post.get("platform"),
        "integration_id": post.get("integration_id"),
        "day": post.get("day"),
        "time_aest": post.get("time_aest"),
        "date_utc": post.get("date_utc"),
        "date_utc_norm": norm_date,
        "text": post.get("text", ""),
        "text_norm": norm_text,
        "status": "queued",
        "queued_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source": "schedule_approved_drafts.py",
    }
    items.append(entry)
    items.sort(key=lambda x: x.get("date_utc", ""))
    save_x_queue(queue)
    append_event(
        "post_scheduled",
        system="x_queue",
        status="queued",
        summary=f"Queued X post {post.get('id')} for direct publish",
        job_id="sched3pm9f2e1d",
        brand="AgoristAlchemy",
        platform="X",
        asset_id=str(post.get("id") or ""),
        source="schedule_approved_drafts.py",
        metrics={"date_utc": post.get("date_utc"), "word_count": len((post.get("text", "") or "").split())},
    )
    return "queued", entry


def fetch_existing_scheduled(api_key: str, start_utc: str, end_utc: str) -> set[tuple[str, str]]:
    """Return {(integration_id, publishDate_norm)} for posts already present in Postiz in this window."""
    url = f"{POSTIZ_BASE}/posts?" + urlencode({"startDate": start_utc, "endDate": end_utc})
    req = urllib.request.Request(url, headers={"Authorization": api_key}, method="GET")
    with urllib.request.urlopen(req, timeout=30) as r:
        obj = json.loads(r.read().decode())
    posts = obj.get("posts", [])
    existing: set[tuple[str, str]] = set()
    for p in posts:
        integ = (p.get("integration") or {}).get("id")
        pd = p.get("publishDate")
        if integ and pd:
            try:
                existing.add((integ, _norm_iso(pd)))
            except Exception:
                pass
    return existing


def schedule_post_with_retry(api_key: str, integration_id: str, platform: str, date_utc: str, text: str, media: list | None = None, *, max_attempts: int = 6) -> dict:
    """Schedule with exponential backoff on HTTP 429 (Postiz throttling)."""
    attempt = 0
    while True:
        attempt += 1
        try:
            return schedule_post(api_key, integration_id, platform, date_utc, text, media=media)
        except HTTPError as e:
            if getattr(e, "code", None) == 429 and attempt < max_attempts:
                time.sleep(min(90, 5 * (2 ** (attempt - 1))))
                continue
            raise
        except Exception:
            # Unknown POST outcome: retries could create duplicate scheduled posts.
            raise


def validate_x_post(text: str) -> list[str]:
    """Return a list of rejection reasons for X posts. Empty list = ok."""
    reasons: list[str] = []
    t = (text or "").strip()
    if not t:
        return ["empty text"]

    lowered = t.lower()

    banned_substrings = [
        "accessibility",
        "sign up now",
        "personalized timeline",
        "cookie",
        "privacy policy",
        "terms of service",
        "enable javascript",
        "javascript is required",
        "reply system",
        "comment system",
        " dm me system",
        "here’s the play:",
        "here's the play:",
        "unpopular opinion",
        "hot take",
        "in today's world",
        "ai is changing everything",
        "10x your productivity",
        "leverage ai",
    ]
    for s in banned_substrings:
        if s in lowered:
            reasons.append(f"banned substring: {s}")

    cta_bans = [
        "comment system",
        "reply system",
        "dm me system",
        "dm system",
    ]
    for s in cta_bans:
        if s in lowered:
            reasons.append("contains forbidden CTA trigger: SYSTEM")

    if t.count("#") > 1:
        reasons.append("too many hashtags (>1)")

    words = [w for w in t.replace("\n", " ").split(" ") if w]
    wc = len(words)
    if wc < 110:
        reasons.append(f"too short for X long-form ({wc} words < 110)")
    if wc > 450:
        reasons.append(f"too long for X long-form ({wc} words > 450)")

    bullet_lines = [ln for ln in t.splitlines() if ln.strip().startswith(("- ", "•", "* "))]
    if len(bullet_lines) >= 5:
        reasons.append(f"listicle bullets detected ({len(bullet_lines)} bullet lines)")

    seen = set()
    dupes = 0
    for ln in [ln.strip() for ln in t.splitlines() if ln.strip()]:
        key = ln.lower()
        if key in seen:
            dupes += 1
        seen.add(key)
    if dupes:
        reasons.append(f"duplicate lines detected ({dupes})")

    return reasons


def validate_facebook_post(text: str, kind: str) -> list[str]:
    """Basic long-form + anti-slop validation for Facebook posts.

    kind: 'UGS' or 'Hypno' (used only for wordcount tuning).
    """
    reasons: list[str] = []
    t = (text or "").strip()
    if not t:
        return ["empty text"]

    lowered = t.lower()

    banned_substrings = [
        "reply system",
        "comment system",
        "unpopular opinion",
        "hot take",
        "here’s the play:",
        "here's the play:",
        "in today's world",
        "ai is changing everything",
        "10x your productivity",
        "leverage ai",
        "client-facing",
        "client facing",
        "therapist-facing",
        "therapist facing",
    ]
    for s in banned_substrings:
        if s in lowered:
            reasons.append(f"banned substring: {s}")

    cta_bans = [
        "comment system",
        "reply system",
        "dm me system",
        "dm system",
    ]
    for s in cta_bans:
        if s in lowered:
            reasons.append("contains forbidden CTA trigger: SYSTEM")

    if t.count("#") > 2:
        reasons.append("too many hashtags (>2)")

    words = [w for w in t.replace("\n", " ").split(" ") if w]
    wc = len(words)
    min_wc = 140 if kind == "UGS" else 110
    max_wc = 380
    if wc < min_wc:
        reasons.append(f"too short for FB long-form ({wc} words < {min_wc})")
    if wc > max_wc:
        reasons.append(f"too long for FB long-form ({wc} words > {max_wc})")

    seen = set()
    dupes = 0
    for ln in [ln.strip() for ln in t.splitlines() if ln.strip()]:
        key = ln.lower()
        if key in seen:
            dupes += 1
        seen.add(key)
    if dupes:
        reasons.append(f"duplicate lines detected ({dupes})")

    return reasons


def validate_instagram_post(text: str, media: list | None = None) -> list[str]:
    """Prevent guaranteed IG failures."""
    reasons: list[str] = []
    t = (text or "").strip()
    media = media or []

    if not t:
        reasons.append("empty text")
    if not media:
        reasons.append("instagram requires at least one media item; text-only IG posts fail in Postiz")
    if t.count("#") > 12:
        reasons.append("too many hashtags for IG (>12)")

    return reasons


def main() -> int:
    api_key = env_or_file("POSTIZ_API_KEY")
    if not api_key:
        print(json.dumps({"ok": False, "error": "Missing POSTIZ_API_KEY"}))
        return 2

    draft_path = find_latest_draft()
    if not draft_path:
        print(json.dumps({"ok": False, "error": f"No draft file found in {DRAFTS_DIR}"}))
        return 1

    with open(draft_path, encoding="utf-8") as f:
        draft = json.load(f)

    posts = draft.get("posts", [])
    week = draft.get("week", "unknown")
    from lib.cron_quality import approval_valid, expected_week
    if week != expected_week():
        print(json.dumps({"ok": False, "error": "Draft is not for the upcoming/current week", "week": week}))
        return 1
    if not approval_valid(draft):
        print(json.dumps({"ok": False, "status": "awaiting_human_approval", "week": week}))
        return 1
    approved = [p for p in posts if p.get("quality_passed", p.get("approved")) is True]
    skipped = len(posts) - len(approved)
    approved_non_x = [p for p in approved if p.get("platform") != "X"]

    existing: set[tuple[str, str]] = set()
    try:
        if approved_non_x:
            dts = sorted(_parse_iso(p.get("date_utc", "")) for p in approved_non_x if p.get("date_utc"))
            start = dts[0].replace(hour=0, minute=0, second=0, microsecond=0)
            end = dts[-1].replace(hour=23, minute=59, second=59, microsecond=0)
            start_utc = start.isoformat().replace("+00:00", "Z")
            end_utc = end.isoformat().replace("+00:00", "Z")
            existing = fetch_existing_scheduled(api_key, start_utc, end_utc)
    except Exception as exc:
        print(json.dumps({"ok": False, "error": f"Cannot verify existing scheduled posts: {exc}"}))
        return 1

    results = {
        "ok": [],
        "error": [],
        "rejected": [],
        "skipped_existing": [],
        "queued_x": [],
        "skipped_stale_x": [],
    }

    def _norm_text(s: str) -> str:
        return " ".join((s or "").strip().lower().split())

    seen_text: set[str] = set()

    for p in approved:
        platform = p.get("platform")
        from lib.cron_quality import publisher_enabled
        if platform not in PROVIDER_TYPE or (platform == "X" and not publisher_enabled()):
            results["rejected"].append({"id": p.get("id"), "platform": platform,
                "reasons": ["Unknown platform or X publisher paused"]})
            continue
        try:
            if _parse_iso(p.get("date_utc", "")) <= datetime.now(timezone.utc):
                raise ValueError("Post is already past due")
        except (ValueError, TypeError) as exc:
            results["rejected"].append({"id": p.get("id"), "reasons": [str(exc)]})
            continue

        k = _norm_text(p.get("text", ""))
        if k and k in seen_text:
            results["rejected"].append({
                "id": p.get("id"),
                "platform": platform,
                "day": p.get("day"),
                "time": p.get("time_aest"),
                "reasons": ["duplicate post text (exact/normalized)"],
            })
            continue
        if k:
            seen_text.add(k)

        if platform == "X":
            reasons = validate_x_post(p.get("text", ""))
            if reasons:
                results["rejected"].append({
                    "id": p.get("id"),
                    "platform": platform,
                    "day": p.get("day"),
                    "time": p.get("time_aest"),
                    "reasons": reasons,
                })
                continue
            if is_stale_x_post(p.get("date_utc", "")):
                results["skipped_stale_x"].append({
                    "id": p.get("id"),
                    "platform": platform,
                    "day": p.get("day"),
                    "time": p.get("time_aest"),
                    "reason": f"past due by more than {X_STALE_GRACE_HOURS}h at queue time",
                })
                continue
            try:
                status, _entry = queue_x_post(p)
                if status == "existing":
                    results["skipped_existing"].append({
                        "id": p["id"],
                        "platform": p["platform"],
                        "day": p["day"],
                        "time": p["time_aest"],
                    })
                else:
                    results["queued_x"].append({
                        "id": p["id"],
                        "platform": p["platform"],
                        "day": p["day"],
                        "time": p["time_aest"],
                    })
                continue
            except Exception as e:
                results["error"].append({"id": p.get("id"), "platform": p.get("platform"), "error": str(e)})
                continue

        if platform in {"FB/UGS", "FB/Hypno", "FB_UGS", "FB_HYPNO"}:
            kind = "UGS" if platform in {"FB/UGS", "FB_UGS"} else "Hypno"
            reasons = validate_facebook_post(p.get("text", ""), kind=kind)
            if reasons:
                results["rejected"].append({
                    "id": p.get("id"),
                    "platform": platform,
                    "day": p.get("day"),
                    "time": p.get("time_aest"),
                    "reasons": reasons,
                })
                continue

        if platform in {"IG/UGS", "IG_UGS"}:
            reasons = validate_instagram_post(p.get("text", ""), media=p.get("image") or p.get("images"))
            if reasons:
                results["rejected"].append({
                    "id": p.get("id"),
                    "platform": platform,
                    "day": p.get("day"),
                    "time": p.get("time_aest"),
                    "reasons": reasons,
                })
                continue

        try:
            key = (p["integration_id"], _norm_iso(p["date_utc"]))
            if key in existing:
                results["skipped_existing"].append({
                    "id": p["id"],
                    "platform": p["platform"],
                    "day": p["day"],
                    "time": p["time_aest"],
                })
            else:
                _ = schedule_post_with_retry(
                    api_key,
                    p["integration_id"],
                    p["platform"],
                    p["date_utc"],
                    p["text"],
                    p.get("image") or p.get("images"),
                )
                existing.add(key)
                append_event(
                    "post_scheduled",
                    system="postiz",
                    status="scheduled",
                    summary=f"Scheduled {p['platform']} post {p['id']}",
                    job_id="sched3pm9f2e1d",
                    brand="UGS" if p["platform"] in {"FB/UGS", "FB_UGS", "IG/UGS", "IG_UGS"} else "Hypnotherapy Finder",
                    platform=p["platform"],
                    asset_id=str(p["id"]),
                    source="schedule_approved_drafts.py",
                    metrics={"date_utc": p["date_utc"], "integration_id": p["integration_id"]},
                )
                results["ok"].append({
                    "id": p["id"],
                    "platform": p["platform"],
                    "day": p["day"],
                    "time": p["time_aest"],
                })
        except Exception as e:
            results["error"].append({"id": p.get("id"), "platform": p.get("platform"), "error": str(e)})
        time.sleep(2)

    summary = {
        "ok": not (results["error"] or results["rejected"]),
        "status": "partial" if (results["error"] or results["rejected"]) else "scheduled_or_queued",
        "published": 0,
        "week": week,
        "draft_file": draft_path,
        "scheduled": len(results["ok"]),
        "queued_x": len(results["queued_x"]),
        "errors": len(results["error"]),
        "rejected_by_slop_filter": len(results["rejected"]),
        "skipped_existing": len(results["skipped_existing"]),
        "skipped_stale_x": len(results["skipped_stale_x"]),
        "skipped_unapproved": skipped,
        "error_details": results["error"],
        "queued_x_details": results["queued_x"],
        "rejected_details": results["rejected"],
        "skipped_existing_details": results["skipped_existing"],
        "skipped_stale_x_details": results["skipped_stale_x"],
    }
    append_event(
        "schedule_batch_completed",
        system="scheduler",
        status="ok" if not results["error"] else "error",
        summary=f"Week {week}: scheduled {len(results['ok'])}, queued_x {len(results['queued_x'])}, rejected {len(results['rejected'])}",
        job_id="sched3pm9f2e1d",
        source="schedule_approved_drafts.py",
        metrics={
            "week": week,
            "scheduled": len(results["ok"]),
            "queued_x": len(results["queued_x"]),
            "errors": len(results["error"]),
            "rejected": len(results["rejected"]),
            "skipped_existing": len(results["skipped_existing"]),
            "skipped_stale_x": len(results["skipped_stale_x"]),
            "skipped_unapproved": skipped,
        },
    )
    print(json.dumps(summary, ensure_ascii=False))
    return 1 if (results["error"] or results["rejected"]) else 0


if __name__ == "__main__":
    raise SystemExit(main())
