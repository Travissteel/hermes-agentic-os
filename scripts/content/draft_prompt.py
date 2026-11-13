"""Assemble the weekly draft prompt from the approved voice plus safe playbook bits."""

from __future__ import annotations

import re
from pathlib import Path

from content.paths import voice_prompt_path

# Lines or sections that carry the old hook taxonomy. Structure headings such
# as "Anatomy" stay. A mention of the banned hook names is enough to drop a
# heading; inside a kept section only the conflicting lines are removed.
_CONFLICT = re.compile(
    r"named_contrast|\breframes?\b|"
    r"contrarian,\s*specific,\s*already-opted-out|"
    r"hook taxonomy",
    re.IGNORECASE,
)

_OWNER_LENGTH = (
    "OWNER OVERRIDE (2026-11-13): Full-length posts are allowed on X Premium "
    "(about 4000 characters). Do not apply the 80-300 word self-check as a cap, "
    "and do not shorten a draft to satisfy it. Every HARD BAN still rejects the draft."
)

_HOOK_BAN = (
    "Do not use named_contrast or reframe hooks. "
    'Contrast-reframes ("not X, it\'s Y", "X isn\'t Y. It\'s Z", "Not X. Y.", '
    '"less X, more Y", "This isn\'t about X") are hard bans. '
    "Keep playbook structure only where it does not conflict with the voice prompt."
)


def load_voice_prompt(path: Path | None = None) -> str:
    file = path or voice_prompt_path()
    text = file.read_text(encoding="utf-8")
    if not text.startswith("You are drafting X posts for Travis Steel (@AgoristAlchemy)."):
        raise ValueError(f"{file} is not the approved Content Lead voice prompt")
    return text


def filter_playbook(text: str) -> str:
    """Drop hook-taxonomy sections and lines that conflict with the hard bans."""
    if not text or not text.strip():
        return ""
    parts = re.split(r"(?=^#{1,6}\s+)", text, flags=re.MULTILINE)
    kept: list[str] = []
    for part in parts:
        if not part.strip():
            continue
        lines = part.splitlines()
        heading = lines[0] if lines and lines[0].lstrip().startswith("#") else ""
        if heading and _CONFLICT.search(heading):
            continue
        filtered = [line for line in lines if not _CONFLICT.search(line)]
        body = "\n".join(filtered).strip()
        if not body or (heading and body == heading.strip()):
            continue
        kept.append(body)
    return "\n\n".join(kept).strip()


def assemble_prompt(voice: str, playbook: str | None = None) -> str:
    """Voice text is the prefix, unchanged. Playbook structure follows only if it survives the filter."""
    voice_body = voice.rstrip("\n")
    kept = filter_playbook(playbook or "")
    if kept:
        structure = kept
    else:
        structure = (
            "No non-conflicting playbook sections were supplied. "
            "Use STRUCTURE in the voice prompt."
        )
    return (
        f"{voice_body}\n\n"
        f"---\n"
        f"{_OWNER_LENGTH}\n\n"
        f"PLAYBOOK STRUCTURE KEPT\n"
        f"{_HOOK_BAN}\n\n"
        f"{structure}\n"
    )


def assemble_from_files(voice_file: Path | None = None, playbook_file: Path | None = None) -> str:
    voice = load_voice_prompt(voice_file)
    playbook = ""
    if playbook_file is not None and playbook_file.is_file():
        playbook = playbook_file.read_text(encoding="utf-8")
    return assemble_prompt(voice, playbook)
