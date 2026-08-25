# Lead Gen Site — Launch Checklist

The full lifecycle for a micro-niche site, from niche research to rent.
Two ways in:

- **Single site:** `bun ~/antigravity/leadgen/scripts/new-site.ts …` or
  `/new-leadgen-site` in Claude Code.
- **Batch (recommended for the ≥10 sites the strategy calls for):** see the
  **Batch workflow** section below.

Hosting is standardised on **Cloudflare Workers** (via the OpenNext adapter) —
free tier, no per-site cost, no commercial-use restriction. Domains and Resend
are the only per-site costs.

## Batch workflow (build many at once)

The single-site checklist below still applies to each site — the batch tooling
just runs the mechanical parts in bulk. The flow, and who owns each step:

1. **Pick + green-light (you):** for each candidate, do Phase 0 by hand. Add a
   minimal `seed` row (service, phrase, city, state, postcode, your green-light
   verdict) to `leadgen/batch/candidates.json`. See `leadgen/batch/README.md`.
2. **Draft config (AI):** run `/leadgen-batch-research` — it fills real
   suburbs+postcodes, subservices, FAQs, facts, theme, brand, keywords, and
   flips each row to `draft`. It never invents a green-light verdict.
3. **Approve (you):** review each `draft`, buy/confirm the `domain`, set the
   `email`, then set `status: "approved"`.
4. **Scaffold the batch:** `bun leadgen/scripts/batch-new-sites.ts` — scaffolds
   every approved row (build-verify + private repo + push + register),
   continue-on-error, prints a summary. `--dry-run` to test without pushing.
5. **Deploy the batch:** after domains are bought,
   `bun leadgen/scripts/batch-new-sites.ts --deploy` (needs `CF_API_TOKEN` +
   `CF_ACCOUNT_ID` in `~/.hermes/.env`). Attach each domain in Cloudflare, flip
   `status: "live"`.
6. **Cook in parallel:** the `leadgen-launch` cron front-loads launch content
   across every launching site; each graduates to the `leadgen-nightly`
   maintenance rotation once it hits its `launchTarget` (default 15 pages).

**Never interlink network sites** — no shared content, footers, cross-links, or
Search Console property, ever. This is absolute across the whole batch.

## Phase 0 — Niche & location research (before buying anything)

1. **Pick the niche:** high-ticket, urgent home services with job value $500+
   (ideally $1,000–$2,000): towing, tree service, pest control, emergency
   plumbing/electrical, roof repairs. Owner-operated trades are best — you can
   get the owner on the phone at rent time. Avoid middleman niches (private
   jet charter) and contract-locked niches (elevator servicing).
2. **Pick the location:** AU cities of roughly 60k–400k population, or suburbs
   of the capitals — not the Sydney/Melbourne CBDs.
3. **Green light test** — search Google for `<service> <town>`:
   - Map pack businesses with <10 reviews, or Facebook pages instead of
     websites → good sign
   - Organic competitors ranking with *inner pages* (site.com/service) rather
     than dedicated homepages → good sign (a dedicated site outranks an inner page)
   - SERP crowded with ads + strong map pack + established dedicated sites →
     **walk away**, pick another suburb
4. **Keyword validation:** confirm purchase-intent "compact keywords"
   (service + suburb, emergency, cost, near me) where low-DR sites (DR 0–10)
   currently rank in the top 10 — if weak sites rank, yours can outrank them.
   Manually check the top results for intent (content type / format / angle)
   so the site's money pages match what Google rewards.
5. **Green-light before you approve.** The strategy calls for a batch of ≥10
   (some will always fail to rank), so research a batch together — but a site
   only earns `approved` status once *its own* Phase 0 checks pass. Never
   scaffold a candidate you haven't green-lit.

## Phase 1 — Domain

- Exact-match domain: `<service><location>.com` (e.g. emergencyplumbergoldcoast.com)
- .com preferred; keep it under ~$30; www is the canonical host

## Phase 2 — Scaffold & deploy (Cloudflare Workers)

**One-time setup:** add `CF_API_TOKEN` (a token with the *Edit Workers* +
*Workers Scripts* permissions) and `CF_ACCOUNT_ID` to `~/.hermes/.env`
(chmod 600). Without them the scaffold + push still work; only `--deploy` is
gated. Also set `RESEND_API_KEY`, `LEAD_TO_EMAIL`, `LEAD_FROM_EMAIL` in
`~/.hermes/.env` — the deploy step reads them and sets them as Worker secrets.

