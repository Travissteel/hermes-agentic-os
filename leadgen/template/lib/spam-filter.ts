/**
 * Lead spam scoring.
 *
 * Built in response to a real submission on townsvillendismods.com
 * (2026-08-01 02:52 AEST): a headless browser crawled the whole site from one
 * US IP, then POSTed an SEO sales pitch from a second US IP 14 seconds later.
 * It walked straight past the honeypot, so hidden-field and timing checks are
 * not enough on their own.
 *
 * The scoring is deliberately advisory — see `SPAM_THRESHOLD`. A submission
 * that scores over the line still gets delivered, just flagged. Real enquiries
 * from people typing a neighbouring suburb or a landline in an odd format are
 * more valuable than a perfectly clean inbox.
 */

import type { ServiceArea } from "@/lib/locations";

export interface ScoredLead {
  name: string;
  phone: string;
  suburb: string;
  message: string;
}

export interface SpamVerdict {
  score: number;
  /** Human-readable signals, shown in the flagged email. */
  reasons: string[];
  isSpam: boolean;
}

/** Score at or above this is flagged (not rejected). */
export const SPAM_THRESHOLD = 4;

/**
 * Signal weights.
 *
 * Tuned 2026-08-26 after a real test lead on mobilemechanictownsville was
 * flagged. Two classes of signal, and the split matters:
 *
 * STRONG — things a customer never does. Sales-pitch language alone is enough
 * to flag, because "SEO"/"rank higher"/"backlink" has no place in a request
 * for a quote on a broken car or a switchboard.
 *
 * WEAK — things a flustered human does all the time. A typo'd phone number and
 * a suburb we happen not to list are each poor evidence of anything. Before
 * this split they summed to 5 and flagged a perfectly real lead. Now they sum
 * to 3 and do not, while every genuine spam pattern still clears the bar
 * comfortably (the SEO pitch that prompted the filter scores 11).
 */
const W = {
  pitchLanguage: 4,
  urlInMessage: 2,
  brandQuoted: 2,
  suburbDuplicatesName: 2,
  implausiblePhone: 2,
  unknownSuburb: 1,
} as const;

/**
 * Australian phone numbers, after stripping formatting:
 *   04xxxxxxxx  mobile          02/03/07/08 + 8 digits  landline
 *   1300xxxxxx / 1800xxxxxx     13xxxx                  service numbers
 * A +61 prefix is normalised to a leading 0 first.
 */
function isPlausibleAuPhone(raw: string): boolean {
  let d = raw.replace(/[\s()\-.+]/g, "");
  if (d.startsWith("0061")) d = "0" + d.slice(4);
  else if (d.startsWith("61") && d.length === 11) d = "0" + d.slice(2);
  if (!/^\d+$/.test(d)) return false;

  if (/^0[23478]\d{8}$/.test(d)) return true; // landline (02/03/07/08) + mobile (04)
  if (/^1[38]00\d{6}$/.test(d)) return true; // 1300 / 1800
  if (/^13\d{4}$/.test(d)) return true; // 13xxxx
  return false;
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Phrases that belong in a pitch to the site owner, not in a request for a
 * quote. Kept narrow on purpose — a homeowner describing their job should
 * never trip these.
 */
const PITCH_PHRASES = [
  "your website",
  "your site",
  "your platform",
  "your online presence",
  "seo",
  "search engine",
  "rank higher",
  "ranking",
  "google ranking",
  "digital marketing",
  "web design",
  "web development",
  "lead capture",
  "lead generation",
  "increase your traffic",
  "more traffic",
  "backlink",
  "guest post",
  "we can help",
  "we specialize",
  "we specialise",
  "our team can",
  "boost your",
  "grow your business",
  "i came across your",
  "i noticed your",
  "free consultation",
  "no obligation quote for our",
];

/**
 * Is this suburb plausibly in our patch?
 *
 * The service-area list is an SEO artifact — the handful of suburbs we built
 * pages for — not a gazetteer. Townsville has dozens of suburbs; we list seven.
 * Matching only against those marked the city's own name, its postcode, and
 * every unlisted-but-real suburb as suspicious.
 *
 * So we accept, in addition to the listed suburbs:
 *   - the city itself ("Townsville") — what most people actually type
 *   - any postcode we know (site postcode + each area's)
 *   - anything CONTAINING a known name, which covers "Kirwan, Townsville",
 *     "Ballarat East" and "North Wendouree" without needing to enumerate them
 *
 * A genuinely unlisted suburb ("Mount Louisa") still scores, but only 1 — weak
 * evidence, treated weakly.
 */
function isKnownSuburb(
  raw: string,
  areas: ServiceArea[],
  city: string,
  postcode: string,
): boolean {
  const s = normalise(raw);
  if (!s) return true;

  const postcodes = new Set(
    [postcode, ...areas.map((a) => a.postcode)].filter(Boolean).map(normalise),
  );
  if (postcodes.has(s)) return true;

  // Names worth substring-matching. Short ones are excluded because a
  // three-letter fragment matches far too much by accident.
  const names = [city, ...areas.map((a) => a.name), ...areas.map((a) => a.slug)]
    .map(normalise)
    .filter((n) => n.length >= 4);

  return names.some((n) => s === n || s.includes(n));
}

export function scoreLead(
  lead: ScoredLead,
  areas: ServiceArea[],
  site: { brandName: string; city: string; postcode: string },
): SpamVerdict {
  const reasons: string[] = [];
  let score = 0;
  const brandName = site.brandName;

  if (!isPlausibleAuPhone(lead.phone)) {
    score += W.implausiblePhone;
    reasons.push(`Phone "${lead.phone}" is not a valid AU number`);
  }

  // Advisory: someone in a nearby suburb is still a real lead, so this can
  // never flag on its own — nor alongside one other weak signal.
  const suburb = normalise(lead.suburb);
  if (suburb && !isKnownSuburb(lead.suburb, areas, site.city, site.postcode)) {
    score += W.unknownSuburb;
    reasons.push(`Suburb "${lead.suburb}" is not in the service area list`);
  }

  // The Townsville bot put the submitter's own name in the suburb field.
  const name = normalise(lead.name);
  if (suburb && name && (name.includes(suburb) || suburb.includes(name))) {
    score += W.suburbDuplicatesName;
    reasons.push("Suburb field duplicates the name field");
  }

  const message = lead.message.toLowerCase();
  const hits = PITCH_PHRASES.filter((p) => message.includes(p));
  if (hits.length > 0) {
    score += W.pitchLanguage;
    reasons.push(`Sales-pitch language: ${hits.slice(0, 4).join(", ")}`);
  }

  if (/https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co)\b/i.test(lead.message)) {
    score += W.urlInMessage;
    reasons.push("Message contains a URL or domain");
  }

  // Scrapers paraphrase the site's own copy back at you; customers don't.
  if (brandName && message.includes(brandName.toLowerCase())) {
    score += W.brandQuoted;
    reasons.push("Message quotes the site's own brand name");
  }

  return { score, reasons, isSpam: score >= SPAM_THRESHOLD };
}
