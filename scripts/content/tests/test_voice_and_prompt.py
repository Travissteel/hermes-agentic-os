"""Voice hard bans, verbatim prompt, and playbook filtering."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import _path  # noqa: F401

from content.draft_prompt import assemble_prompt, filter_playbook, load_voice_prompt
from content.paths import REPO_ROOT, voice_prompt_path
from content.voice_check import check_text

VOICE_SHA256 = "9cd7c8373ff6e56761832ebbba70358d06e4027662f6eba5f34abe8edc4a92c8"

REAL_POSTS = [
    "I have been called crazy, extremist, conspiracy theorist, radical, tin foil hatter etc. Because I believe in voluntarism where all human interactions should be voluntary.",
    "Five years ago I started writing a science fiction novel rooted in the Law of One.",
    "Officially released on all platforms today. Do me a favour and give my album a listen. If you like punk, hardcore or metal then you'll enjoy it.",
    'Absolutely not Gina, how about "free land" for veterans who served THIS country',
]

PLAYBOOK = """
# Voice
contrarian, specific, already-opted-out. Agorism meets AI and opting out.

# Hook taxonomy
- named_contrast
- reframe
- plain fact

# Anatomy
Hook with a real fact, then context, then one concrete payoff.

# Checklist
- Specific names
- No anonymous stats
"""


class VoiceCheckTests(unittest.TestCase):
    def test_prompt_file_is_the_approved_body(self) -> None:
        file = voice_prompt_path()
        raw = file.read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(), VOICE_SHA256)
        text = raw.decode("utf-8")
        self.assertTrue(text.startswith("You are drafting X posts for Travis Steel (@AgoristAlchemy)."))
        self.assertNotIn("# Content Lead voice prompt", text)
        self.assertIn(
            "leverage, game-changer, unlock, delve, landscape, 10x, operator, plumbing, ceremony, theatre, receipts.",
            text,
        )

    def test_real_posts_pass(self) -> None:
        for post in REAL_POSTS:
            result = check_text(post)
            self.assertTrue(result.ok, result.violations)

    def test_contrast_reframe_is_rejected(self) -> None:
        drafts = [
            "This isn't a marketing problem, it's a systems problem.",
            "It's not a content problem, it's a distribution problem.",
            "The directory isn't a marketplace. It's a free list.",
            "Not a content problem. A distribution problem.",
            "I want less noise, more signal in the listing.",
            "This isn't about growth. The directory is still free.",
        ]
        for draft in drafts:
            result = check_text(draft)
            self.assertFalse(result.ok, draft)
            self.assertTrue(any(item.code == "contrast_reframe" for item in result.violations), result)

    def test_normal_not_sentence_is_kept(self) -> None:
        result = check_text("Not sure this landed. I shipped the directory anyway and left the listing free.")
        self.assertTrue(result.ok, result.violations)

    def test_business_operator_phrase_is_allowed_and_standalone_operator_is_not(self) -> None:
        allowed = check_text(
            "I am a solo AI business operator. The directory is still free and the listing stays that way."
        )
        self.assertTrue(allowed.ok, allowed.violations)
        self.assertFalse(any("operator" in item.message for item in allowed.violations))

        titled = check_text(
            "Solo AI Business Operator is the job. The directory is still free and the listing stays that way."
        )
        self.assertTrue(titled.ok, titled.violations)

        banned = check_text("I am an operator and the directory is still free.")
        self.assertTrue(
            any(item.code == "banned_word" and item.message == "banned word: operator" for item in banned.violations)
        )

    def test_banned_word_rhetorical_and_stack(self) -> None:
        banned = check_text("I leverage the directory every morning and the listing is still free.")
        self.assertTrue(any(item.code == "banned_word" for item in banned.violations))

        question = check_text(
            "What if everything you know about posting is wrong?\n\n"
            "I started writing five years ago and the directory is still free."
        )
        self.assertTrue(any(item.code == "rhetorical_opener" for item in question.violations))

        stacked = check_text("People get this wrong.\n\nThey chase tools.\n\nThey ignore taste.\n")
        self.assertTrue(any(item.code == "stacked_one_liners" for item in stacked.violations))

        short_pair = check_text("People get this wrong.\n\nThey chase tools.\n")
        self.assertFalse(any(item.code == "stacked_one_liners" for item in short_pair.violations))

    def test_clock_stat_and_mic_drop(self) -> None:
        clock = check_text("I posted at 6:05am and the directory is still free.")
        self.assertTrue(any(item.code == "invented_clock_time" for item in clock.violations))

        stat = check_text("The page hit 40% last month and the directory is still free.")
        self.assertTrue(any(item.code == "unsourced_stat" for item in stat.violations))

        sourced = check_text(
            "The page hit 40% last month (https://example.com/gsc) and the directory is still free."
        )
        self.assertFalse(any(item.code == "unsourced_stat" for item in sourced.violations))

        ending = check_text(
            "I shipped the directory and kept the listing free.\n\nLet that sink in."
        )
        self.assertTrue(any(item.code == "mic_drop" for item in ending.violations))

    def test_long_post_is_not_rejected_for_length(self) -> None:
        sentence = "I shipped the directory and kept the listing free for practitioners. "
        draft = sentence * 40
        result = check_text(draft)
        self.assertGreater(result.word_count, 300)
        self.assertGreater(result.char_count, 1000)
        self.assertTrue(result.ok, result.violations)

    def test_playbook_keeps_structure_and_drops_contrast_hooks(self) -> None:
        kept = filter_playbook(PLAYBOOK)
        self.assertIn("Anatomy", kept)
        self.assertIn("concrete payoff", kept)
        self.assertNotIn("named_contrast", kept)
        self.assertNotIn("reframe", kept)
        self.assertNotIn("contrarian, specific", kept)
        self.assertNotIn("plain fact", kept)

    def test_assembled_prompt_keeps_voice_verbatim(self) -> None:
        voice = load_voice_prompt()
        assembled = assemble_prompt(voice, PLAYBOOK)
        self.assertTrue(assembled.startswith(voice.rstrip("\n")))
        self.assertIn("OWNER OVERRIDE (2026-11-13)", assembled)
        self.assertIn("# Anatomy", assembled)
        self.assertIn("Do not use named_contrast or reframe hooks.", assembled)
        self.assertNotIn("- named_contrast", assembled)

    def test_cli_rejects_contrast_reframe(self) -> None:
        gate = REPO_ROOT / "scripts" / "content" / "weekly_draft_gate.py"
        with tempfile.TemporaryDirectory() as tmp:
            drafts = Path(tmp) / "week.json"
            drafts.write_text(
                json.dumps(
                    {
                        "drafts": [
                            {
                                "text": "It's not a marketing problem, it's a systems problem.",
                            }
                        ]
                    }
                ),
                encoding="utf-8",
            )
            proc = subprocess.run(
                [sys.executable, str(gate), "check", "--file", str(drafts)],
                check=False,
                capture_output=True,
                text=True,
            )
        self.assertEqual(proc.returncode, 1, proc.stderr)
        self.assertIn("REJECT", proc.stdout)
        self.assertIn("contrast_reframe", proc.stdout)
        self.assertIn("not X, it's Y", proc.stdout)


if __name__ == "__main__":
    unittest.main()
