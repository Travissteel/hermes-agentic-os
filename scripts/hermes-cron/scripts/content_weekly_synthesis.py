#!/usr/bin/env python3
"""
content_weekly_synthesis.py

Reads the week's daily research notes from ~/brain/Content/Research/
→ synthesizes via OpenRouter:
    - 10 best hooks (ranked, with hook_type + topic_tag)
    - 5 ready-to-schedule draft posts in Travis's voice
    - 2 promo slots (BOOK / RESONANCE)
→ writes ~/brain/Content/Weekly_Synthesis_YYYY-MM-DD.md
→ prints summary for Telegram

Runs Sunday 6:30am — after x-research (6am), before draft generator (7am).
"""

import json
import os
import re
import subprocess
import urllib.request
from datetime import datetime, timezone, timedelta

TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")
WEEK_START = (datetime.now(timezone.utc) - timedelta(days=6)).strftime("%Y-%m-%d")
RESEARCH_DIR = os.path.expanduser("~/brain/Content/Research")
BRAIN_VAULT = os.path.expanduser("~/brain")
OUT_FILE = os.path.join(BRAIN_VAULT, "Content", f"Weekly_Synthesis_{TODAY}.md")
PLAYBOOK_PATH = os.path.expanduser("~/brain/Content/Long_Form_X_Post_Playbook.md")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")

# Prefer local Qwen via Ollama (no API key required) when available.
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
# qwen2.5:7b is installed but can be too slow on this box for batch synthesis.
# Default to the fast local model; override with OLLAMA_MODEL if you want.
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:0.5b")

# Fallback model if OpenRouter is configured in the environment.
SYNTHESIS_MODEL = "google/gemini-2.0-flash-001"

PROMO = {
    "BOOK": {
        "title": "The Last Employee",
        "trigger": "comment BOOK",
        "link": "https://travissteel.net/the-last-employee",
        "angle": "Running a solo AI business — you are the last employee your business ever needs",
    },
    "RESONANCE": {
        "title": "The Resonance Field (Book 1: The First Signal)",
        "trigger": "comment RESONANCE",
        "link": "https://rebrand.ly/resonancefield",
        "angle": "Spiritual sci-fi — consciousness, simulation theory, first contact with something larger",
    },
}

REPO_CTA = {
    "trigger": "comment REPO",
    "purpose": "send repo/resource links via DM when a repo post would get crowded with raw URLs",
}

# Source of truth: ~/brain/Content/Long_Form_X_Post_Playbook.md §2.1
# Picked per-draft deterministically so the model never sees a pipe-list to copy.
HOOK_PATTERNS = [
    {
        "name": "reframe",
        "formula": "[Common belief] is wrong. It's actually [X].",
        "example": "The system doesn't own your skills. It owns your schedule.",
    },
    {
        "name": "counter_intuitive_claim",
        "formula": "[Action everyone does] is the problem, not the solution.",
        "example": "Most people hire to fix a capacity problem. They're wrong about the problem.",
    },
    {
        "name": "confession_with_stack",
        "formula": "Someone asked me [X] last week. Here's the un-aspirational version.",
        "example": "Someone asked me to break down my actual AI stack. Not the aspirational version — the one actually running.",
    },
    {
        "name": "named_contrast",
        "formula": "[Thing A] > [Thing B]. Here's why.",
        "example": "Memory > prompting. One is a moat. The other is a feature.",
    },
    {
        "name": "pattern_interrupt",
        "formula": "[Sharp definitional claim that reframes a category].",
        "example": "If an agent cannot remember what happened on Tuesday, it is not a teammate. It is autocomplete with good branding.",
    },
    {
        "name": "diagnostic",
        "formula": "There's a particular [feeling/pattern] that doesn't have a name.",
        "example": "There's a particular kind of unease that doesn't have a name.",
    },
    {
        "name": "trigger_event",
        "formula": "[Specific event happened]. Here's what it actually means.",
        "example": "Anthropic released 31 ready-to-use Claude skills. 382,000 downloads in 24 hours.",
    },
    {
        "name": "insider_mechanism",
        "formula": "Most people use [X] like [wrong model]. The real move is [right model].",
        "example": "Most people use AI like an intern with amnesia. The real leverage is a system that remembers.",
    },
    {
        "name": "cost_number_anchor",
        "formula": "[Specific dollar/time/count] does [outcome].",
        "example": "$80/month in API credits runs the whole operation. No employees. No contractors.",
    },
    {
        "name": "question_that_answers_itself",
        "formula": "[Question that makes the wrong answer feel obvious].",
        "example": "The question was never 'can AI replace my team.' It was whether I ever needed one.",
    },
]

