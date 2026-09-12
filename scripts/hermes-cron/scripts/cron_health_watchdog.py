#!/usr/bin/env python3
"""Alert only on changed failure signatures or recovery; no language model."""
import hashlib,json
from pathlib import Path
from cron_health_check import check
from lib.cron_quality import atomic_json

def main():
    result=check()
    fingerprint=hashlib.sha256(json.dumps([{k:v for k,v in f.items() if k!='streak'} for f in result['failures']],sort_keys=True).encode()).hexdigest()
    path=Path.home()/'.hermes/state/cron-health-alert.json'
    previous=json.loads(path.read_text()) if path.exists() else {}
    if previous.get('fingerprint')==fingerprint: return
    atomic_json(path,{'fingerprint':fingerprint,'healthy':result['ok']})
    if result['ok']:
        if previous and not previous.get('healthy'): print('Hermes cron health: repeated failures have cleared.')
    else:
        print('Hermes cron health: repeated failures or delivery errors\n'+json.dumps(result['failures'],indent=2))
if __name__=='__main__': main()
