#!/usr/bin/env python3
"""Deterministic local eligibility check; no network, model or deployment."""
import json
import subprocess
from pathlib import Path

def check(registry):
    rows=[]
    for site in registry['sites']:
        if site.get('status')!='live': continue
        code='''import {SITE} from "./site.config.ts";
import {faqPages} from "./lib/faq-pages.ts";
import {posts} from "./lib/posts.ts";
import areas from "./data/locations.json";
if (![SITE.subServices,faqPages,posts,areas].every(Array.isArray)) throw Error("Unexpected content schema");
console.log(JSON.stringify({services:SITE.subServices.length,faq:faqPages.length,posts:posts.length,areas:areas.length}));'''
        result=subprocess.run(['bun','-e',code],cwd=site['localPath'],capture_output=True,text=True,timeout=30,check=True)
        counts=json.loads(result.stdout)
        count=sum(counts.values())
        rows.append({'slug':site['slug'],'count':count,'counts':counts,'target':site.get('launchTarget',15)})
    eligible=sorted([s for s in rows if s['count'] < s['target']],key=lambda s:s['count'])[:5]
    return {'wakeAgent':bool(eligible),'eligible':eligible,'sites':rows}
if __name__=='__main__':
    print(json.dumps(check(json.loads((Path.home()/'antigravity/leadgen/sites.json').read_text()))))
