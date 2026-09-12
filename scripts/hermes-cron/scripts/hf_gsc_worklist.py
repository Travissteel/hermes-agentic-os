#!/usr/bin/env python3
"""
hf_gsc_worklist.py

Turns Search Console data into a RANKED, SPECIFIC work queue for the HF nightly
cron, and writes it to ~/antigravity/shared/hf-gsc-worklist.md.

Why this exists
---------------
The nightly cron used to pick its own topic ("prefer: 1 new blog post"). Over 91
runs that produced 80 blog posts and 23 quizzes while the actual demand signal
was somewhere else entirely. Measured 2026-08-09 over 90 days:

    /location/austin      2855 impressions    0 clicks
    /location/atlanta     1845 impressions    0 clicks
    /location/detroit     1310 impressions    1 click
    /location/baltimore    810 impressions    0 clicks
    /location/fort-worth   534 impressions    1 click

~9,000 impressions across location pages, ~4 clicks. The site does not need more
pages. It needs the pages that already rank to get from page 2-3 onto page 1.

So the cron no longer chooses. This script chooses, from data, and the cron
executes the top item.

Priority model
--------------
T1 CONSOLIDATE  Two or more pages competing for the same query (cannibalization).
                Splitting rank signals across near-duplicate pages caps all of
                them. Fixing this is free traffic — no new content required.
T2 DEEPEN       A page with heavy impressions in striking distance (pos 8-30).
                Build out the specific subtopics its own queries name.
                Highest impression volume first.
T3 SNIPPET      Page ranks in the top ~15 but earns no clicks — the title/meta
                is not winning the click. Cheap fix, but only credible when
                position is good enough that CTR is genuinely the bottleneck.
T4 NEW CONTENT  Only when T1-T3 are exhausted. This was formerly the default.

Run:
  ~/.hermes/venvs/gsc/bin/python ~/.hermes/scripts/hf_gsc_worklist.py
  --days 90        lookback (default 90; needs enough volume to be stable)
  --top N          how many queue items to emit (default 12)
"""

import argparse
import collections
import os
import sys
from datetime import date, timedelta

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

KEY_PATH = os.path.expanduser("~/.hermes/keys/gsc-service-account.json")
OUT_PATH = os.path.expanduser("~/antigravity/shared/hf-gsc-worklist.md")
SITE = "sc-domain:hypnotherapy-finder.com"
SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
LAG_DAYS = 3
BASE = "https://hypnotherapy-finder.com"

# A query is "in striking distance" when it already ranks but is off page one.
STRIKE_LO, STRIKE_HI = 8, 30
# Below this, a query is noise rather than demand.
MIN_IMPR = 5


def fetch(svc, start, end, dimensions, limit=25000):
    body = {
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "dimensions": dimensions,
        "rowLimit": limit,
    }
    try:
        return svc.searchanalytics().query(siteUrl=SITE, body=body).execute().get("rows", [])
    except HttpError as e:
        sys.exit(f"ERROR querying {dimensions}: {e}")


def path_of(url):
    return url.replace(BASE, "") or "/"


def winnability(pos):
    """
    How realistically a page can reach page one from its current position.

    Consolidation and on-page work move a page a handful of positions, not
    thirty. Without this weighting the queue ranks by raw impressions and puts
    unwinnable national head terms (e.g. "hypnotherapist", 446 impressions at
    position 36) above winnable local demand.
    """
    if pos <= 12:
        return 1.0
    if pos <= 20:
        return 0.6
    if pos <= 30:
        return 0.3
    return 0.1


# Pages that should own non-local, directory-intent queries.
NATIONAL_PAGES = {
    "near me": "/hypnotherapy-near-me",
    "default": "/find-a-hypnotherapist",
}