# Topic-tag → preferred hook pattern (Playbook §11).
# Keys cover both the niche labels used by x_research (ai_business, scifi_spiritual, hypnotherapy,
# kindle_authors, book_promo) AND the labels used by content_ideas_research (books_publishing, etc).
TOPIC_HOOK_MAP = {
    "ai_business": ["counter_intuitive_claim", "confession_with_stack", "cost_number_anchor", "insider_mechanism"],
    "scifi_spiritual": ["diagnostic", "pattern_interrupt", "reframe", "question_that_answers_itself"],
    "hypnotherapy": ["pattern_interrupt", "insider_mechanism", "diagnostic", "reframe"],
    "kindle_authors": ["confession_with_stack", "named_contrast", "trigger_event", "diagnostic"],
    "books_publishing": ["confession_with_stack", "named_contrast", "trigger_event", "diagnostic"],
    "book_promo": ["named_contrast", "trigger_event", "confession_with_stack", "diagnostic"],
    "repo_watch": ["insider_mechanism", "counter_intuitive_claim", "confession_with_stack", "cost_number_anchor"],
}


def pick_draft_assignments(niches_seen: list[str], n_drafts: int = 5) -> list[dict]:
    """Pick (topic, hook_pattern) pairs for each draft. Guarantees no repeated pattern across the set,
    so we never ship 5 drafts using the same opener shape."""
    used_patterns: set[str] = set()
    assignments: list[dict] = []

    # If repo_watch exists this week, force a 3-post repo lane:
    # 1) deep repo breakdown
    # 2) useful 3-repo roundup
    # 3) what a repo/workflow replaces inside a business
    seeded_topics: list[str] = []
    if "repo_watch" in niches_seen:
        seeded_topics.extend([
            "repo_watch — deep repo breakdown",
            "repo_watch — 3 useful repos roundup",
            "repo_watch — what this replaces in a business",
        ])

    remaining_topics = [n for n in niches_seen if n != "repo_watch"] or ["ai_business"]
    while len(seeded_topics) < n_drafts:
        seeded_topics.append(remaining_topics[(len(seeded_topics) - (3 if "repo_watch" in niches_seen else 0)) % len(remaining_topics)])

    for i in range(n_drafts):
        topic = seeded_topics[i] if seeded_topics else "ai_business"
        topic_key = topic.split(" — ", 1)[0]
        candidates = TOPIC_HOOK_MAP.get(topic_key, [p["name"] for p in HOOK_PATTERNS])
        chosen = next((c for c in candidates if c not in used_patterns), None)
        if chosen is None:
            # All topic-preferred patterns used — fall back to any unused pattern.
            chosen = next(
                (p["name"] for p in HOOK_PATTERNS if p["name"] not in used_patterns),
                candidates[0],
            )
        used_patterns.add(chosen)
        pattern = next(p for p in HOOK_PATTERNS if p["name"] == chosen)
        assignments.append({"id": i + 1, "topic": topic, "pattern": pattern})
    return assignments


