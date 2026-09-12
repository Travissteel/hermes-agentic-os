#!/usr/bin/env python3
"""Record verified Git evidence and baseline for later SEO outcome review."""
import argparse
import json
import subprocess
from datetime import datetime,timedelta,timezone
from pathlib import Path
from lib.event_log import append_event

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    for arg in ('site','target','work-id','repo','baseline','summary'):
        ap.add_argument('--'+arg,required=True)
    ap.add_argument('--deployment-id')
    args=ap.parse_args()
    def git(*xs): return subprocess.check_output(['git','-C',args.repo,*xs],text=True).strip()
    commit=git('rev-parse','HEAD')
    if git('status','--porcelain') or git('rev-list','@{upstream}..HEAD'):
        ap.error('Require a clean worktree and no unpushed commits')
    baseline=json.loads(Path(args.baseline).read_text())
    now=datetime.now(timezone.utc)
    append_event('site_change',system='seo',status='pushed',summary=args.summary,asset_id=commit,
        job_id={'hf':'hf8b3e21a9c5f','bsf':'bsf9e4f12c37a'}.get(args.site,'df12e9368af7'),
        source='record_site_change.py',metrics={'baseline':baseline,'deployment_id':args.deployment_id},
        extra={'site':args.site,'target':args.target,'work_id':args.work_id,
            'occurred_at':now.isoformat(),'review_after':(now+timedelta(days=14)).isoformat(),
            'deployment_status':'reported' if args.deployment_id else 'unverified'},
        dedupe_key=f'site-change:{args.site}:{commit}')
    print(json.dumps({'recorded':True,'commit':commit,'review_after':(now+timedelta(days=14)).isoformat()}))
if __name__=='__main__': main()