def canonical_for(query, hits):
    """
    Choose the page that SHOULD own a query, not merely the one ranking best.

    A national query like "find a hypnotherapist" was resolving to
    /location/columbus purely because that page happened to sit highest — on six
    impressions. Directory-intent queries belong on the national pages; queries
    naming a city belong on that city's location page.
    """
    q = query.lower()

    # Brand queries belong on the homepage, always.
    if "hypnotherapy finder" in q or "hypnotherapyfinder" in q:
        return "/"

    # Does the query name a city we have a location page for?
    for h in hits:
        p = path_of(h["page"])
        if p.startswith("/location/"):
            city = p.rsplit("/", 1)[-1].replace("-", " ")
            if city and city in q:
                return p

    # Non-local directory intent → the national page built for it.
    if "near me" in q or "in my area" in q or "autour de moi" in q:
        return NATIONAL_PAGES["near me"]
    if any(t in q for t in ("hypnotherapist", "hypnotherapists", "hypnotherapy", "hypnosis", "hypnotist")):
        # No city mentioned anywhere in the query → treat as national.
        if not any(
            path_of(h["page"]).startswith("/location/")
            and path_of(h["page"]).rsplit("/", 1)[-1].replace("-", " ") in q
            for h in hits
        ):
            return NATIONAL_PAGES["default"]

    return path_of(sorted(hits, key=lambda h: h["pos"])[0]["page"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=90)
    ap.add_argument("--top", type=int, default=12)
    args = ap.parse_args()

    if not os.path.exists(KEY_PATH):
        sys.exit(f"ERROR: no service account key at {KEY_PATH}")
    creds = service_account.Credentials.from_service_account_file(KEY_PATH, scopes=SCOPES)
    svc = build("searchconsole", "v1", credentials=creds, cache_discovery=False)

    end = date.today() - timedelta(days=LAG_DAYS)
    start = end - timedelta(days=args.days - 1)

    rows = fetch(svc, start, end, ["page", "query"])
    if not rows:
        sys.exit("ERROR: no page+query data returned.")

    # ---- aggregate per page -------------------------------------------------
    pages = collections.defaultdict(lambda: {"impr": 0, "clicks": 0, "queries": []})
    # and per query, to detect two pages fighting over the same term
    by_query = collections.defaultdict(list)

    for r in rows:
        page, q = r["keys"]
        rec = {
            "query": q,
            "impr": r["impressions"],
            "clicks": r["clicks"],
            "pos": round(r["position"], 1),
        }
        p = pages[page]
        p["impr"] += r["impressions"]
        p["clicks"] += r["clicks"]
        p["queries"].append(rec)
        by_query[q].append({**rec, "page": page})

    items = []

    # ---- T1: cannibalization ------------------------------------------------
    # Same query, 2+ of our own pages ranking, none of them winning. Google is
    # splitting the signal; consolidating concentrates it.
    #
    # Two corrections learned from the first run:
    #  (a) Raw impressions over-rank unwinnable national head terms. "hypnotherapist"
    #      had 446 impressions but a best position of 36 — that is not moving to
    #      page one from an internal-linking change, so it should not outrank
    #      Austin's winnable local demand. Score is weighted by winnability.
    #  (b) The canonical must be the page that SHOULD own the term, not whichever
    #      page happens to rank highest. A national query was resolving to
    #      /location/columbus on 6 impressions.
    for q, hits in by_query.items():
        strong = [h for h in hits if h["impr"] >= MIN_IMPR]
        if len(strong) < 2:
            continue
        total_impr = sum(h["impr"] for h in strong)
        total_clicks = sum(h["clicks"] for h in strong)
        best = min(h["pos"] for h in strong)
        # Already winning it, too small to matter, or too far back to be
        # realistically winnable by consolidation alone.
        if total_impr < 20 or best < 5 or best > 25:
            continue
        strong.sort(key=lambda h: h["pos"])
        items.append({
            "tier": 1,
            "score": total_impr * winnability(best) * len(strong),
            "action": "CONSOLIDATE",
            "target": canonical_for(q, strong),
            "query": q,
            "impr": total_impr,
            "clicks": total_clicks,
            "pos": best,
            "detail": [f'{path_of(h["page"])} (pos {h["pos"]}, {h["impr"]} impr)' for h in strong[:5]],
        })

    # ---- T2: deepen striking-distance pages --------------------------------
    for page, p in pages.items():
        strike = [q for q in p["queries"] if STRIKE_LO <= q["pos"] <= STRIKE_HI and q["impr"] >= MIN_IMPR]
        if not strike:
            continue
        strike_impr = sum(q["impr"] for q in strike)
        if strike_impr < 50:
            continue
        strike.sort(key=lambda q: -q["impr"])
        items.append({
            "tier": 2,
            "score": strike_impr,
            "action": "DEEPEN",
            "target": path_of(page),
            "query": None,
            "impr": strike_impr,
            "clicks": p["clicks"],
            "pos": round(sum(q["pos"] * q["impr"] for q in strike) / strike_impr, 1),
            "detail": [f'"{q["query"]}" — pos {q["pos"]}, {q["impr"]} impr, {q["clicks"]} clicks' for q in strike[:6]],
        })

    # ---- T3: good position, no clicks --------------------------------------
    for page, p in pages.items():
        good = [q for q in p["queries"] if q["pos"] <= 15 and q["impr"] >= 30]
        if not good or p["clicks"] > 0:
            continue
        impr = sum(q["impr"] for q in good)
        good.sort(key=lambda q: -q["impr"])
        items.append({
            "tier": 3,
            "score": impr,
            "action": "SNIPPET",
            "target": path_of(page),
            "query": None,
            "impr": impr,
            "clicks": 0,
            "pos": round(min(q["pos"] for q in good), 1),
            "detail": [f'"{q["query"]}" — pos {q["pos"]}, {q["impr"]} impr, 0 clicks' for q in good[:5]],
        })

    # Rank by tier, then by traffic at stake. Keep one entry per target so the
    # queue doesn't recommend the same page three ways.
    items.sort(key=lambda i: (i["tier"], -i["score"]))
    from lib.seo_tracking import item_id, cooling_targets
    cooling, cooling_rejects = cooling_targets(with_rejects=True)
    seen, queue = set(), []
    for i in items:
        if i["target"] in cooling:
            continue
        i["work_id"] = item_id(i)
        key = (i["action"], i["target"], i["query"])
        dedupe = i["target"] if i["action"] != "CONSOLIDATE" else f'q:{i["query"]}'
        if dedupe in seen:
            continue
        seen.add(dedupe)
        queue.append(i)
        if len(queue) >= args.top:
            break

    # ---- write markdown -----------------------------------------------------
    L = []
    L.append("# HF nightly work queue — generated from Search Console")
    L.append("")
    L.append(f"Targets awaiting outcome review (suppressed below): {len(cooling)}")
    if cooling:
        L.append("")
        L.append("Recently changed, still measuring — **do not work these again yet**:")
        for t in sorted(cooling):
            L.append(f"- `{t}`")
        L.append("")
    if cooling_rejects:
        L.append("")
        L.append(f"> ⚠️ {cooling_rejects} change event(s) recorded an unusable target and")
        L.append("> could NOT be suppressed. Those pages may resurface below despite")
        L.append("> recent work. Check `target` in `~/.hermes/state/events.jsonl`.")
    L.append(f"Window: {start} → {end} ({args.days} days). Regenerate before each run.")
    L.append("")
    L.append("**Work the highest item you can complete properly in one run.** Do not")
    L.append("invent a topic. If every item here is genuinely done, say so in the report")
    L.append("and fall through to T4 (new content) — but that should be rare.")
    L.append("")
    L.append("Tiers: **T1 CONSOLIDATE** (own pages competing) → **T2 DEEPEN** (ranks pos")
    L.append("8-30, build out its own queries) → **T3 SNIPPET** (ranks well, no clicks) →")
    L.append("**T4 NEW CONTENT** (last resort).")
    L.append("")

    if not queue:
        L.append("_No eligible items. Do not create filler; wait for outcome review or new evidence._")
    for n, i in enumerate(queue, 1):
        L.append(f"## {n}. T{i['tier']} {i['action']} — `{i['target']}`")
        L.append(f"Work ID: `{i['work_id']}`")
        if i["query"]:
            L.append(f"Query: **\"{i['query']}\"** — {i['impr']} impr, {i['clicks']} clicks, best pos {i['pos']}")
            L.append("")
            L.append("Competing pages:")
        else:
            L.append(f"{i['impr']} impressions at stake · {i['clicks']} clicks · avg pos {i['pos']}")
            L.append("")
            L.append("Its own queries:")
        L.append("")
        for d in i["detail"]:
            L.append(f"- {d}")
        L.append("")
        if i["action"] == "CONSOLIDATE":
            L.append("**Do:** pick ONE canonical page for this query. Strengthen it for the")
            L.append("term, and make the others link to it with that anchor text instead of")
            L.append("competing. Do not delete the others.")
        elif i["action"] == "DEEPEN":
            L.append("**Do:** add substantive sections to this page addressing the specific")
            L.append("queries above, using their actual wording as headings where it reads")
            L.append("naturally. These are real searches this page already half-ranks for.")
        else:
            L.append("**Do:** rewrite the title tag and meta description to match the query")
            L.append("intent above. Content changes are not the bottleneck here — position")
            L.append("is already good, the snippet is not earning the click.")
        L.append("")

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w") as f:
        f.write("\n".join(L) + "\n")

    import json
    from datetime import datetime, timezone
    from pathlib import Path
    from lib.cron_quality import atomic_json
    atomic_json(Path(OUT_PATH).with_suffix(".json"), {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "window_start": str(start), "window_end": str(end), "items": queue})
    print("\n".join(L))
    print(f"\n---\nWritten to {OUT_PATH}")


if __name__ == "__main__":
    main()
