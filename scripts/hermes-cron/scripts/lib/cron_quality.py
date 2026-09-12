"""Shared validation for scheduled content and operational evidence."""
import hashlib
import json
import os
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

def atomic_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix='.' + path.name)
    try:
        with os.fdopen(fd, 'w') as out:
            json.dump(value, out, indent=2, ensure_ascii=False)
            out.flush()
            os.fsync(out.fileno())
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)

def validate_captures(rows):
    if not isinstance(rows, list) or not rows:
        raise ValueError('No usable captures')
    for row in rows:
        if not isinstance(row, dict) or not all(isinstance(row.get(k), str) and row[k].strip()
                for k in ('raw_text', 'link', 'rewrite', 'why_it_worked')):
            raise ValueError('Capture missing source, text, rewrite or rationale')
        if not row['link'].startswith(('https://', 'http://')) or 'synthesis failed' in row['raw_text'].lower():
            raise ValueError('Invalid source or error placeholder')

def validate_synthesis(value):
    if not isinstance(value, dict) or value.get('error'):
        raise ValueError('Synthesis failed')
    for key, text_key, count in [('top_hooks','hook',10), ('draft_posts','text',5), ('promo_slots','text',2)]:
        rows = value.get(key)
        if not isinstance(rows, list) or len(rows) != count:
            raise ValueError(f'{key}: expected {count} usable entries')
        if any(not isinstance(r, dict) or not isinstance(r.get(text_key), str) or not r[text_key].strip() for r in rows):
            raise ValueError(f'{key}: empty entry')

def draft_digest(draft):
    data = {k:v for k,v in draft.items() if k != 'human_approval'}
    return hashlib.sha256(json.dumps(data, sort_keys=True, ensure_ascii=False).encode()).hexdigest()

def expected_week(now=None):
    now = now or datetime.now(ZoneInfo('Australia/Melbourne'))
    day = now.date()
    return (day + timedelta(days=1) if day.weekday() == 6 else day - timedelta(days=day.weekday())).isoformat()

def approval_valid(draft):
    a = draft.get('human_approval') or {}
    try:
        approved_at = datetime.fromisoformat(a['approved_at'].replace('Z', '+00:00'))
        return (a.get('approved') is True and bool(a.get('evidence')) and bool(a.get('approved_by'))
            and approved_at.tzinfo is not None and approved_at <= datetime.now(timezone.utc)
            and a.get('draft_sha256') == draft_digest(draft))
    except (KeyError, ValueError, TypeError):
        return False

def publisher_enabled():
    try:
        jobs=json.loads((Path.home()/'.hermes/cron/jobs.json').read_text())['jobs']
        return any(j.get('name')=='x-direct-publisher' and j.get('enabled') is True and j.get('state')!='paused' for j in jobs)
    except (OSError, ValueError, KeyError):
        return False

def event_window(rows, start, end):
    out=[]
    for row in rows:
        value=row.get('occurred_at') or row.get('metrics',{}).get('ts') or row.get('ts')
        try:
            ts=datetime.fromtimestamp(value/1000 if value > 1e11 else value, timezone.utc) if isinstance(value,(int,float)) else datetime.fromisoformat(value.replace('Z','+00:00'))
            if ts.tzinfo and start <= ts <= end:
                out.append(row)
        except (ValueError, TypeError, AttributeError, OverflowError):
            continue
    return out
