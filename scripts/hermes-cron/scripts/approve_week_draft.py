#!/usr/bin/env python3
"""Record explicit human approval of a reviewed draft. Never call from a cron."""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from lib.cron_quality import atomic_json, draft_digest, expected_week

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('draft', type=Path)
    ap.add_argument('--approved-by', required=True)
    ap.add_argument('--evidence', required=True, help='Reference to explicit user approval, e.g. Telegram message ID')
    args=ap.parse_args()
    draft=json.loads(args.draft.read_text())
    if draft.get('week') != expected_week():
        ap.error('Only the upcoming/current week can be approved')
    draft['human_approval']={'approved':True,'approved_by':args.approved_by,
        'evidence':args.evidence,'approved_at':datetime.now(timezone.utc).isoformat(),
        'draft_sha256':draft_digest(draft)}
    atomic_json(args.draft,draft)
    print('Approval recorded for this exact draft. No posts scheduled or published.')
if __name__=='__main__': main()
