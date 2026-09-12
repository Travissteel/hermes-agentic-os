# Rank-and-rent review — 12 September 2026

Reviewed six live homepages in desktop and mobile Chrome, shared and site-specific form code, fresh Search Console data, and four service URLs through URL Inspection. No website code, deployment, cron configuration, site status or external message was changed.

Travis confirmed that none is rented yet: he will receive enquiries and refer them to businesses, then rent the sites as rankings improve. Reliable enquiry handling and evidence of booked work are therefore central to the design and SEO plan.

## Search baseline

Fresh Search Console data: 13 August–9 September 2026 versus 16 July–12 August. These are historical averages, not live rankings.

| Site | Cron status | Impressions current / prior | Clicks current / prior |
|---|---|---:|---:|
| Ballarat Restumping | Active | 340 / 96 | 3 / 0 |
| Bendigo Restumping | Active | 426 / 195 | 0 / 0 |
| Mobile Mechanic Townsville | Active | 319 / 0 | 0 / 0 |
| Electrician Ballarat | Active | 83 / 0 | 0 / 0 |
| Townsville NDIS Mods | Paused | 17 / 7 | 1 / 1 |
| Bendigo Estate Cleanouts | Paused | 32 / 2 | 2 / 0 |

Total: 6 clicks from 1,217 impressions. The paused sites produced three clicks, but the samples are too small to justify automatically changing allocations. They remain paused. Property, query and page totals can differ because of aggregation and privacy filtering.

## Priority 1: reliable lead capture

All six local site implementations have the same failure mode: if email configuration is absent, the API returns HTTP 200 with `delivered:false`, but the client treats HTTP 200 as success, clears the form and shows “Request received”. This is a confirmed code defect, not evidence that production credentials are currently absent. No real enquiry was submitted.

Fix the API/client contract so unavailable delivery does not produce a false confirmation. Preserve entered details on failure. Prefer durable lead storage with a unique lead ID, separate delivery status and safe retries. Email alone is not a lead ledger.

Record landing page, source, enquiry acceptance, delivery, referral, contact, quote and booked outcome. Keep personal details out of analytics. Cloudflare analytics is present; the missing piece is the conversion and lead journey.

None of the six homepages offers a telephone link. Add a real enquiry number only when Travis can answer or arrange reliable handling. Emergency traffic is a poor fit for an unstaffed quote-only flow.

## Priority 2: simpler mobile design

At a 390×844 viewport, active homepages contain approximately 3,500–3,770 visible words and run 23,000–25,400 pixels tall. Four of the six sites present nine visible form fields. The electrician form starts about 1,053 pixels down; the estate-cleanout form about 1,128 pixels down. Ballarat Restumping's four-field form begins about 728 pixels down.

This is a usability hypothesis, not measured proof of lost conversions. There is too little traffic for a meaningful split test today.

Pilot Ballarat Restumping first. Retain its amber/charcoal identity and strong image treatment, but simplify the homepage to:

1. Problem-led headline, clear service area and one visible quote action.
2. Three common problems linked to relevant service pages.
3. Brief quote factors and service scope.
4. Real project or partner evidence when available.
5. A simple three-step enquiry/referral process.
6. Selected useful FAQs and service-area links.
7. A short, persistently labelled form.

Example headline: “Uneven floors or sticking doors? Start with a restumping quote in Ballarat.” Explain the actual referral handoff concisely. Replace the floating clipboard-only control with a labelled action. Use “Request a quote” rather than plural quotes unless multiple quotes are genuinely arranged. Move optional qualification questions into an expandable section or follow-up.

Preserve useful detailed content on service pages; do not delete strong material or URLs just to hit a word limit. Generated or stock illustrations should not be presented as completed projects or the actual crew.

## Priority 3: align promises with the operating model

Homepage copy describes arriving, diagnosing and performing trade work. Privacy pages describe passing enquiries to local professionals. Those accounts should agree. Preserve the brand but explain who receives the request and what happens next near the form. Do not promise response times, actual prices, credentials or availability until a recipient business can support them.

