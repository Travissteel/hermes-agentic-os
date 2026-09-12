#!/usr/bin/env python3
"""Report search visibility separately from sampled URL index status.

Service URLs receive most inspection slots. Remaining commercial pages rotate
by last inspection time; legal/contact pages never drive content production.
Errors stay unknown, never become zero traffic or an indexation diagnosis.
"""
import argparse
import json
import os
import sys
import socket
import tempfile
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

HOME = Path.home()
REGISTRY = HOME / 'antigravity/leadgen/sites.json'
KEY_PATH = HOME / '.hermes/keys/gsc-service-account.json'
OUT_PATH = HOME / 'antigravity/shared/leadgen-gsc-latest.md'
CACHE_PATH = HOME / '.hermes/state/leadgen-url-inspections.json'
SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']


def atomic_write(path, text):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix='.' + path.name, dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as f:
            f.write(text)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def resolve_property(available, domain):
    host = urlsplit(domain).hostname.removeprefix('www.')
    preferred = 'sc-domain:' + host
    if preferred in available:
        return preferred
    for prop in available:
        if prop.startswith(('http://', 'https://')) and urlsplit(prop).hostname.removeprefix('www.') == host:
            return prop
    return None


def sitemap_urls(domain):
    req = urllib.request.Request(domain.rstrip('/') + '/sitemap.xml', headers={'User-Agent': 'leadgen-gsc-report/2.0'})
    with urllib.request.urlopen(req, timeout=30) as r:
        root = ET.fromstring(r.read())
    if root.tag.rsplit('}', 1)[-1] != 'urlset':
        raise ValueError('Expected a URL sitemap; sitemap index requires explicit handling')
    urls = [el.text.strip() for el in root.iter() if el.tag.rsplit('}', 1)[-1] == 'loc' and el.text]
    if not urls:
        raise ValueError('Sitemap returned no URLs')
    host = urlsplit(domain).hostname
    return sorted(set(u for u in urls if urlsplit(u).hostname == host))


def commercial(url):
    path = urlsplit(url).path.rstrip('/')
    return path in ('', '/services', '/areas', '/faq', '/blog') or path.startswith(('/services/', '/areas/', '/faq/', '/blog/'))


