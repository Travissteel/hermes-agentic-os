"""Stable SEO work identifiers and a target-level measurement cooldown."""
import hashlib
from datetime import datetime, timedelta, timezone
from lib.event_log import iter_events

def item_id(item):
    return hashlib.sha256('|'.join(str(item.get(k) or '') for k in ('action','target','query')).encode()).hexdigest()[:16]

def is_usable_target(t):
    """A target must be a single-line site path to be matchable against a queue
    item. Unvalidated targets are how this cooldown silently did nothing: a bad
    regex in harvest_site_changes.py stored multi-line markdown blobs, which
    joined the cooling set, matched no queue item, and still inflated the
    "awaiting outcome review" count so the queue looked like it was working."""
    return isinstance(t,str) and t.startswith('/') and '\n' not in t and len(t)<=120

def cooling_targets(now=None,site='hf',with_rejects=False):
    now=now or datetime.now(timezone.utc)
    targets,rejects=set(),0
    for e in iter_events():
        if e.get('event_type')!='site_change': continue
        try:
            review=datetime.fromisoformat(e['review_after'])
        except (ValueError,KeyError): continue
        if review<=now or e.get('site')!=site: continue
        t=e.get('target')
        if is_usable_target(t): targets.add(t)
        else: rejects+=1
    return (targets,rejects) if with_rejects else targets
