#!/usr/bin/env python3
"""Refresh shared Hermes state artifacts for Mission Control.

Writes:
- ~/antigravity/shared/hermes-state.md
- ~/antigravity/shared/hermes-state.json
- ~/antigravity/shared/workscore.json
"""

from __future__ import annotations

import glob
import json
import os
import re
import subprocess
import urllib.parse
import urllib.request
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from lib.event_log import append_event, iter_events, parse_event_ts, EVENTS_FILE

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None  # type: ignore

HOME = Path.home()
AEST = ZoneInfo("Australia/Melbourne") if ZoneInfo else timezone(timedelta(hours=10))
HERMES_HOME = HOME / ".hermes"
SHARED = HOME / "antigravity" / "shared"
CRON_OUTPUT = HERMES_HOME / "cron" / "output"
JOBS_PATH = HERMES_HOME / "cron" / "jobs.json"
CONFIG_PATH = HERMES_HOME / "config.yaml"
ENV_PATH = HERMES_HOME / ".env"
DRAFTS_DIR = HERMES_HOME / "drafts"
PERF_DIR = HERMES_HOME / "memories" / "performance"
X_RESEARCH_DIR = HERMES_HOME / "memories" / "x_research"
POSTIZ_BASE = os.environ.get("POSTIZ_BASE_URL", "http://127.0.0.1:4007/api/public/v1")
STALE_HOURS = 24

OUT_MD = SHARED / "hermes-state.md"
OUT_JSON = SHARED / "hermes-state.json"
OUT_WORKSCORE = SHARED / "workscore.json"

INTEGRATION_NAMES = {
    "cmmcvov8h0001p17ea9sctvbl": "Facebook: UGS",
    "cmmcvpvef0003p17e4tf3jvmj": "Facebook: Hypnotherapy-finder.com",
    "cmm9x0hel0001n17i2xblidh4": "X: AgoristAlchemy",
    "cmma12ym20001pf7gr8w5gy7w": "Instagram: UGS",
}
CRITICAL_JOBS = {
    "x-viral-research-weekly",
    "Weekly performance + voice sync (Saturdays)",
    "x-direct-publisher",
}


@dataclass
class FileFreshness:
    label: str
    path: str
    exists: bool
    mtime_iso: str | None
    age_hours: float | None
    stale: bool


def env_or_file(key: str, default: str = "") -> str:
    value = os.environ.get(key)
    if value:
        return value
    try:
        for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
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


def read_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def shell_output(cmd: list[str]) -> str:
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
        out = (proc.stdout or proc.stderr or "").strip()
        return out or "unknown"
    except Exception as e:
        return f"error: {type(e).__name__}: {e}"


def is_user_service_active(unit: str) -> str:
    return shell_output(["systemctl", "--user", "is-active", unit]).splitlines()[0].strip()


def load_jobs() -> list[dict[str, Any]]:
    data = read_json(JOBS_PATH, {"jobs": []})
    if isinstance(data, dict):
        jobs = data.get("jobs", [])
        return jobs if isinstance(jobs, list) else []
    return data if isinstance(data, list) else []


def load_model_info() -> dict[str, str]:
    default = "unknown"
    provider = "unknown"
    try:
        lines = CONFIG_PATH.read_text(encoding="utf-8").splitlines()
        in_model = False
        for line in lines:
            if re.match(r"^model:\s*$", line):
                in_model = True
                continue
            if in_model and re.match(r"^[^\s].*:\s*$", line):
                break
            if in_model:
                m = re.match(r"^\s+default:\s*(.+)$", line)
                if m:
                    default = m.group(1).strip().strip('"')
                m = re.match(r"^\s+provider:\s*(.+)$", line)
                if m:
                    provider = m.group(1).strip().strip('"')
    except Exception:
        pass
    return {"default": default, "provider": provider}


def now_aest() -> datetime:
    return datetime.now(AEST)