def choose_inspections(urls, cache, limit):
    """Reserve 75% for services; rotate by oldest check, not sitemap order."""
    if limit <= 0:
        return []
    oldest = lambda u: (cache.get(u, {}).get('checked_at', ''), u)
    service = sorted([u for u in urls if urlsplit(u).path.startswith('/services/')], key=oldest)
    chosen = service[:max(1, (limit * 3 + 3) // 4)]
    remaining = sorted([u for u in urls if commercial(u) and u not in chosen], key=oldest)
    return (chosen + remaining[:max(0, limit - len(chosen))])[:limit]


def classify(record):
    if not record or record.get('error'):
        return 'UNKNOWN'
    state = record.get('coverageState', '')
    if record.get('verdict') == 'PASS':
        return 'INDEXED'
    if state in ('URL is unknown to Google', 'Discovered - currently not indexed'):
        return 'DISCOVERY'
    if state == 'Crawled - currently not indexed':
        return 'QUALITY_REVIEW'
    return 'TECHNICAL_REVIEW' if state or record.get('verdict') else 'UNKNOWN'


def query(svc, prop, start, end, dimensions):
    return svc.searchanalytics().query(siteUrl=prop, body={
        'startDate': str(start), 'endDate': str(end), 'dimensions': dimensions,
        'rowLimit': 25000, 'dataState': 'final',
    }).execute().get('rows', [])


def build_report(svc, sites, days, limit, cache, now):
    end = now.astimezone(ZoneInfo('Australia/Melbourne')).date() - timedelta(days=3)
    start = end - timedelta(days=days - 1)
    available = [e['siteUrl'] for e in svc.sites().list().execute().get('siteEntry', [])
                 if e.get('permissionLevel') != 'siteUnverifiedUser']
    data = {'generated_at': now.isoformat(), 'window_start': str(start), 'window_end': str(end), 'sites': []}
    lines = ['# Lead gen network — visibility and index status', '', f'Window: {start} → {end} ({days} days).', '',
             '**Pages with impressions are a visibility measure, not an indexed-page count.**',
             'Index status below comes only from URL Inspection. Uninspected pages remain unknown.',
             'Prioritise important service pages. Do not create content or repeatedly link legal/contact pages because they have no impressions.', '']
    failures = 0
    for site in sites:
        name = site['slug']
        result = {'slug': name, 'inspections': [], 'errors': []}
        data['sites'].append(result)
        lines += [f'## {name} — {site["service"]} · {site["location"]}', '']
        prop = resolve_property(available, site['domain'])
        if not prop:
            result['errors'].append('No accessible verified property'); failures += 1
            lines += ['**UNKNOWN: no accessible verified Search Console property.**', '']; continue
        result['property'] = prop
        try:
            daily = query(svc, prop, start, end, ['date'])
            pages = query(svc, prop, start, end, ['page'])
            queries = query(svc, prop, start, end, ['query'])
        except Exception as exc:
            result['errors'].append(str(exc)); failures += 1
            lines += [f'**UNKNOWN: Search Console query failed:** {exc}', '']; continue
        result.update(clicks=sum(r['clicks'] for r in daily), impressions=sum(r['impressions'] for r in daily), pages=pages, queries=queries)
        try:
            urls = sitemap_urls(site['domain'])
        except Exception as exc:
            urls = []; result['errors'].append(f'Sitemap: {exc}'); failures += 1
        result['sitemap_urls'] = urls
        seen = {r['keys'][0].rstrip('/') for r in pages}
        visible = sum(u.rstrip('/') in seen for u in urls)
        lines += [f'- **{result["clicks"]} clicks · {result["impressions"]} impressions**',
                  f'- Current sitemap URLs with impressions: **{visible}/{len(urls)}** (visibility only).' if urls else '- Sitemap unavailable: URL coverage is unknown.',
                  '- Qualified leads / booked jobs: **not supplied by Search Console**.', '']
        # Cache is explicitly dated; never present an old state as today's inspection.
        cutoff = now - timedelta(hours=24)
        due = []
        for u in urls:
            try: checked = datetime.fromisoformat(cache.get(u, {}).get('checked_at', ''))
            except ValueError: checked = datetime.min.replace(tzinfo=timezone.utc)
            if checked < cutoff or cache.get(u, {}).get('error'): due.append(u)
        selected = choose_inspections(due, cache, limit)
        for url in selected:
            record = {'url': url, 'checked_at': now.isoformat()}
            try:
                raw = svc.urlInspection().index().inspect(body={'inspectionUrl': url, 'siteUrl': prop}).execute()['inspectionResult']['indexStatusResult']
                record.update({k: raw[k] for k in ('verdict', 'coverageState', 'googleCanonical', 'userCanonical', 'lastCrawlTime', 'pageFetchState') if k in raw})
            except Exception as exc:
                record['error'] = str(exc); failures += 1; result['errors'].append(f'Inspection failed: {url}')
            cache[url] = record
        records = [cache[u] for u in urls if u in cache and commercial(u)]
        result['inspections'] = records
        result['uninspected_commercial_urls'] = [u for u in urls if commercial(u) and u not in cache]
        lines += ['### Sampled index status (service pages first)', '']
        ordered = sorted(records, key=lambda r: (not urlsplit(r['url']).path.startswith('/services/'), r['url']))
        for r in ordered:
            mode = classify(r)
            lines.append(f'- `{urlsplit(r["url"]).path or "/"}` — **{mode}**: {r.get("coverageState", r.get("error", "Unknown"))}; checked {r["checked_at"]}.')
        lines += [f'- {len(selected)} fresh checks this run; {len(result["uninspected_commercial_urls"])} commercial URLs not yet inspected.', '', '### Queries appearing', '']
        for r in sorted(queries, key=lambda r: -r['impressions'])[:12]:
            lines.append(f'- "{r["keys"][0]}" — {r["impressions"]} impressions, {r["clicks"]} clicks, average position {r["position"]:.1f}')
        if not queries: lines.append('- No query rows returned; privacy filtering or low volume may apply. This does not establish an indexing failure.')
        if result['errors']: lines += ['', '**Data errors:** ' + '; '.join(result['errors'])]
        lines += ['']
    lines += ['## Choose work from evidence', '',
              '1. DISCOVERY on a service page: verify HTTP response, robots, canonical, sitemap and existing contextual links. Do not repeat a completed link change while waiting for recrawl.',
              '2. QUALITY_REVIEW: investigate duplication and usefulness on that existing page; this label is not a proven cause.',
              '3. INDEXED: choose an existing service/query opportunity using impressions, intent and position. No automatic new-page quota.',
              '4. UNKNOWN or inspection error: investigate access/data; never infer index status from impressions.',
              '5. Check the recorded completion/review date before repeating work. Keep pushes, deployments, search outcomes and qualified leads separate.', '']
    data['ok'] = failures == 0
    return '\n'.join(lines), data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--days', type=int, default=28)
    parser.add_argument('--inspect', type=int, default=8)
    args = parser.parse_args()
    if args.days <= 0 or args.inspect < 0: parser.error('days must be positive; inspect must be nonnegative')
    socket.setdefaulttimeout(45)
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    try:
        svc = build('searchconsole', 'v1', credentials=service_account.Credentials.from_service_account_file(str(KEY_PATH), scopes=SCOPES), cache_discovery=False)
        sites = [s for s in json.loads(REGISTRY.read_text())['sites'] if s.get('status') == 'live']
        cache = json.loads(CACHE_PATH.read_text()) if CACHE_PATH.exists() else {}
        report, data = build_report(svc, sites, args.days, args.inspect, cache, datetime.now(timezone.utc))
    except Exception as exc:
        data = {'ok': False, 'generated_at': datetime.now(timezone.utc).isoformat(), 'error': str(exc), 'sites': []}
        atomic_write(OUT_PATH.with_suffix('.json'), json.dumps(data, indent=2))
        atomic_write(OUT_PATH, '# Lead gen report unavailable\n\n**UNKNOWN: report generation failed.**\n\n' + str(exc) + '\n')
        print(json.dumps({'ok': False, 'error': str(exc), 'report': str(OUT_PATH)}))
        return 1
    atomic_write(CACHE_PATH, json.dumps(cache, indent=2))
    atomic_write(OUT_PATH.with_suffix('.json'), json.dumps(data, indent=2))
    atomic_write(OUT_PATH, report)
    print(json.dumps({'ok': data['ok'], 'report': str(OUT_PATH), 'sites': [{k:s.get(k) for k in ('slug','clicks','impressions','errors')} for s in data['sites']]}))
    return 0 if data['ok'] else 1

if __name__ == '__main__': sys.exit(main())
