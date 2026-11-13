"""Reject X drafts that hit the approved Content Lead hard bans.

Length is intentionally not a rejection. Travis confirmed full-length posts
are fine on X Premium (about 4000 characters). The 80-300 word line in the
voice prompt stays verbatim and is not enforced here.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field


_AP = r"['’]"

# Each pattern is one of the HARD BANS contrast-reframe shapes.
_CONTRAST: list[tuple[str, re.Pattern[str]]] = [
    (
        "not X, it's Y",
        re.compile(rf"\bnot\b[^.\n]{{0,80}}?,\s*it(?:{_AP}s| is)\b", re.IGNORECASE),
    ),
    (
        "X isn't Y, it's Z",
        re.compile(
            rf"\bisn{_AP}?t\b[^.\n]{{0,80}}?,\s*it(?:{_AP}s| is)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "X isn't Y. It's Z",
        re.compile(
            rf"\b(?:isn{_AP}?t|is not)\b[^.\n]{{0,80}}\.\s*it(?:{_AP}s| is)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "This isn't about X",
        re.compile(
            rf"\bthis\s+(?:isn{_AP}?t|is not)\s+about\b",
            re.IGNORECASE,
        ),
    ),
    (
        "less X, more Y",
        re.compile(r"\bless\s+[^,\n]{1,60},\s*more\s+\S", re.IGNORECASE),
    ),
]

_NOT_XY = re.compile(r"^Not\s+([^.\n]{1,60})\.\s+([A-Z][^.\n]{1,60})\.")
_NOT_XY_SUBJECT = re.compile(
    r"^(I|We|You|They|He|She|It|And|But|So|Because|That)\b"
)

# Stems from the approved word list. Inflections and the US spelling of
# theatre are the same ban, not extra style rules.
_BANNED: list[tuple[str, re.Pattern[str]]] = [
    ("leverage", re.compile(r"\bleverag(?:e|es|ed|ing)\b", re.IGNORECASE)),
    ("game-changer", re.compile(r"\bgame[-\s]?changers?\b", re.IGNORECASE)),
    ("unlock", re.compile(r"\bunlocks?\b|\bunlocked\b|\bunlocking\b", re.IGNORECASE)),
    ("delve", re.compile(r"\bdelv(?:e|es|ed|ing)\b", re.IGNORECASE)),
    ("landscape", re.compile(r"\blandscapes?\b", re.IGNORECASE)),
    ("10x", re.compile(r"(?<!\w)10[xX](?!\w)")),
    # Travis: "biz op is fine". The bio phrase "business operator" is allowed
    # in any case. Any other "operator" / "operators" stays banned.
    # IGNORECASE applies to the lookbehind, so "Business Operator" is covered.
    (
        "operator",
        re.compile(r"(?<!business )\boperators?\b", re.IGNORECASE),
    ),
    ("plumbing", re.compile(r"\bplumbing\b", re.IGNORECASE)),
    ("ceremony", re.compile(r"\bceremon(?:y|ies)\b", re.IGNORECASE)),
    ("theatre", re.compile(r"\btheat(?:re|er)s?\b", re.IGNORECASE)),
    ("receipts", re.compile(r"\breceipts?\b", re.IGNORECASE)),
]

_CLOCK = re.compile(
    r"\b(?:at\s+)?(?:[01]?\d|2[0-3]):[0-5]\d\s*(?:a\.?m\.?|p\.?m\.?)\b",
    re.IGNORECASE,
)
_STAT = re.compile(
    r"\$\s?\d[\d,]*(?:\.\d+)?\s*[kKmMbB]?|\b\d+(?:\.\d+)?\s*%"
)
_URL = re.compile(r"https?://\S+", re.IGNORECASE)
_META = re.compile(
    rf"\b(here(?:{_AP}s| is) the thing|read that again)\b",
    re.IGNORECASE,
)
_MIC = re.compile(
    rf"\b(let that sink in|let that sit|that(?:{_AP}s| is) the tweet|mic drop|full stop)\b",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class Violation:
    code: str
    message: str
    excerpt: str


@dataclass
class VoiceCheck:
    ok: bool
    violations: list[Violation] = field(default_factory=list)
    word_count: int = 0
    char_count: int = 0

    def to_dict(self) -> dict:
        data = asdict(self)
        return data


def check_text(text: str) -> VoiceCheck:
    """Return hard-ban violations. Word count is reported and never fails the check."""
    raw = text or ""
    violations: list[Violation] = []
    if not raw.strip():
        violations.append(Violation("empty", "draft is empty", ""))
        return VoiceCheck(False, violations, 0, 0)

    for label, pattern in _CONTRAST:
        match = pattern.search(raw)
        if match:
            violations.append(
                Violation(
                    "contrast_reframe",
                    f"contrast-reframe ({label})",
                    _excerpt(raw, match.start(), match.end()),
                )
            )

    for paragraph in _paragraphs(raw):
        slogan = _not_xy(paragraph)
        if slogan:
            violations.append(
                Violation(
                    "contrast_reframe",
                    'contrast-reframe ("Not X. Y.")',
                    _excerpt(slogan, 0, len(slogan)),
                )
            )
            break

    seen_words: set[str] = set()
    for stem, pattern in _BANNED:
        match = pattern.search(raw)
        if match and stem not in seen_words:
            seen_words.add(stem)
            violations.append(
                Violation(
                    "banned_word",
                    f"banned word: {stem}",
                    _excerpt(raw, match.start(), match.end()),
                )
            )

    opener = _opens_with_question(raw)
    if opener:
        violations.append(
            Violation(
                "rhetorical_opener",
                "rhetorical-question opener",
                _excerpt(opener, 0, len(opener)),
            )
        )

    stacked = _stacked_one_liners(raw)
    if stacked:
        violations.append(
            Violation(
                "stacked_one_liners",
                f"stacked single-line paragraphs ({stacked} in a row)",
                "",
            )
        )

    for match in _CLOCK.finditer(raw):
        violations.append(
            Violation(
                "invented_clock_time",
                "clock time (treat as invented unless it is a real sourced fact)",
                _excerpt(raw, match.start(), match.end()),
            )
        )
        break

    for paragraph in _paragraphs(raw):
        if _STAT.search(paragraph) and not _URL.search(paragraph):
            stat = _STAT.search(paragraph)
            assert stat is not None
            violations.append(
                Violation(
                    "unsourced_stat",
                    "stat or revenue figure has no source URL in the same paragraph",
                    _excerpt(paragraph, stat.start(), stat.end()),
                )
            )

    meta = _META.search(raw)
    if meta:
        violations.append(
            Violation(
                "meta_talk",
                "meta-talk",
                _excerpt(raw, meta.start(), meta.end()),
            )
        )

    paragraphs = _paragraphs(raw)
    if paragraphs:
        mic = _MIC.search(paragraphs[-1])
        if mic:
            violations.append(
                Violation(
                    "mic_drop",
                    "aphorism / mic-drop ending",
                    _excerpt(paragraphs[-1], mic.start(), mic.end()),
                )
            )

    words = len(re.findall(r"\b[\w']+\b", raw))
    return VoiceCheck(not violations, violations, words, len(raw))


def _paragraphs(text: str) -> list[str]:
    return [part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()]


def _excerpt(text: str, start: int, end: int) -> str:
    snippet = text[max(0, start - 24) : end + 24].replace("\n", " ")
    snippet = re.sub(r"\s+", " ", snippet).strip()
    if len(snippet) > 160:
        return snippet[:157] + "..."
    return snippet


def _not_xy(paragraph: str) -> str | None:
    match = _NOT_XY.match(paragraph.strip())
    if not match:
        return None
    first, second = match.group(1), match.group(2)
    if "," in first:
        return None
    if len(first.split()) > 6 or len(second.split()) > 8:
        return None
    if _NOT_XY_SUBJECT.match(second):
        return None
    return match.group(0)


def _opens_with_question(text: str) -> str | None:
    stripped = text.lstrip()
    match = re.match(r"(.+?[.!?])(?:\s|$)", stripped, re.DOTALL)
    sentence = (match.group(1) if match else stripped.splitlines()[0]).strip()
    if sentence.endswith("?"):
        return sentence
    return None


def _is_one_liner(line: str) -> bool:
    text = line.strip()
    if not text or len(text.split()) > 18:
        return False
    if not re.search(r"[.!?]$", text):
        return False
    if len(re.findall(r"[.!?]+", text)) > 1:
        return False
    return True


def _stacked_one_liners(text: str) -> int:
    run = 0
    longest = 0
    for line in text.splitlines():
        if not line.strip():
            continue
        if _is_one_liner(line):
            run += 1
            longest = max(longest, run)
        else:
            run = 0
    return longest if longest >= 3 else 0
