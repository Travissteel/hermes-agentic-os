#!/usr/bin/env python3
"""Print the exception-only daily change report and advance the cursor.

Stdout is the whole report. This does not send Telegram, email, or Postiz.
"""

from __future__ import annotations

import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parents[1]
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from content.change_log import main


if __name__ == "__main__":
    argv = list(sys.argv[1:])
    if argv and argv[0] not in {"report", "add"}:
        argv = ["report", *argv]
    elif not argv:
        argv = ["report"]
    raise SystemExit(main(argv))