## Priority 4: fix SEO work selection

The existing report subtracts pages with impressions from sitemap count and frames the difference as an indexation gap. It then inspects the first eight missing URLs, which can repeatedly prioritise contact, privacy and terms ahead of money pages. Missing impressions are not proof of missing indexation.

Separate URL Inspection status, search visibility and leads. Inspect commercially important service URLs first and rotate remaining samples.

Fresh sampled URL Inspection results:

- Ballarat `/services/full-house-restumping`: unknown to Google; verified live in Chrome with HTTP 200.
- Bendigo `/services/full-house-restumping`: unknown to Google; verified live in Chrome with HTTP 200.
- Mechanic `/services/mobile-diesel-mechanic`: submitted and indexed; declared and Google canonicals agree.
- Electrician `/services/rental-electrical-safety-checks`: submitted and indexed; canonicals agree.

These four checks are not a complete index census. For restumping, verify crawl access, sitemap inclusion and prominent links from relevant home/service/cost content, then request indexing where Search Console permissions allow. A sitemap does not guarantee indexing.

Site-specific priorities:

- Ballarat: “restumping ballarat” has 94 impressions at average position 32.6. Improve the home/service relationship and quote path. The staged-restumping FAQ has 88 page impressions and should lead naturally to an enquiry.
- Bendigo: the full-house cost FAQ has 228 impressions at average position 69.8. It shows topic discovery, not proximity to page one. Improve useful detail and its link to the full-house service rather than creating near-identical cost pages.
- Mechanic: diesel service page has 64 impressions at average position 47.0. Focus on useful diesel, battery and brake service content and a working enquiry route. One- or two-impression queries are not established winners.
- Electrician: preserve the focused rental-check experiment. Its money page is indexed; improve the route from supporting content to a genuine enquiry and available contractor. Source regulatory statements from current official guidance.

Google recommends original, useful content rather than material created mainly to attract search traffic: https://developers.google.com/search/docs/fundamentals/creating-helpful-content

FAQ markup and llms.txt should not drive the SEO plan. Google's current documentation says FAQ rich results ceased appearing in May 2026 and llms.txt does not affect Google visibility or rankings. Useful FAQ content can still serve visitors and rank as ordinary pages: https://developers.google.com/search/updates

## Rental readiness

Distinguish top-three organic rankings for named queries from the map pack. Google's Business Profile rules exclude lead-generation agents/companies. Do not make the current strategy depend on profiles for unstaffed trade brands: https://support.google.com/business/answer/13763036?hl=en

Identify potential enquiry recipients before the ranking target is reached. Rental evidence should include qualified enquiries per month, contact speed, quote and booking rates, approximate job value and the originating queries/locations. A low-volume top-three ranking may be worth less than a lower-ranking page producing booked work. No outreach was sent.

## Technical findings and limits

All six homepages returned 200 in Chrome, with a single H1, matching canonical host, no observed horizontal overflow and no captured JavaScript exceptions. All checked image URLs returned 200. Robots and sitemaps were reachable, contact pages returned 200 and a made-up path returned 404.

An unthrottled mobile-viewport lab sample on the four active sites observed LCP around 0.56–1.33 seconds and initial subresource transfer around 383–467 KB. These are not Core Web Vitals field measurements or slow-mobile benchmarks. No evidence here justifies a framework rebuild as the first investment.

Some direct Python requests returned 403 while Chrome succeeded. This does not establish that Googlebot is blocked; inspect bot/WAF logs before reaching that conclusion.

## Recommended sequence

1. Fix enquiry acknowledgement, reliable storage and the referral handoff.
2. Pilot the shorter mobile journey on Ballarat Restumping.
3. Correct SEO reporting and prioritise actual money-page discovery.
4. Improve one demand-backed page at a time and record outcomes.
5. Reassess allocation and rental readiness using qualified leads and booked work.

Evidence JSON and mobile screenshots are saved beside this report.
