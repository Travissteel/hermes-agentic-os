#!/usr/bin/env python3
"""
content_ideas_research.py

Pulls RSS feeds + Jina scrapes + Tavily search + recent x_research JSONL
→ synthesizes structured content captures via OpenRouter
→ writes per-niche daily research notes to ~/brain/Content/Research/
→ prints human-readable summary for Telegram delivery

Each captured item includes:
  link, platform, author, date, raw_text, engagement, hook_type,
  topic_tag, why_it_worked, rewrite_in_voice

Runs Mon + Thu at 10am via Hermes cron (no-agent, stdout → Telegram).
"""

import json
import os
import re
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta

TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")
BRAIN_VAULT = os.path.expanduser("~/brain")
RESEARCH_DIR = os.path.join(BRAIN_VAULT, "Content", "Research")
IDEAS_FILE = os.path.join(BRAIN_VAULT, "Content", "Ideas.md")
X_RESEARCH_DIR = os.path.expanduser("~/.hermes/memories/x_research")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "")
SYNTHESIS_MODEL = "google/gemini-2.0-flash-001"  # OpenRouter fallback only

# Hook pattern taxonomy — must match ~/brain/Content/Long_Form_X_Post_Playbook.md §2.1
# and content_weekly_synthesis.py HOOK_PATTERNS. Daily research notes use these labels
# so the downstream weekly synthesis + draft generator share one vocabulary.
HOOK_PATTERN_NAMES = [
    "reframe",
    "counter_intuitive_claim",
    "confession_with_stack",
    "named_contrast",
    "pattern_interrupt",
    "diagnostic",
    "trigger_event",
    "insider_mechanism",
    "cost_number_anchor",
    "question_that_answers_itself",
]

NICHES = {
    "ai_business": {
        "label": "AI Business / Solopreneur",
        "topic_tags": ["AI biz", "lead gen", "tools", "pipeline", "repo breakdowns", "vibe coding"],
        "brain_section": "## X / Social",
        "rss": [
            "https://ai.gopubby.com/feed",
            "https://medium.com/feed/@nitinfab",
            "https://medium.com/feed/@leverageai",
            "https://medium.com/feed/@zhukov.vladimir",
            "https://medium.com/feed/@studygoating",
            "https://medium.com/feed/@mubasharalima189",
            "https://medium.com/feed/@salesscientist",
            "https://medium.com/feed/@travisnicholson",
            "https://www.reddit.com/r/artificial/.rss?limit=25",
            "https://www.reddit.com/r/Entrepreneur/.rss?limit=25",
            "https://www.reddit.com/r/singularity/.rss?limit=25",
        ],
        "jina": [
            "https://ifttt.com/explore/stories",
            "https://www.therundown.ai",
        ],
        "tavily_query": "trending open source AI repos GitHub solopreneur automation tools 2026",
    },
    "repo_watch": {
        "label": "Repo Watch / Open Source Tools",
        "topic_tags": ["repo breakdowns", "tools", "AI biz", "pipeline"],
        "brain_section": "## X / Social",
        "rss": [
            "https://www.reddit.com/r/OpenSource/.rss?limit=25",
            "https://www.reddit.com/r/selfhosted/.rss?limit=25",
            "https://www.reddit.com/r/LocalLLaMA/.rss?limit=25",
        ],
        "jina": [
            "https://github.com/trending?since=weekly",
            "https://github.com/trending/python?since=weekly",
        ],
        "tavily_query": "latest useful valuable open source AI GitHub repos agents automation workflows 2026",
    },
    "books_publishing": {
        "label": "Books / Indie Publishing",
        "topic_tags": ["lead gen", "nurturing", "pipeline"],
        "brain_section": "## Newsletter (Fiction)",
        "rss": [
            "https://medium.com/feed/@jsdunlop",
            "https://medium.com/feed/@thecreenomad",
            "https://medium.com/feed/@mybookcave",
            "https://medium.com/feed/@clnichols",
            "https://www.reddit.com/r/KindlePublishing/.rss?limit=25",
            "https://www.reddit.com/r/selfpublish/.rss?limit=25",
            "https://www.reddit.com/r/scifi/.rss?limit=25",
        ],
        "jina": [],
        "tavily_query": "indie author kindle publishing marketing strategies 2026",
    },
    "hypnotherapy": {
        "label": "Hypnotherapy / Mind Reprogramming",
        "topic_tags": ["lead gen", "nurturing", "closing"],
        "brain_section": "## X / Social",
        "rss": [
            "https://www.reddit.com/r/hypnotherapy/.rss?limit=25",
            "https://www.reddit.com/r/consciousness/.rss?limit=25",
            "https://www.reddit.com/r/spirituality/.rss?limit=25",
        ],
        "jina": [],
        "tavily_query": "hypnotherapy subconscious mind reprogramming trending topics 2026",
    },
    "scifi_spiritual": {
        "label": "Sci-Fi / Consciousness / Spiritual",
        "topic_tags": ["nurturing", "vibe coding"],
        "brain_section": "## Newsletter (Fiction)",
        "rss": [
            "https://www.reddit.com/r/Futurology/.rss?limit=25",
            "https://www.reddit.com/r/consciousness/.rss?limit=15",
        ],
        "jina": [],
        "tavily_query": "simulation theory consciousness awakening spiritual fiction trending 2026",
    },
}


