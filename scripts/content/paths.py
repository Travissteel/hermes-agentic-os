"""Repo-relative locations for the content pipeline."""

from __future__ import annotations

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def voice_prompt_path() -> Path:
    override = os.environ.get("CONTENT_LEAD_VOICE_PROMPT")
    if override:
        return Path(override).expanduser()
    return REPO_ROOT / "content" / "voice" / "content-lead-voice-prompt.txt"


def research_config_path() -> Path:
    override = os.environ.get("CONTENT_RESEARCH_INPUTS")
    if override:
        return Path(override).expanduser()
    return REPO_ROOT / "content" / "research-inputs.json"


def default_playbook_path() -> Path:
    override = os.environ.get("CONTENT_X_PLAYBOOK")
    if override:
        return Path(override).expanduser()
    return Path.home() / "brain" / "Content" / "Long_Form_X_Post_Playbook.md"


def change_ledger_path() -> Path:
    override = os.environ.get("ANTIGRAVITY_CHANGE_LOG")
    if override:
        return Path(override).expanduser()
    return REPO_ROOT / "shared" / "change-log.jsonl"


def change_cursor_path() -> Path:
    override = os.environ.get("ANTIGRAVITY_CHANGE_CURSOR")
    if override:
        return Path(override).expanduser()
    return REPO_ROOT / "shared" / "change-report-cursor.json"


def research_manifest_path() -> Path:
    override = os.environ.get("CONTENT_RESEARCH_MANIFEST")
    if override:
        return Path(override).expanduser()
    return REPO_ROOT / "shared" / "content-inputs" / "resolved.json"
