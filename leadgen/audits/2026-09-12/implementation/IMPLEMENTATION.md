# Implemented site improvements — 12 September 2026

Scope approved by Travis: all six existing sites, operator voice, email form routing preserved, GBP deferred until rental. Paused cron sites remain paused.

## Design and conversion

- Compact mobile homepages with clear quote actions and service links near the top.
- Longer configuration-owned copy remains server-rendered in expandable sections; service and area links retained. Gallery preview links to the full gallery.
- Persistent field labels, four core questions plus any required site-specific qualifiers; optional questions sit under “More job details”.
- Floating quote action hides when a form is visible. Service-page actions lead directly to the contact form.
- Contact and service wording uses the operator voice.
- Form errors retain entered details. An explicit `delivered: false` is no longer presented as success.
- No API routing, recipient settings, credentials, site configuration, domain settings, or images changed.

## Measured mobile page height

Same 390 px viewport, before and after, default collapsed state. Shorter height is a usability measure, not a ranking or conversion result.

| Site | Before (px) | After (px) | Reduction |
| --- | ---: | ---: | ---: |
| ballaratrestumping | 25,432 | 9,119 | 64% |
| bendigorestumping | 23,432 | 8,082 | 66% |
| townsvillendismods | 21,593 | 7,961 | 63% |
| bendigoestatecleanouts | 21,356 | 7,987 | 63% |
| mobilemechanictownsville | 23,404 | 8,451 | 64% |
| electricianballarat | 23,172 | 8,768 | 62% |

## SEO findings and automation

32 fresh URL inspections succeeded across the four active sites. All six Ballarat restumping service pages and four of five Bendigo service pages are not indexed. Six inspected mechanic service pages are indexed; five of six electrician service pages are indexed. The remaining electrician page is commercial electrical. These are sampled, dated findings, not sitewide declarations.

Updated the runtime `leadgen_gsc_report.py` and both leadgen cron evidence gates. Service pages take priority in inspections; the remaining commercial URLs rotate by inspection date. Legal/contact pages do not drive content work. Zero impressions is never used as an indexing diagnosis. API failures are unknown, and an initial report failure overwrites stale output with an explicit unavailable report. Cached inspections retain their actual dates.

Keep the current internal links and allow recrawl. Recheck these service URLs around **26 September 2026** before repeating changes. Assess query position, clicks and qualified leads separately. Google indexing and top-three rankings are not guaranteed by deployment.

## Verification

- Production builds and Cloudflare deployments completed for all six sites; source commits pushed to their matching repositories.
- Live checks: homepage 200, one H1, expected canonical, no horizontal overflow, no browser errors, sitemap/robots/contact return 200. Every homepage-linked service URL returns 200 with a matching canonical, one H1 and no noindex directive.
- Browser tests intercepted form requests: simulated errors preserved input; simulated success displayed confirmation. No real enquiry emails were sent. Email delivery itself relies on the user's prior confirmation; runtime secrets and API code were untouched.
- Nine SEO-report tests pass; shared template TypeScript check passed. Fresh report and cached-report runs returned no data errors.
- Backups: `~/.hermes/backups/site-design-20260912/`. Restore individual files through git if needed; do not overwrite live cron job state with the backup.

See `publish.json` for commits and `live-results.json` for measured checks. Search evidence is saved in `gsc-after.md` and `gsc-after.json`.