# ── RSS / XML parsing ────────────────────────────────────────────────────────

def _text(el, tag):
    child = el.find(tag)
    return child.text.strip() if child is not None and child.text else ""


def parse_rss_feed(url: str, max_items: int = 15) -> list[dict]:
    """Fetch RSS/Atom feed, return list of {title, link, author, date}."""
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; ContentResearchBot/1.0)",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=12) as r:
            raw = r.read()
    except Exception:
        return []

    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        return []

    items = []

    # RSS 2.0
    for item in root.findall(".//item"):
        title = _text(item, "title")
        if not title or len(title) < 10:
            continue
        link = _text(item, "link") or _text(item, "guid")
        author = _text(item, "author") or _text(item, "dc:creator") or ""
        pub_date = _text(item, "pubDate") or ""
        items.append({"title": title, "link": link, "author": author, "date": pub_date[:16], "source": url})
        if len(items) >= max_items:
            break

    # Atom
    if not items:
        for entry in root.findall(".//{http://www.w3.org/2005/Atom}entry"):
            t_el = entry.find("{http://www.w3.org/2005/Atom}title")
            title = t_el.text.strip() if t_el is not None and t_el.text else ""
            if not title or len(title) < 10:
                continue
            l_el = entry.find("{http://www.w3.org/2005/Atom}link")
            link = l_el.get("href", "") if l_el is not None else ""
            a_el = entry.find(".//{http://www.w3.org/2005/Atom}name")
            author = a_el.text.strip() if a_el is not None and a_el.text else ""
            d_el = entry.find("{http://www.w3.org/2005/Atom}updated")
            if d_el is None:
                d_el = entry.find("{http://www.w3.org/2005/Atom}published")
            date = d_el.text[:10] if d_el is not None and d_el.text else ""
            items.append({"title": title, "link": link, "author": author, "date": date, "source": url})
            if len(items) >= max_items:
                break

    return items


# ── Jina scraping ────────────────────────────────────────────────────────────