def load_playbook_excerpts() -> str:
    """Return the playbook anatomy + checklist sections small models need inline.
    Skip if the playbook file is missing so we don't lie about its existence."""
    if not os.path.isfile(PLAYBOOK_PATH):
        return ""
    # Hook patterns are injected per-draft via pick_draft_assignments(); we only need
    # the 5-beat anatomy and 8-point checklist here so the prompt stays tight.
    return (
        "STRUCTURAL ANATOMY (from ~/brain/Content/Long_Form_X_Post_Playbook.md §1):\n"
        "Every long-form X post has 5 beats in this order. Skip a beat → post collapses.\n"
        "  1. HOOK (1–2 lines)     — open a loop the reader can't ignore\n"
        "  2. CONTEXT (2–4 lines)  — sharpen the hook, name lived experience, or promise the mechanism\n"
        "  3. CORE IDEA (3–6 short paragraphs) — one named system / mechanism / number per paragraph\n"
        "  4. PAYOFF (1–3 lines)   — the line a stranger screenshots. Must stand alone.\n"
        "  5. CTA (optional)       — only on designated promo slots, earned by beats 3–4\n\n"
        "PRE-PUBLISH CHECKLIST (§7) — every draft must pass ALL 8:\n"
        "  ✓ Hook follows ONE named pattern from the playbook (not a blend, never 'Hot take:')\n"
        "  ✓ Beat 2 contains NO meta-talk ('as a senior content strategist', 'in today's world', 'we'll be focusing')\n"
        "  ✓ Beat 3 has ≥2 of: number, named tool, concrete mechanism, falsifiable claim, specific scenario\n"
        "  ✓ Paragraphs are 1–3 sentences (no wall-of-text)\n"
        "  ✓ No bullet listicle ('5 AI tools…', '3 things every…')\n"
        "  ✓ Payoff could stand alone as a tweet — screenshot-able\n"
        "  ✓ Sounds like 'someone already opted out reporting back', not 'blogger explaining a concept'\n"
        "  ✓ Length 150–400 words\n"
    )


def load_week_notes() -> list[dict]:
    """Read all daily research notes from the past 7 days."""
    if not os.path.isdir(RESEARCH_DIR):
        return []

    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    notes = []

    for fname in sorted(os.listdir(RESEARCH_DIR)):
        if not fname.endswith(".md"):
            continue
        date_str = fname.split("_")[0]
        try:
            fdate = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            continue
        if fdate < cutoff:
            continue

        path = os.path.join(RESEARCH_DIR, fname)
        with open(path, encoding="utf-8") as f:
            content = f.read()

        if "synthesis failed" in content.lower() or "**Link:** http" not in content:
            continue

        # Extract niche label from filename (e.g. 2026-05-10_ai_business.md)
        niche_key = fname[len(date_str) + 1 : -3]
        notes.append({"date": date_str, "niche": niche_key, "content": content, "file": fname})

    return notes


