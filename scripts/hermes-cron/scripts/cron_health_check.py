#!/usr/bin/env python3
"""Read-only health preflight; exposes repeated failures without an LLM."""
import json
from pathlib import Path

def check():
    jobs=json.loads((Path.home()/'.hermes/cron/jobs.json').read_text())['jobs']
    failures=[{'name':j['name'],'streak':j.get('failure_streak',0),'error':j.get('last_error'),
        'delivery_error':j.get('last_delivery_error')} for j in jobs if j.get('enabled') and
        (j.get('failure_streak',0)>=2 or j.get('last_delivery_error'))]
    return {'ok':not failures,'failures':failures}
if __name__=='__main__': print(json.dumps(check()))