def jina_scrape(url: str, max_items: int = 15) -> list[dict]:
    """Use Jina reader to extract article-title-like lines from a page."""
    jina_url = f"https://r.jina.ai/{url}"
    headers = {"User-Agent": "Mozilla/5.0 (compatible; ContentResearchBot/1.0)"}
    try:
        req = urllib.request.Request(jina_url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as r:
            text = r.read().decode("utf-8", errors="replace")
    except Exception:
        return []

    items = []
    for line in text.splitlines():
        line = line.strip()
        if 12 < len(line) < 120 and not line.startswith("http") and not line.startswith("#") and not line.startswith("[") and line.count(" ") >= 2:
            items.append({"title": line, "link": url, "author": "", "date": TODAY, "source": url})
        if len(items) >= max_items:
            break
    return items


# ── Tavily search ────────────────────────────────────────────────────────────

def tavily_search(query: str) -> list[dict]:
    """Return structured results from a Tavily search."""
    if not TAVILY_API_KEY:
        return []
    payload = json.dumps({
        "api_key": TAVILY_API_KEY,
        "query": query,
        "max_results": 6,
        "search_depth": "basic",
    }).encode()
    req = urllib.request.Request(
        "https://api.tavily.com/search",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read())
        items = []
        for item in data.get("results", []):
            title = item.get("title", "").strip()
            if title:
                items.append({
                    "title": title,
                    "link": item.get("url", ""),
                    "author": "",
                    "date": TODAY,
                    "snippet": item.get("content", "")[:200],
                    "source": "tavily",
                })
        return items
    except Exception:
        return []


# ── x_research JSONL ─────────────────────────────────────────────────────────

def load_recent_x_research(niche: str, days: int = 7) -> list[dict]:
    """Return top viral posts for a niche from the last N days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    posts = []
    if not os.path.isdir(X_RESEARCH_DIR):
        return []
    for fname in sorted(os.listdir(X_RESEARCH_DIR), reverse=True):
        if niche not in fname or not fname.endswith(".jsonl"):
            continue
        date_str = fname.split("_")[0]
        try:
            fdate = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            continue
        if fdate < cutoff:
            break
        path = os.path.join(X_RESEARCH_DIR, fname)
        with open(path, encoding="utf-8") as f:
            for line in f:
                try:
                    rec = json.loads(line)
                    text = rec.get("text", "").strip()
                    if not text or len(text) < 20:
                        continue
                    posts.append({
                        "title": text[:140],
                        "link": f"https://x.com/i/web/status/{rec.get('id', '')}",
                        "author": rec.get("author", {}).get("username", ""),
                        "date": (rec.get("created_at") or TODAY)[:10],
                        "engagement": rec.get("metrics", {}),
                        "source": "x_research",
                    })
                except json.JSONDecodeError:
                    pass
    return posts[:12]


# ── LLM synthesis ────────────────────────────────────────────────────────────

def _build_synthesis_prompt(niche_label: str, topic_tags: list[str], raw_items: list[dict]) -> str:
    tag_list = ", ".join(topic_tags)
    pattern_list = ", ".join(HOOK_PATTERN_NAMES)
    items_text = "\n".join(
        f"[{i+1}] {it['title']} | src={it.get('source','?')} | author={it.get('author','?')} | link={it.get('link','')}"
        for i, it in enumerate(raw_items[:35])
    )

    return f"""You are a content strategist for @AgoristAlchemy (X/Twitter). Voice: contrarian, specific, already-opted-out energy. Agorism meets AI.

Niche: {niche_label}
Valid topic tags: {tag_list}

Hook pattern taxonomy (from ~/brain/Content/Long_Form_X_Post_Playbook.md §2.1) — pick exactly ONE name per item:
{pattern_list}

Below are recent article titles, Reddit posts, GitHub-adjacent signals, and viral X posts from this niche:

{items_text}

Pick the 6 BEST signals for content inspiration. Prioritize source items about valuable, useful, or newly notable repos/tools when they are present. For each, output a single JSON object on its own line with these exact keys:
- "source_index": the [N] number above
- "platform": where it came from (X, Reddit, Medium, Blog, Web)
- "author": author handle or name (from the src line, or "unknown")
- "link": the URL
- "raw_text": the title/text verbatim (copy exactly from above)
- "engagement": brief string like "high virality" or "top Reddit" or "trending search" (infer from source)
- "hook_pattern": ONE name from the taxonomy above. Pick the closest match. Never blend, never pipe-list.
- "topic_tag": one of the valid tags above. Use "repo breakdowns" whenever the source is primarily about a GitHub repo, open-source project, SDK, library, plugin, or framework.
- "why_it_worked": 1 sentence — what emotional trigger or structural pattern makes this work
- "rewrite": a ready-to-post rewrite in Travis's voice. Rules:
  * Follow the 5-beat playbook anatomy: Hook (1–2 lines, follow the chosen hook_pattern's shape) → Context (2–4 lines) → Core idea (one paragraph naming a specific tool, repo, number, or mechanism) → Payoff (a screenshot-able landing line).
  * Must contain at least 2 of: a number, a named tool/workflow, a concrete mechanism, a falsifiable claim, a specific scenario.
  * Hard banned phrases: "Here's the play", "Steal this", "game changer", "leverage", "unlock", "10x", "in today's world", "unpopular opinion", "hot take", "here are N tips", "let's be real", "as a senior content strategist", "we'll be focusing", "keeping things fresh".
  * Hard banned structure: [vague claim] → [3-step framework] → bullet list. If you find yourself writing this, stop and rewrite from a specific incident instead.
  * Voice: already opted out, reporting back from the other side. NOT explaining a concept. NOT a framework. A specific observation or incident.

Return ONLY the 6 JSON objects, one per line, no markdown, no other text."""


def _extract_jsonl_objects(text: str) -> list[dict]:
    """Pull every top-level JSON object out of mixed text. Tolerates code fences, blank lines,
    and minor prose. Each object must be on its own line OR be the only thing in a fence."""
    # Strip outer code fence if the whole payload is wrapped
    fenced = re.match(r"```(?:json)?\s*(.*?)\s*```\s*$", text.strip(), re.DOTALL)
    if fenced:
        text = fenced.group(1)
    captures: list[dict] = []
    for line in text.splitlines():
        line = line.strip().rstrip(",")
        if line.startswith("{") and line.endswith("}"):
            try:
                captures.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    # Some models emit a JSON array instead of JSONL — try that as a fallback
    if not captures:
        try:
            obj = json.loads(text)
            if isinstance(obj, list):
                captures = [o for o in obj if isinstance(o, dict)]
        except json.JSONDecodeError:
            pass
    return captures


def _call_hermes_oneshot(prompt: str) -> tuple[list[dict], str]:
    """Run the synthesis through Hermes (configured model via OpenAI subscription).
    Returns (captures, error_message). error_message is '' on success."""
    wrapped = (
        "Respond with ONLY 6 JSON objects, one per line. "
        "No preamble, no markdown fence, no explanation, no trailing prose.\n\n"
        + prompt
    )
    try:
        result = subprocess.run(
            ["hermes", "-z", wrapped, "--ignore-rules"],
            capture_output=True,
            text=True,
            timeout=600,
        )
    except subprocess.TimeoutExpired:
        return [], "hermes -z timed out after 600s"
    except FileNotFoundError:
        return [], "hermes CLI not on PATH"

    if result.returncode != 0:
        return [], f"hermes exit {result.returncode}: {(result.stderr or '').strip()[:300]}"
    captures = _extract_jsonl_objects(result.stdout or "")
    if not captures:
        return [], f"no JSON objects parsed from response (first 200 chars: {(result.stdout or '')[:200]!r})"
    return captures, ""


def _call_openrouter(prompt: str) -> tuple[list[dict], str]:
    """OpenRouter fallback."""
    if not OPENROUTER_API_KEY:
        return [], "OPENROUTER_API_KEY not set"
    payload = json.dumps({
        "model": SYNTHESIS_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.75,
        "max_tokens": 1400,
    }).encode()
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/hermes-agent",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            data = json.loads(r.read())
        content = data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return [], f"openrouter error: {e}"
    captures = _extract_jsonl_objects(content)
    if not captures:
        return [], "openrouter returned no parseable JSON objects"
    return captures, ""


def synthesize_captures(niche_label: str, topic_tags: list[str], raw_items: list[dict]) -> list[dict]:
    """Produce structured 9-field captures from raw signals. Backend order:
    1. Hermes one-shot (configured model via OpenAI subscription) — primary
    2. OpenRouter (gemini-2.0-flash-001) — fallback
    Override primary with RESEARCH_BACKEND=openrouter."""
    if not raw_items:
        return []

    prompt = _build_synthesis_prompt(niche_label, topic_tags, raw_items)
    backend = os.environ.get("RESEARCH_BACKEND", "hermes").lower()

    last_err = ""
    if backend == "hermes":
        captures, last_err = _call_hermes_oneshot(prompt)
        if captures:
            return captures
        # Fall through to OpenRouter if Hermes failed and OR is configured
        if OPENROUTER_API_KEY:
            print(f"    Hermes failed ({last_err}) — falling back to OpenRouter", flush=True)
            captures, last_err = _call_openrouter(prompt)
            if captures:
                return captures
    else:
        captures, last_err = _call_openrouter(prompt)
        if captures:
            return captures

    raise ValueError(f"Synthesis failed: {last_err}")


# ── Daily research note writer ───────────────────────────────────────────────

def write_daily_note(niche_key: str, niche_cfg: dict, captures: list[dict]) -> str:
    """Write per-niche daily research note to ~/brain/Content/Research/."""
    from lib.cron_quality import validate_captures
    validate_captures(captures)
    os.makedirs(RESEARCH_DIR, exist_ok=True)
    path = os.path.join(RESEARCH_DIR, f"{TODAY}_{niche_key}.md")

    if os.path.exists(path):
        existing = open(path, encoding="utf-8").read()
        if "synthesis failed" not in existing.lower() and "**Link:** http" in existing:
            return path  # preserve an existing usable note

    lines = [
        f"# {niche_cfg['label']} — {TODAY}",
        "",
        f"_Generated by content_ideas_research.py — {len(captures)} captures_",
        "",
    ]

    for i, c in enumerate(captures, 1):
        pattern = c.get("hook_pattern") or c.get("hook_type", "")
        lines += [
            f"## [{i}] {c.get('raw_text', '')[:80]}",
            "",
            f"- **Link:** {c.get('link', '')}",
            f"- **Platform:** {c.get('platform', '')}",
            f"- **Author:** {c.get('author', '')}",
            f"- **Date:** {c.get('date', TODAY)}",
            f"- **Engagement:** {c.get('engagement', '')}",
            f"- **Hook pattern:** {pattern}",
            f"- **Topic tag:** {c.get('topic_tag', '')}",
            f"- **Why it worked:** {c.get('why_it_worked', '')}",
            "",
            f"**Rewrite in voice:**",
            f"> {c.get('rewrite', '')}",
            "",
        ]

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return path


def update_ideas_md(niche_cfg: dict, captures: list[dict]) -> None:
    """Keep Ideas.md updated with latest hooks as a quick-reference index."""
    os.makedirs(os.path.dirname(IDEAS_FILE), exist_ok=True)
    if not os.path.exists(IDEAS_FILE):
        with open(IDEAS_FILE, "w") as f:
            f.write("# Content Ideas\n\nDrop raw ideas here. Hermes will pull from this when planning content.\n\n## X / Social\n\n## Newsletter (UGS)\n\n## Newsletter (Fiction)\n\n## BSF Articles\n")

    with open(IDEAS_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    header = f"### {TODAY} — {niche_cfg['label']}"
    if header in content:
        return

    lines = [f"\n{header}\n"]
    for c in captures:
        rewrite = c.get("rewrite", "").strip()
        pattern = c.get("hook_pattern") or c.get("hook_type", "")
        topic_tag = c.get("topic_tag", "")
        why = c.get("why_it_worked", "")
        if rewrite:
            first_line = rewrite.split("\n")[0][:120]
            lines.append(f"- **Hook:** {first_line}")
            lines.append(f"  **Why:** {why}")
            lines.append(f"  **Pattern:** {pattern} / **Tag:** {topic_tag}")
            lines.append("")

    block = "\n".join(lines)
    section = niche_cfg["brain_section"]
    if section in content:
        content = content.replace(section, section + "\n" + block, 1)
    else:
        content += f"\n{section}\n{block}"

    with open(IDEAS_FILE, "w", encoding="utf-8") as f:
        f.write(content)


# ── Main ──────────────────────────────────────────────────────────────────────

def gather_raw_items(niche_key: str, cfg: dict) -> list[dict]:
    items: list[dict] = []

    for feed_url in cfg["rss"]:
        items.extend(parse_rss_feed(feed_url))
        time.sleep(0.4)

    for page_url in cfg.get("jina", []):
        items.extend(jina_scrape(page_url))
        time.sleep(0.6)

    items.extend(tavily_search(cfg["tavily_query"]))
    items.extend(load_recent_x_research(niche_key))

    # Dedupe by title prefix
    seen: set[str] = set()
    unique = []
    for it in items:
        key = it["title"][:60].lower()
        if key not in seen:
            seen.add(key)
            unique.append(it)

    return unique


def main() -> int:
    report_lines = [f"📋 *Content Research* — {TODAY}\n"]
    total = 0
    failures = []

    for niche_key, cfg in NICHES.items():
        print(f"  [{niche_key}] gathering...", flush=True)
        raw = gather_raw_items(niche_key, cfg)
        print(f"  [{niche_key}] {len(raw)} signals → synthesizing...", flush=True)

        try:
            captures = synthesize_captures(cfg["label"], cfg["topic_tags"], raw)
            from lib.cron_quality import validate_captures
            validate_captures(captures)
        except Exception as exc:
            failures.append(niche_key)
            report_lines.append(f"{cfg['label']}: FAILED ({exc}); prior notes preserved")
            continue
        note_path = write_daily_note(niche_key, cfg, captures)
        update_ideas_md(cfg, captures)
        total += len(captures)

        report_lines.append(f"*{cfg['label']}* — {len(captures)} captures → `{os.path.basename(note_path)}`")
        for c in captures[:2]:
            rw = c.get("rewrite", "")
            if rw:
                report_lines.append(f"  • {rw[:90]}…")
        report_lines.append("")
        time.sleep(1.0)

    report_lines.append(f"✅ {total} captures written to brain/Content/Research/")
    report_lines.append(f"📝 Ideas.md updated")
    print("\n".join(report_lines))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