def build_synthesis_prompt(notes: list[dict]) -> str:
    notes_block = ""
    for n in notes:
        notes_block += f"\n---\n### {n['file']}\n{n['content'][:1200]}\n"

    playbook_excerpt = load_playbook_excerpts()

    # Pre-pick draft assignments deterministically. Each draft gets ONE hook pattern by name,
    # plus a worked example so the model doesn't have to invent the form — only the content.
    # Rotate through niches so we cover the week's research breadth.
    niches_seen: list[str] = []
    for n in notes:
        if n["niche"] not in niches_seen:
            niches_seen.append(n["niche"])

    draft_assignments = pick_draft_assignments(niches_seen, n_drafts=5)

    assignments_block = ""
    for a in draft_assignments:
        assignments_block += (
            f"\nDraft #{a['id']} — topic: {a['topic']} — hook pattern: \"{a['pattern']['name']}\"\n"
            f"  Formula: {a['pattern']['formula']}\n"
            f"  Worked example (do NOT copy, mirror the SHAPE): {a['pattern']['example']}\n"
        )

    # Each of the 10 top_hooks also gets a pre-picked pattern so the model labels accurately.
    top_hook_patterns = [HOOK_PATTERNS[i % len(HOOK_PATTERNS)] for i in range(10)]
    top_hook_pattern_names = ", ".join(p["name"] for p in top_hook_patterns)

    return f"""You are writing for @AgoristAlchemy (X/Twitter) in Travis Steel's voice.
Travis already opted out of the corporate world. He runs a solo AI business and reports back.
Voice: contrarian, specific, already-opted-out. Agorism meets AI. No corporate-speak. No AI-bro clichés.

Today is Sunday {TODAY}. Below are: (1) the playbook anatomy, (2) this week's research, (3) your draft assignments.

═══════════════════════════════════════════════
{playbook_excerpt}
═══════════════════════════════════════════════

THIS WEEK'S RESEARCH NOTES:
{notes_block}

═══════════════════════════════════════════════

DRAFT ASSIGNMENTS — each draft has a PRE-PICKED hook pattern.
Use the pattern's formula. Mirror the example's SHAPE, not its words. Never blend patterns.
{assignments_block}
═══════════════════════════════════════════════

USEFUL REPOS LANE (non-negotiable when repo_watch research is present):
- Draft 1 = one deep repo breakdown.
- Draft 2 = one "3 useful repos this week" roundup.
- Draft 3 = one "what this repo/workflow replaces in a business" angle.
- These are not lazy link shares. Each must explain what problem the repo kills, what workflow it replaces, who should use it, and why it matters now.
- If a draft mentions a repo, translate it for a non-technical solopreneur in plain English: what it does, the exact pain it removes, and one concrete use case this week.
- Repo posts must never end as dead-end name-drops. They must include either the direct repo link in the body or the CTA "{REPO_CTA['trigger']}" at the end so the links can be sent by DM.
- Default to "{REPO_CTA['trigger']}" when the post would feel cluttered with raw URLs.
- Prioritize named repos, open-source tools, SDKs, plugins, or frameworks with obvious operator value.
- Repo posts beat generic AI commentary every time.

HOUSE REPO-POST TEMPLATE (preferred structure):
1. Discovery hook or sharp claim.
2. Name the repo early.
3. Describe the broken loop / current pain in plain English.
4. Explain what the repo changes.
5. Show the mechanism or "inside" flow (steps, components, or sequence).
6. Include concrete claims, metrics, benchmark results, or a specific use case.
7. Land on a bigger takeaway line that reframes the category.
8. Finish with either the direct link or "{REPO_CTA['trigger']}".

Micro-example shape to mirror structurally, not verbally:
- "I found a GitHub repo that makes AI agents learn from their own mistakes."
- name it
- explain the Groundhog Day loop
- explain the new loop/mechanism
- list proof/results
- land on a thesis like "Agents do not need longer prompts. They need experience."

═══════════════════════════════════════════════

Output ONLY valid JSON, no markdown fence, no explanation:

{{
  "week": "{TODAY}",
  "top_hooks": [
    {{
      "rank": 1,
      "hook": "opening line — must be one self-contained sentence or two short lines",
      "hook_pattern": "ONE name from this set: {top_hook_pattern_names}",
      "source_niche": "niche key",
      "why": "1 sentence on why this will land — name the mechanism, not 'engagement'"
    }}
  ],
  "draft_posts": [
    {{
      "id": 1,
      "platform": "X",
      "hook_pattern": "the pre-picked pattern name for this draft id (see assignments above)",
      "topic": "the pre-picked topic for this draft id",
      "text": "full post text, 150–350 words, 5-beat anatomy (Hook→Context→Core→Payoff)"
    }}
  ],
  "promo_slots": [
    {{
      "id": 1,
      "product": "BOOK",
      "trigger": "comment BOOK",
      "platform": "X",
      "text": "full promo post — teach a specific named system first, CTA earned not bolted on"
    }},
    {{
      "id": 2,
      "product": "RESONANCE",
      "trigger": "comment RESONANCE",
      "platform": "X",
      "text": "full promo post — diagnostic hook about a specific feeling, then the book frames it"
    }}
  ],
  "pattern_note": "1 sentence: which hook pattern dominated this week's RESEARCH (not your drafts) and why"
}}

HARD RULES:
- top_hooks: pick the 10 most viral across ALL niches. Label each with ONE pattern name from the set above — never a pipe-list, never blend two names, never the literal string with pipes in it.
- draft_posts: produce EXACTLY 5 posts matching the assignments above. Draft #N uses the pattern named in Assignment #N — do not swap, do not blend.
- Every X draft MUST contain 2+ of: number, named tool, concrete mechanism, falsifiable claim, specific scenario.
- Any repo/open-source/tool post must say what the repo actually DOES, what job/problem it removes, and end with either a direct link or "{REPO_CTA['trigger']}".
- Preferred repo-post rhythm: discovery hook → repo name → pain loop → mechanism → proof/results → bigger takeaway → link/REPO CTA.
- Banned phrases anywhere: "Here's the play", "Steal this", "The truth is:", "leverage AI", "10x", "in today's world", "in the age of AI", "game changer", "unlock", "unpopular opinion", "hot take", "as a senior content strategist", "we'll be focusing", "keeping topics fresh", "keeping things fresh and engaging".
- Banned structure: [vague claim] → [3-step framework] → bullet list.
- Voice test (apply to every post before emitting): does it sound like someone already opted out reporting back — or like a blogger explaining a concept? If blogger, rewrite from a specific incident.
- promo_slots: exactly 2 (one BOOK, one RESONANCE). Both must teach something real first.
"""