def iso_z(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def iso_local(dt: datetime) -> str:
    return dt.astimezone(AEST).isoformat()


def file_freshness(label: str, path: Path, now: datetime) -> FileFreshness:
    if not path.exists():
        return FileFreshness(label, str(path), False, None, None, True)
    mtime = datetime.fromtimestamp(path.stat().st_mtime, tz=AEST)
    age = (now - mtime).total_seconds() / 3600
    return FileFreshness(label, str(path), True, iso_local(mtime), round(age, 2), age > STALE_HOURS)


def newest_file(path: Path, pattern: str) -> Path | None:
    matches = sorted(path.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    return matches[0] if matches else None


def count_draft_activity(start: datetime, end: datetime) -> dict[str, Any]:
    files = []
    approved = 0
    binned = 0
    total_posts = 0
    for path in sorted(DRAFTS_DIR.glob("*_week.json")):
        mtime = datetime.fromtimestamp(path.stat().st_mtime, tz=AEST)
        if not (start <= mtime <= end):
            continue
        files.append(path)
        try:
            obj = json.loads(path.read_text(encoding="utf-8"))
            posts = obj.get("posts", []) if isinstance(obj, dict) else []
            total_posts += len(posts)
            approved += sum(1 for p in posts if p.get("approved") is True)
            binned += sum(1 for p in posts if p.get("approved") is False)
        except Exception:
            pass
    return {
        "files_touched": len(files),
        "files": [str(p) for p in files],
        "posts_total": total_posts,
        "approved": approved,
        "binned": binned,
    }


def fetch_postiz_states(start: datetime, end: datetime) -> dict[str, Any]:
    api_key = env_or_file("POSTIZ_API_KEY")
    if not api_key:
        return {"tracked": False, "error": "Missing POSTIZ_API_KEY", "counts": {}, "by_integration": {}}

    def normalize_posts(posts: list[dict[str, Any]]) -> dict[str, Any]:
        counts = Counter()
        by_integration: dict[str, Counter[str]] = {}
        samples: list[dict[str, Any]] = []
        for p in posts:
            state = str(p.get("state") or "UNKNOWN").upper()
            counts[state] += 1
            iid = ((p.get("integration") or {}).get("id") or p.get("integration_id") or "unknown")
            by_integration.setdefault(iid, Counter())[state] += 1
            if len(samples) < 8:
                samples.append(
                    {
                        "publishDate": p.get("publishDate"),
                        "state": state,
                        "integration_id": iid,
                        "integration_name": INTEGRATION_NAMES.get(iid, p.get("integration_name", iid)),
                        "content_preview": ((p.get("content") or p.get("text") or "")[:120]).replace("\n", " "),
                        "releaseURL": p.get("releaseURL"),
                    }
                )
        return {
            "tracked": True,
            "error": None,
            "counts": dict(counts),
            "by_integration": {k: dict(v) for k, v in by_integration.items()},
            "samples": samples,
            "raw_total": len(posts),
        }

    qs = urllib.parse.urlencode({"startDate": iso_z(start), "endDate": iso_z(end)})
    url = f"{POSTIZ_BASE}/posts?{qs}"
    req = urllib.request.Request(url, headers={"Authorization": api_key}, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
        payload = json.loads(body)
        posts = payload.get("posts") if isinstance(payload, dict) else payload
        if not isinstance(posts, list):
            posts = []
        return normalize_posts(posts)
    except Exception as e:
        fallback = shell_output(["python3", str(HERMES_HOME / "scripts" / "postiz_yesterday_posts.py")])
        try:
            payload = json.loads(fallback)
            posts = payload.get("posts", []) if isinstance(payload, dict) else []
            normalized = normalize_posts(posts if isinstance(posts, list) else [])
            normalized["fallback_used"] = True
            normalized["error"] = f"Direct Postiz fetch failed: {type(e).__name__}: {e}"
            return normalized
        except Exception:
            return {
                "tracked": False,
                "error": f"Postiz fetch failed: {type(e).__name__}: {e}",
                "counts": {},
                "by_integration": {},
            }


def yesterday_window(now: datetime) -> tuple[datetime, datetime]:
    y = (now - timedelta(days=1)).date()
    start = datetime(y.year, y.month, y.day, 0, 0, 0, tzinfo=AEST)
    end = datetime(y.year, y.month, y.day, 23, 59, 59, tzinfo=AEST)
    return start, end


def week_window(now: datetime) -> tuple[datetime, datetime]:
    weekday = now.weekday()
    monday = (now - timedelta(days=weekday)).replace(hour=0, minute=0, second=0, microsecond=0)
    return monday, now


def cron_files_for_date(job_id: str | None, day: datetime) -> list[Path]:
    if not job_id:
        return []
    directory = CRON_OUTPUT / job_id
    if not directory.exists():
        return []
    prefix = day.strftime("%Y-%m-%d")
    return sorted(directory.glob(f"{prefix}_*.md"))


def extract_response_text(md_path: Path) -> str:
    try:
        text = md_path.read_text(encoding="utf-8")
    except Exception:
        return ""
    marker = "## Response"
    idx = text.find(marker)
    return text[idx + len(marker):].strip() if idx != -1 else text.strip()


def summarize_job_runs(jobs: list[dict[str, Any]], names: list[str], day: datetime, kind: str) -> dict[str, Any]:
    name_to_id = {j.get("name"): j.get("id") or j.get("job_id") for j in jobs}
    runs = []
    shipped = 0
    silent = 0
    all_events = iter_events()
    for name in names:
        for path in cron_files_for_date(name_to_id.get(name), day):
            response = extract_response_text(path)
            normalized = response.lower()
            is_silent = response.strip() == "[SILENT]"
            if is_silent:
                silent += 1
            evidence = [e for e in all_events if e.get("source") == str(path)
                        and e.get("event_type") == "site_change" and e.get("asset_id")]
            did_ship = bool(evidence)
            runs.append(
                {
                    "name": name,
                    "path": str(path),
                    "shipped": did_ship,
                    "silent": is_silent,
                    "summary": response.splitlines()[0] if response else "",
                }
            )
            if did_ship:
                shipped += 1
    from lib.cron_quality import event_window
    start = day.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1) - timedelta(microseconds=1)
    relevant_ids = {name_to_id.get(n) for n in names}
    changes = [e for e in event_window(all_events, start, end)
               if e.get("event_type") == "site_change" and e.get("job_id") in relevant_ids]
    unique = {(e.get("site"), e.get("asset_id")): e for e in changes}
    return {"runs": runs, "run_count": len(runs), "shipped_count": len(unique), "silent_count": silent,
            "evidence_basis": "Verified pushed commits; not proof of deployment or traffic improvement",
            "changes": list(unique.values())}


def newsletter_status_this_week(jobs: list[dict[str, Any]], start: datetime) -> dict[str, Any]:
    newsletter_jobs = []
    for job in jobs:
        haystack = " ".join(
            str(job.get(k, ""))
            for k in ("name", "prompt", "script", "skill")
        ).lower()
        if "beehiiv" in haystack or "newsletter" in haystack:
            newsletter_jobs.append(job.get("name"))
    return {
        "tracked": bool(newsletter_jobs),
        "automation_jobs": newsletter_jobs,
        "drafts_created": 0,
        "window_start": iso_local(start),
    }


def build_freshness(now: datetime) -> tuple[list[FileFreshness], list[str]]:
    freshest_perf = newest_file(PERF_DIR, "*.json")
    freshest_x_research = newest_file(X_RESEARCH_DIR, "*.jsonl")
    watched = [
        ("Goals", SHARED / "goals.json"),
        ("Activity log", SHARED / "activity-log.md"),
        ("Cron jobs", JOBS_PATH),
        ("Latest performance snapshot", freshest_perf),
        ("Latest X research capture", freshest_x_research),
    ]
    rows: list[FileFreshness] = []
    warnings: list[str] = []
    for label, path in watched:
        if path is None:
            rows.append(FileFreshness(label, "missing", False, None, None, True))
            warnings.append(f"{label} missing")
            continue
        row = file_freshness(label, path, now)
        rows.append(row)
        if row.stale:
            if row.exists:
                warnings.append(f"{label} stale ({row.age_hours}h old)")
            else:
                warnings.append(f"{label} missing")
    return rows, warnings


def build_state() -> dict[str, Any]:
    now = now_aest()
    jobs = load_jobs()
    model = load_model_info()
    version = shell_output(["hermes", "--version"]).splitlines()[0]
    gateway_status = is_user_service_active("hermes-gateway.service")
    webui_status = is_user_service_active("hermes-webui.service")

    active_jobs = [j for j in jobs if j.get("enabled", True) and j.get("state") != "paused"]
    paused_jobs = [j for j in jobs if (not j.get("enabled", True)) or j.get("state") == "paused"]
    critical_paused = []  # Paused jobs are an operator choice, not an execution failure.
    paused_review = [{"name": j.get("name"), "reason": j.get("paused_reason") or "Not recorded; review intent"} for j in paused_jobs]
    failed_jobs = [{"name": j.get("name"), "failure_streak": j.get("failure_streak", 0),
                    "error": j.get("last_error")} for j in active_jobs if j.get("last_status") == "error"]

    y_start, y_end = yesterday_window(now)
    week_start, _ = week_window(now)

    freshness_rows, stale_warnings = build_freshness(now)
    draft_activity = count_draft_activity(y_start, y_end)
    postiz = fetch_postiz_states(y_start, y_end)
    seo = summarize_job_runs(jobs, ["bsf-nightly-seo", "hf-nightly-seo"], y_start, "seo")
    leadgen = summarize_job_runs(jobs, ["leadgen-nightly", "leadgen-launch"], y_start, "leadgen")
    newsletter = newsletter_status_this_week(jobs, week_start)

    tracking_gaps = []
    from lib.cron_quality import event_window
    dm_events = [e for e in event_window(iter_events(), y_start, y_end) if e.get("system") == "n8n_dm"]
    dm_triggers = {"tracked": EVENTS_FILE.exists(),
        "fired": sum(e.get("event_type") == "dm_trigger_scan_started" for e in dm_events),
        "sent": sum(e.get("event_type") == "dm_sent" and e.get("metrics", {}).get("provider_message_id") is not None for e in dm_events),
        "send_nodes_completed": sum(e.get("event_type") in ("dm_sent", "dm_send_node_completed") for e in dm_events),
        "failed": sum(e.get("event_type") == "dm_trigger_failed" for e in dm_events),
        "reason": "Event log; completed send nodes are not proof of delivery."}
    if not EVENTS_FILE.exists():
        tracking_gaps.append("Event log unavailable")
    if not newsletter["tracked"]:
        tracking_gaps.append("No Beehiiv/newsletter cron job is configured.")
    if critical_paused:
        tracking_gaps.append(f"Critical jobs paused: {', '.join(critical_paused)}")
    if not postiz.get("tracked"):
        tracking_gaps.append(postiz.get("error") or "Postiz state unavailable")

    state = {
        "generated_at": iso_local(now),
        "generated_by": "~/.hermes/scripts/state_integrity_refresh.py",
        "version": {
            "hermes": version,
            "model_default": model["default"],
            "provider": model["provider"],
            "gateway_status": gateway_status,
            "webui_status": webui_status,
            "webui_url": "http://127.0.0.1:8787",
        },
        "cron": {
            "total_jobs": len(jobs),
            "active_jobs": len(active_jobs),
            "paused_jobs": len(paused_jobs),
            "critical_paused": critical_paused,
            "paused_review": paused_review,
            "failed_jobs": failed_jobs,
            "jobs": [
                {
                    "name": j.get("name"),
                    "id": j.get("id") or j.get("job_id"),
                    "enabled": j.get("enabled", True),
                    "state": j.get("state"),
                    "schedule": (j.get("schedule") or {}).get("display") if isinstance(j.get("schedule"), dict) else j.get("schedule"),
                    "script": j.get("script") or "(agent)",
                    "last_run_at": j.get("last_run_at"),
                    "last_status": j.get("last_status"),
                    "deliver": j.get("deliver"),
                }
                for j in jobs
            ],
        },
        "freshness": {
            "threshold_hours": STALE_HOURS,
            "files": [row.__dict__ for row in freshness_rows],
            "warnings": stale_warnings,
        },
        "yesterday": {
            "window_start": iso_local(y_start),
            "window_end": iso_local(y_end),
            "drafts": draft_activity,
            "postiz": postiz,
            "dm_triggers": dm_triggers,
            "seo": seo,
            "leadgen": leadgen,
        },
        "this_week": {
            "window_start": iso_local(week_start),
            "newsletter": newsletter,
        },
        "tracking_gaps": tracking_gaps,
    }
    return state


def render_markdown(state: dict[str, Any]) -> str:
    lines = []
    lines.append("# Hermes State Snapshot")
    lines.append("")
    lines.append(f"*Auto-generated {state['generated_at']} by `state_integrity_refresh.py`*")
    lines.append("")
    lines.append("## Version & Services")
    lines.append("")
    lines.append("| Item | Value |")
    lines.append("|---|---|")
    version = state["version"]
    lines.append(f"| Hermes | {version['hermes']} |")
    lines.append(f"| Model | {version['model_default']} via {version['provider']} |")
    lines.append(f"| hermes-gateway | {version['gateway_status']} |")
    lines.append(f"| hermes-webui | {version['webui_status']} ({version['webui_url']}) |")
    lines.append("")
    lines.append("## Cron Summary")
    lines.append("")
    cron = state["cron"]
    lines.append(f"- Active jobs: **{cron['active_jobs']}**")
    lines.append(f"- Paused jobs: **{cron['paused_jobs']}**")
    if cron["critical_paused"]:
        lines.append(f"- Critical paused jobs: **{', '.join(cron['critical_paused'])}**")
    lines.append("")
    lines.append("| Name | Schedule | Script | State | Last run | Status |")
    lines.append("|---|---|---|---|---|---|")
    for job in state["cron"]["jobs"]:
        lines.append(
            f"| {job['name']} | `{job['schedule']}` | `{job['script']}` | {job['state']} | {job['last_run_at'] or '?'} | {job['last_status'] or '?'} |"
        )
    lines.append("")
    lines.append("## File Freshness")
    lines.append("")
    lines.append("| File | Age (hours) | Fresh? | Path |")
    lines.append("|---|---|---|---|")
    for row in state["freshness"]["files"]:
        age = row["age_hours"] if row["age_hours"] is not None else "missing"
        fresh = "no" if row["stale"] else "yes"
        lines.append(f"| {row['label']} | {age} | {fresh} | `{row['path']}` |")
    lines.append("")
    if state["freshness"]["warnings"]:
        lines.append("## State Warnings")
        lines.append("")
        for warning in state["freshness"]["warnings"]:
            lines.append(f"- {warning}")
        lines.append("")
    lines.append("## Yesterday's Workscore")
    lines.append("")
    y = state["yesterday"]
    postiz_counts = y["postiz"].get("counts", {})
    lines.append(f"- Draft files touched: **{y['drafts']['files_touched']}**")
    lines.append(f"- Draft posts approved / binned: **{y['drafts']['approved']} / {y['drafts']['binned']}**")
    lines.append(f"- Postiz published / queued / errored: **{postiz_counts.get('PUBLISHED', 0)} / {postiz_counts.get('QUEUE', 0)} / {postiz_counts.get('ERROR', 0)}**")
    lines.append(f"- SEO ships yesterday: **{y['seo']['shipped_count']}** from **{y['seo']['run_count']}** runs")
    lines.append(f"- Leadgen ships yesterday: **{y['leadgen']['shipped_count']}** from **{y['leadgen']['run_count']}** runs")
    dm = y["dm_triggers"]
    dm_status = "untracked" if not dm["tracked"] else f"{dm['fired']} fired / {dm['sent']} sent"
    lines.append(f"- DM trigger counts: **{dm_status}**")
    newsletter = state["this_week"]["newsletter"]
    lines.append(f"- Newsletter drafts this week: **{newsletter['drafts_created']}**")
    lines.append("")
    if state["tracking_gaps"]:
        lines.append("## Tracking Gaps")
        lines.append("")
        for item in state["tracking_gaps"]:
            lines.append(f"- {item}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def build_workscore(state: dict[str, Any]) -> dict[str, Any]:
    postiz_counts = state["yesterday"]["postiz"].get("counts", {})
    stale_count = len(state["freshness"]["warnings"])
    critical_paused = len(state["cron"]["critical_paused"])
    health = "healthy"
    if stale_count or critical_paused:
        health = "warning"
    if state["cron"].get("failed_jobs") or stale_count >= 3 or critical_paused >= 2:
        health = "critical"
    return {
        "generated_at": state["generated_at"],
        "health": health,
        "active_jobs": state["cron"]["active_jobs"],
        "paused_jobs": state["cron"]["paused_jobs"],
        "critical_paused": state["cron"]["critical_paused"],
        "stale_warning_count": stale_count,
        "yesterday": {
            "draft_files_touched": state["yesterday"]["drafts"]["files_touched"],
            "draft_posts_approved": state["yesterday"]["drafts"]["approved"],
            "draft_posts_binned": state["yesterday"]["drafts"]["binned"],
            "postiz_published": postiz_counts.get("PUBLISHED", 0),
            "postiz_queued": postiz_counts.get("QUEUE", 0),
            "postiz_error": postiz_counts.get("ERROR", 0),
            "seo_ships": state["yesterday"]["seo"]["shipped_count"],
            "leadgen_ships": state["yesterday"]["leadgen"]["shipped_count"],
        },
        "newsletter_drafts_this_week": state["this_week"]["newsletter"]["drafts_created"],
        "tracking_gaps": state["tracking_gaps"],
    }


def main() -> int:
    SHARED.mkdir(parents=True, exist_ok=True)
    state = build_state()
    markdown = render_markdown(state)
    workscore = build_workscore(state)
    OUT_MD.write_text(markdown, encoding="utf-8")
    OUT_JSON.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OUT_WORKSCORE.write_text(json.dumps(workscore, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    append_event(
        "state_refresh_completed",
        system="mission_control",
        status=workscore["health"],
        summary=f"Refreshed shared state ({workscore['stale_warning_count']} stale warnings, {state['cron']['active_jobs']} active jobs)",
        job_id="2368b32b272b",
        source="state_integrity_refresh.py",
        metrics={
            "stale_warning_count": workscore["stale_warning_count"],
            "active_jobs": state["cron"]["active_jobs"],
            "paused_jobs": state["cron"]["paused_jobs"],
            "postiz_published": workscore["yesterday"]["postiz_published"],
            "postiz_queued": workscore["yesterday"]["postiz_queued"],
            "seo_ships": workscore["yesterday"]["seo_ships"],
            "leadgen_ships": workscore["yesterday"]["leadgen_ships"],
        },
    )
    print(json.dumps({
        "ok": True,
        "generated_at": state["generated_at"],
        "outputs": [str(OUT_MD), str(OUT_JSON), str(OUT_WORKSCORE)],
        "health": workscore["health"],
        "stale_warning_count": workscore["stale_warning_count"],
        "critical_paused": workscore["critical_paused"],
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
