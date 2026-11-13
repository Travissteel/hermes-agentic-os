"""Pull post text out of the weekly drafts JSON the scheduler already reads.

The on-disk shape of ~/.hermes/drafts/<date>_week.json is not in this repo.
The loader accepts the shapes that show up in that slot: a string, a list of
strings, or objects with text/content/body/post/copy, including a top-level
drafts/posts/items/entries list. Hook + body are joined in reading order.
"""

from __future__ import annotations

import json
from pathlib import Path


_LIST_KEYS = ("drafts", "posts", "items", "entries")
_TEXT_KEYS = ("text", "content", "body", "post", "copy", "draft")


def load_drafts(path: Path) -> list[tuple[str, str]]:
    raw = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".json" or raw.lstrip()[:1] in "{[":
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError(f"{path}: invalid JSON ({exc})") from exc
        found = extract_drafts(data)
        if not found:
            raise ValueError(
                f"{path}: JSON has no draft text fields "
                "(expected drafts/posts/items/entries or text/content/body)"
            )
        return found
    if not raw.strip():
        raise ValueError(f"{path}: draft file is empty")
    return [("text", raw)]


def extract_drafts(data: object, label: str = "draft") -> list[tuple[str, str]]:
    if isinstance(data, str):
        return [(label, data)] if data.strip() else []
    if isinstance(data, list):
        found: list[tuple[str, str]] = []
        for index, item in enumerate(data):
            found.extend(extract_drafts(item, f"{label}[{index}]"))
        return found
    if isinstance(data, dict):
        for key in _LIST_KEYS:
            if isinstance(data.get(key), list):
                return extract_drafts(data[key], key)
        hook = data.get("hook")
        body = next(
            (data.get(key) for key in ("body", "text", "content", "post", "copy") if isinstance(data.get(key), str)),
            None,
        )
        if isinstance(hook, str) and isinstance(body, str) and hook.strip() and body.strip():
            if hook.strip() not in body:
                return [(label, hook.rstrip() + "\n\n" + body.lstrip())]
            return [(label, body)]
        for key in _TEXT_KEYS:
            value = data.get(key)
            if isinstance(value, str) and value.strip():
                return [(label, value)]
    return []