def call_openrouter(prompt: str) -> dict:
    if not OPENROUTER_API_KEY:
        return {}

    payload = json.dumps({
        "model": SYNTHESIS_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.75,
        "max_tokens": 3000,
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
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.loads(r.read())
        content = data["choices"][0]["message"]["content"].strip()
        # Strip markdown code fence if present
        if content.startswith("```"):
            content = content.split("\n", 1)[1]
            content = content.rsplit("```", 1)[0]
        return json.loads(content)
    except Exception as e:
        return {"error": str(e)}


def _extract_json(text: str) -> dict:
    """Pull the first balanced JSON object out of arbitrary text. Tolerates code fences,
    preamble, trailing prose. Used by call_hermes_oneshot() since agent output isn't pure JSON."""
    # Strip code fence if the entire payload is wrapped
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1)
    # Find the first {...} block by brace-counting
    start = text.find("{")
    if start == -1:
        raise ValueError("no JSON object found in response")
    depth = 0
    for i in range(start, len(text)):
        ch = text[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return json.loads(text[start : i + 1])
    raise ValueError("unbalanced braces in response")


def call_hermes_oneshot(prompt: str) -> dict:
    """Invoke `hermes -z` to run the synthesis through the configured GPT subscription
    (configured model via openai-codex). More capable than the local Ollama models —
    correctly fills the playbook hook-pattern assignments instead of copying the
    pipe-list. Costs ~1 agent turn per Sunday run."""
    # --ignore-rules skips personality + user-config system prompts so output stays clean JSON.
    # Prefix the prompt with a strict output contract so the agent doesn't preamble.
    wrapped = (
        "Respond with ONLY a single valid JSON object. "
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
        return {"error": "hermes -z timed out after 600s"}
    except FileNotFoundError:
        return {"error": "hermes CLI not on PATH"}

    if result.returncode != 0:
        stderr = (result.stderr or "").strip()[:400]
        return {"error": f"hermes exit {result.returncode}: {stderr}"}

    try:
        return _extract_json(result.stdout or "")
    except Exception as e:
        return {"error": f"JSON parse failed: {e}", "raw": (result.stdout or "")[:400]}


def call_ollama(prompt: str) -> dict:
    """Call local Ollama chat API and return parsed JSON."""
    payload = json.dumps({
        "model": OLLAMA_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "options": {"temperature": 0.75},
    }).encode()

    req = urllib.request.Request(
        f"{OLLAMA_BASE_URL}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=240) as r:
            data = json.loads(r.read().decode())
        content = (data.get("message") or {}).get("content", "").strip()
        # Strip markdown code fence if present
        if content.startswith("```"):
            content = content.split("\n", 1)[1]
            content = content.rsplit("```", 1)[0]
        return json.loads(content)
    except Exception as e:
        return {"error": str(e)}


def write_synthesis_note(synthesis: dict) -> None:
    from lib.cron_quality import validate_synthesis
    validate_synthesis(synthesis)
    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)

    lines = [
        f"# Weekly Content Synthesis — {TODAY}",
        f"_Week: {WEEK_START} → {TODAY}_",
        "",
    ]

    if "error" in synthesis:
        lines.append(f"⚠️ Synthesis failed: {synthesis['error']}")
        with open(OUT_FILE, "w") as f:
            f.write("\n".join(lines))
        return

    lines += ["## Top 10 Hooks This Week", ""]
    for h in synthesis.get("top_hooks", [])[:10]:
        pattern = h.get("hook_pattern") or h.get("hook_type", "")
        lines += [
            f"### #{h.get('rank', '?')} — pattern: {pattern} / niche: {h.get('source_niche', '')}",
            f"> {h.get('hook', '')}",
            f"_{h.get('why', '')}_",
            "",
        ]

    lines += ["---", "", "## 5 Draft Posts", ""]
    for p in synthesis.get("draft_posts", [])[:5]:
        pattern = p.get("hook_pattern") or p.get("hook_type", "")
        topic = p.get("topic") or p.get("topic_tag", "")
        lines += [
            f"### Draft {p.get('id', '?')} — {p.get('platform', 'X')} / pattern: {pattern}",
            f"**Topic:** {topic}",
            "",
            p.get("text", ""),
            "",
            "---",
            "",
        ]

    lines += ["## 2 Promo Slots", ""]
    for slot in synthesis.get("promo_slots", [])[:2]:
        product = slot.get("product", "")
        info = PROMO.get(product, {})
        lines += [
            f"### Promo {slot.get('id', '?')} — {product} ({info.get('title', '')})",
            f"**Trigger:** `{slot.get('trigger', '')}` | **Platform:** {slot.get('platform', 'X')}",
            f"**Link:** {info.get('link', '')}",
            "",
            slot.get("text", ""),
            "",
            "---",
            "",
        ]

    pattern = synthesis.get("pattern_note", "")
    if pattern:
        lines += ["## Pattern Note", "", pattern, ""]

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def main() -> int:
    print(f"📊 Weekly synthesis starting — reading {WEEK_START} → {TODAY}")

    notes = load_week_notes()
    print(f"  Loaded {len(notes)} daily research notes")

    if not notes:
        print("⚠️ No research notes found for this week. Run content_ideas_research.py first.")
        return 1

    prompt = build_synthesis_prompt(notes)

    # Primary: Hermes one-shot through configured model (OpenAI subscription, openai-codex provider).
    # Falls back to Ollama if SYNTHESIS_BACKEND=ollama is set or Hermes errors.
    backend = os.environ.get("SYNTHESIS_BACKEND", "hermes").lower()
    if backend == "hermes":
        print("  Calling Hermes (configured model via openai-codex subscription) for synthesis...")
        synthesis = call_hermes_oneshot(prompt)
        if "error" in synthesis:
            print(f"  Hermes failed: {synthesis['error']}")
            print(f"  Falling back to local Ollama (model={OLLAMA_MODEL})...")
            synthesis = call_ollama(prompt)
    else:
        print(f"  SYNTHESIS_BACKEND={backend} — calling local Ollama (model={OLLAMA_MODEL})...")
        synthesis = call_ollama(prompt)

    if "error" in synthesis and OPENROUTER_API_KEY:
        print("  Local backend failed — falling back to OpenRouter...")
        synthesis = call_openrouter(prompt)

    from lib.cron_quality import validate_synthesis
    try:
        validate_synthesis(synthesis)
    except ValueError as exc:
        print(f"Synthesis failed validation: {exc}; prior artifact preserved")
        return 1
    write_synthesis_note(synthesis)

    if "error" in synthesis:
        print(f"⚠️ Synthesis error: {synthesis['error']}")
        return 1

    hooks = synthesis.get("top_hooks", [])
    drafts = synthesis.get("draft_posts", [])
    promos = synthesis.get("promo_slots", [])
    pattern = synthesis.get("pattern_note", "")

    print(f"\n📋 *Weekly Synthesis* — {TODAY}")
    print(f"")
    print(f"*Top hooks:* {len(hooks)}/10  |  *Drafts:* {len(drafts)}/5  |  *Promos:* {len(promos)}/2")
    print(f"")
    for h in hooks[:3]:
        pattern_label = h.get("hook_pattern") or h.get("hook_type", "")
        print(f"  • [{pattern_label}] {h.get('hook','')[:85]}")
    print(f"")
    if pattern:
        print(f"📈 {pattern}")
    print(f"")
    print(f"✅ Written to brain/Content/Weekly_Synthesis_{TODAY}.md")
    print(f"🔜 Draft generator reads this at 7am")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
