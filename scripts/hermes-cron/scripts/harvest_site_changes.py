"""Conservative migration of cron reports into Git-verified change events."""
import json
import re
import subprocess
from datetime import datetime,timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
from lib.event_log import append_event

# Lazy, and the capture may not cross a newline. Greedy [^\n]* ran to end of
# line, backtracked onto the *closing* backtick of `/some-path`, then captured
# forward to the next backtick in the document — storing a multi-line markdown
# blob as the target. Nothing validated it, so cooling_targets() silently
# matched nothing and the 14-day cooldown never once fired.
QUEUE_ITEM_RE=re.compile(r'\*\*Queue item taken:\*\*[^\n]*?`([^`\n]+)`')

def harvest():
    home=Path.home()
    registry=json.loads((home/'antigravity/leadgen/sites.json').read_text())['sites']
    repos={'hf':home/'sites/hypnotherapy-finder','bsf':home/'sites/business-software-finder'}
    repos.update({s['slug']:Path(s['localPath']) for s in registry})
    jobs={'hf8b3e21a9c5f':'hf','bsf9e4f12c37a':'bsf','df12e9368af7':None,'6eb087089331':None}
    added=0
    for job, fixed in jobs.items():
        for p in sorted((home/'.hermes/cron/output'/job).glob('*.md'))[-14:]:
            raw=p.read_text()
            if '(FAILED)' in raw[:200] or '## Response' not in raw: continue
            text=raw.split('## Response',1)[1]
            candidates=[fixed] if fixed else [s for s in repos if s not in ('hf','bsf') and s in text]
            hashes=re.findall(r'(?<![a-zA-Z0-9])([0-9a-f]{7,40})(?![a-zA-Z0-9])',text)
            for site in candidates:
                repo=repos[site]
                def git(*xs):
                    return subprocess.check_output(['git','-C',str(repo),*xs],text=True,stderr=subprocess.DEVNULL).strip()
                for sha in dict.fromkeys(hashes):
                    try:
                        commit=git('rev-parse','--verify',sha+'^{commit}')
                        subprocess.run(['git','-C',str(repo),'merge-base','--is-ancestor',commit,'@{upstream}'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
                        occurred=datetime.fromisoformat(git('show','-s','--format=%cI',commit))
                        run_day=p.name[:10]
                        if occurred.astimezone(ZoneInfo('Australia/Melbourne')).date().isoformat()!=run_day: continue
                    except (subprocess.CalledProcessError,ValueError): continue
                    target=QUEUE_ITEM_RE.search(text)
                    e=append_event('site_change',system='seo',status='pushed',summary=git('show','-s','--format=%s',commit),
                        job_id=job,asset_id=commit,source=str(p),metrics={'commit':commit,'evidence':'local upstream ancestry; deployment not verified'},
                        extra={'site':site,'target':target.group(1) if target else None,'occurred_at':occurred.isoformat(),
                            'review_after':(occurred+timedelta(days=14)).isoformat(),'deployment_status':'unverified'},
                        dedupe_key=f'site-change:{site}:{commit}')
                    added+=bool(e)
                    break
    return added
