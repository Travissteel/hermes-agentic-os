#!/usr/bin/env python3
"""Harvest non-scripted ops events into events.jsonl.

Sources:
- Hermes cron output markdown for BSF / HF / leadgen agent jobs
- n8n event logs for X Keyword DM Automation workflow failures / sends
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path
from typing import Any

from lib.event_log import append_event

CRON_OUTPUT = Path("~/.hermes/cron/output").expanduser()
N8N_LOG = "/home/node/.n8n/n8nEventLog.log"
JOB_IDS = {
    "bsf": "bsf9e4f12c37a",
    "hf": "hf8b3e21a9c5f",
    "leadgen_launch": "6eb087089331",
    "leadgen_nightly": "df12e9368af7",
}


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        return ""


def latest_files(job_id: str, limit: int = 5) -> list[Path]:
    p = CRON_OUTPUT / job_id
    if not p.exists():
        return []
    return sorted(p.glob("*.md"), key=lambda x: x.stat().st_mtime, reverse=True)[:limit]


def extract(pattern: str, text: str, flags: int = 0) -> str | None:
    m = re.search(pattern, text, flags)
    return m.group(1).strip() if m else None


def response_section(text: str) -> str:
    marker = "## Response"
    if marker not in text:
        return text
    return text.split(marker, 1)[1].strip()


def harvest_bsf() -> int:
    added = 0
    for path in latest_files(JOB_IDS["bsf"]):
        text = response_section(read_text(path))
        commit = extract(r"`git rev-parse HEAD`\s*```text\s*([0-9a-f]{7,40})", text, re.S)
        shipped = extract(r"What shipped:\s*(.+)", text)
        build_passed = "npm run build` passed successfully" in text or "Build passed" in text
        if not commit or not shipped:
            continue
        event = append_event(
            "seo_ship",
            system="seo",
            status="shipped",
            summary=f"BSF shipped SEO update: {shipped}",
            job_id=JOB_IDS["bsf"],
            brand="Business Software Finder",
            platform="web",
            asset_id=commit,
            source=str(path),
            metrics={"commit": commit, "build_passed": build_passed, "path": str(path)},
            dedupe_key=f"seo:bsf:{commit}",
        )
        if event:
            added += 1
    return added


def harvest_hf() -> int:
    added = 0
    for path in latest_files(JOB_IDS["hf"]):
        text = response_section(read_text(path))
        commit = extract(r"remote verified at `([0-9a-f]{7,40})`", text)
        queue_item = extract(r"\*\*Queue item taken:\*\*\s*(.+)", text)
        shipped = extract(r"\*\*What shipped:\*\*\s*(.+)", text)
        build_status = extract(r"- Build status:\s*`([^`]+)`", text)
        if not commit or not shipped:
            continue
        event = append_event(
            "seo_ship",
            system="seo",
            status="shipped",
            summary=f"HF shipped SEO update: {shipped}",
            job_id=JOB_IDS["hf"],
            brand="Hypnotherapy Finder",
            platform="web",
            asset_id=commit,
            source=str(path),
            metrics={
                "commit": commit,
                "queue_item": queue_item,
                "build_status": build_status,
                "path": str(path),
            },
            dedupe_key=f"seo:hf:{commit}",
        )
        if event:
            added += 1
    return added


def harvest_leadgen() -> int:
    added = 0
    for key in ("leadgen_launch", "leadgen_nightly"):
        for path in latest_files(JOB_IDS[key], limit=8):
            text = response_section(read_text(path))
            sites_advanced = extract(r"Advanced \*\*(\d+) launching sites\*\*", text)
            mode = "INDEXATION" if "INDEXATION" in text else None
            blocks = re.findall(r"###\s+([^\n]+)\n(.*?)(?=\n###\s+|\Z)", text, re.S)
            if not blocks:
                slug = extract(r"\*\*(?:INDEXATION\s+—\s+)?([a-z0-9-]+)\*\*", text)
                if slug:
                    blocks = [(slug, text)]
            for site, block in blocks:
                site = site.strip()
                if not re.fullmatch(r"[a-z0-9-]+", site):
                    continue
                commit = extract(r"```text\s*([0-9a-f]{7,40})", block, re.S)
                live = extract(r"live=(\d+)", block)
                summary = f"Leadgen updated {site.strip()}"
                if mode:
                    summary += f" in {mode} mode"
                event = append_event(
                    "leadgen_ship",
                    system="leadgen",
                    status="shipped",
                    summary=summary,
                    job_id=JOB_IDS[key],
                    brand=site.strip(),
                    platform="web",
                    asset_id=commit or f"{path.name}:{site.strip()}",
                    source=str(path),
                    metrics={
                        "site": site.strip(),
                        "mode": mode,
                        "live_status": live,
                        "sites_advanced": int(sites_advanced) if sites_advanced else None,
                        "path": str(path),
                    },
                    dedupe_key=f"leadgen:{site.strip()}:{commit or path.name}",
                )
                if event:
                    added += 1
    return added


def read_n8n_tail(lines: int = 400) -> list[dict[str, Any]]:
    cmd = ["docker", "exec", "n8n", "sh", "-lc", f"tail -n {lines} {N8N_LOG} 2>/dev/null || true"]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    out: list[dict[str, Any]] = []
    for line in proc.stdout.splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            out.append(json.loads(line))
        except Exception:
            continue
    return out


def harvest_dm() -> int:
    added = 0
    rows = read_n8n_tail()
    for row in rows:
        name = row.get("eventName") or ""
        payload = row.get("payload") or {}
        if payload.get("workflowName") != "X Keyword DM Automation":
            continue
        execution_id = str(payload.get("executionId") or "")
        ts = row.get("ts") or ""
        if name == "n8n.workflow.failed":
            error = payload.get("errorMessage") or "unknown"
            event = append_event(
                "dm_trigger_failed",
                system="n8n_dm",
                status="error",
                summary=f"X Keyword DM Automation failed: {error}",
                brand="AgoristAlchemy",
                platform="X",
                asset_id=execution_id,
                source="n8nEventLog.log",
                metrics={"execution_id": execution_id, "error": error, "ts": ts},
                dedupe_key=f"dmfail:{execution_id}",
            )
            if event:
                added += 1
        elif name == "n8n.workflow.started":
            event = append_event(
                "dm_trigger_scan_started",
                system="n8n_dm",
                status="started",
                summary="X Keyword DM Automation scan started",
                brand="AgoristAlchemy",
                platform="X",
                asset_id=execution_id,
                source="n8nEventLog.log",
                metrics={"execution_id": execution_id, "ts": ts},
                dedupe_key=f"dmscan:{execution_id}",
            )
            if event:
                added += 1
        elif name == "n8n.node.finished" and payload.get("nodeName") == "Send DM via X API":
            event = append_event(
                "dm_send_node_completed",
                system="n8n_dm",
                status="node_completed",
                summary="X DM send node finished",
                brand="AgoristAlchemy",
                platform="X",
                asset_id=execution_id,
                source="n8nEventLog.log",
                metrics={"execution_id": execution_id, "ts": ts},
                dedupe_key=f"dmsent:{execution_id}:{payload.get('nodeId')}",
            )
            if event:
                added += 1
    return added


def main() -> int:
    added = {
        "site_changes": __import__("harvest_site_changes").harvest(),
        "seo_hf": 0,
        "leadgen": 0,
        "dm": harvest_dm(),
    }
    print(json.dumps({"ok": True, "added": added, "total_added": sum(added.values())}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
