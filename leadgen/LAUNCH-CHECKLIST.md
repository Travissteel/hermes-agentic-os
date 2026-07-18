# Lead Gen Site — Launch Checklist

The full lifecycle for one micro-niche site, from niche research to rent.
Scaffolding itself is one command (`bun ~/antigravity/leadgen/scripts/new-site.ts …`
or `/new-leadgen-site` in Claude Code).

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
5. **One site at a time.** Finish and rent one before scaffolding the next.

## Phase 1 — Domain

- Exact-match domain: `<service><location>.com` (e.g. emergencyplumbergoldcoast.com)
- .com preferred; keep it under ~$30; www is the canonical host

## Phase 2 — Scaffold & deploy

- [ ] Run the scaffolder (creates site + private GitHub repo, verified build)
- [ ] Vercel → **Import Git Repository** → select the new repo
- [ ] Vercel env vars: `RESEND_API_KEY`, `LEAD_TO_EMAIL` (your inbox),
      `LEAD_FROM_EMAIL` (once the domain is verified in Resend)
- [ ] Attach domain; set **www** as primary, apex redirects to www
- [ ] Set the site's `status: "live"` + `launchedAt` in `leadgen/sites.json`
      (the nightly cron only works `live` sites)
- [ ] Google Search Console: verify property, submit `/sitemap.xml`
- [ ] Submit a test lead on the live site and confirm the email arrives

## Phase 3 — Let it cook (3–6 months)

- The `leadgen-nightly` Hermes cron grows the site toward 40–50 pages:
  dedicated service pages, suburb pages, and the FAQ colony (PAA questions →
  ~120-word answers → internal links funnelling authority to money pages)
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