- [ ] Run the scaffolder (creates site + private GitHub repo, verified build,
      writes the per-site `wrangler.jsonc` worker name)
- [ ] Deploy: `bun leadgen/scripts/batch-new-sites.ts --deploy --only <slug>`
      (or `cd ~/sites/<slug> && bun run deploy`). This runs the OpenNext
      Cloudflare build, deploys the Worker, and sets the `RESEND_API_KEY` /
      `LEAD_TO_EMAIL` / `LEAD_FROM_EMAIL` secrets from `~/.hermes/.env`
- [ ] Point the domain's nameservers at Cloudflare, then attach **both**
      `www.<domain>` (canonical) **and the bare apex** as Custom Domains on the
      Worker. `middleware.ts` 301s the apex to www, preserving path and query —
      **no Cloudflare Redirect Rule is needed**, and none should be added.
      Both can be attached via the API; `CF_API_TOKEN` has Workers-domains and
      DNS edit but *not* Rules edit, which is another reason the middleware
      approach is the supported one.
- [ ] **If the registrar was Porkbun (or any host with parking):** Cloudflare
      imports the existing DNS on zone creation. Delete the parked apex `A`
      records, the `www` CNAME, **and any wildcard `*` CNAME** — the wildcard
      silently catches every undefined subdomain and will keep serving the
      registrar's parking page. Keep MX/SPF if you use email forwarding.
- [ ] Set the site's `status: "live"` + `launchedAt` in `leadgen/sites.json`
      (the launch/nightly crons only work `live` sites)
- [ ] Google Search Console: verify property, submit `/sitemap.xml`
- [ ] Submit a test lead on the live site and confirm the email arrives

## Phase 3 — Let it cook (3–6 months)

- Two Hermes crons grow content (both use the `leadgen` skill):
  - `leadgen-launch` (3×/day) front-loads new live sites — one unit per
    launching site each run — until each reaches its `launchTarget` (~15 pages).
  - `leadgen-nightly` (4am) then maintains, growing the oldest live site toward
    40–50 pages: service pages, suburb pages, and the FAQ colony (PAA questions
    → ~120-word answers → internal links funnelling authority to money pages).
- A site graduates launch → maintenance automatically at `launchTarget`.
- Be patient — indexing and trust take months. Check Search Console monthly.
- **Never interlink sites in the network.** No shared footers, no cross-links,
  no shared Search Console property.

## Phase 3.5 — Off-page & authority (manual, spread over the cook period)

- [ ] **Launch amplification:** announce the brand on socials once (LinkedIn,
      X, Facebook local groups) for initial engagement signals
- [ ] **Directory submissions:** keep a spreadsheet; submit to general AU
      directories (Yellow Pages, TrueLocal, Localsearch) + niche/trade
      directories. Steady drip, not a burst.
- [ ] **Replicate competitor backlinks:** run a backlink gap check on the
      map-pack competitors; grab the free directories, associations, and
      industry listings already linking to them
- [ ] **Digital PR (optional):** answer journalist queries (SOS/Featured) as
      the site's founder for authority links
- [ ] **Press release hack (optional, $5–15):** one keyword-optimised release
      syndicated across news sites — feeds AI Overviews and validates the
      brand entity
- [ ] **Claim brand mentions:** search `"<brand>" -site:<domain>` and email
      unlinked mentions for a link
- [ ] **Google Business Profile (only if a real address/partner exists):**
      hyper-specific primary category ("Emergency Plumber", not "Plumber");
      steady recent reviews beat volume — never in bursts; real photos +
      short videos, no stock
- [ ] **Advanced (page stuck ~position 6):** temporary social traffic push
      ("clickbombing") can trigger a ranking spike; an optimised YouTube
      video embedded on the money page can capture Video Pack real estate

## Phase 4 — Track & rent

- [ ] Add call tracking when call volume matters (CallRail or similar);
      put the tracking number in `site.config.ts` `phoneDisplay` — the
      click-to-call buttons appear automatically
- [ ] When leads flow: approach local businesses **already running Google/
      Facebook ads** (they understand lead value)
- [ ] Test the owner: forward leads free for a few days ONLY — if they don't
      call leads back same-day, find another partner
- [ ] Monetise: flat monthly fee via Stripe autopay, or 10–20% rev-share
      (rev-share needs read access to their CRM to verify closed jobs)
- [ ] Record the arrangement in the site's `notes` field in `sites.json`
