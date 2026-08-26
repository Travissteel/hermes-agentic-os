/**
 * Single source of truth for this site. The scaffolder
 * (~/antigravity/leadgen/scripts/new-site.ts) overwrites this file and
 * data/locations.json for each new site — every page, schema block, and
 * the llms.txt route read from here.
 *
 * VOICE RULE (do not remove): this brand is a quote-matching / referral
 * service. Copy must never claim to be a licensed tradesperson, and no
 * reviews, ABNs, or licence numbers may be invented.
 */

export interface SubService {
  slug: string;
  name: string;
  blurb: string;

  /**
   * These are the MONEY PAGES — the pages buyers search for and the ones that
   * have to rank. Everything below is optional so the template still builds,
   * but shipping a sub-service on `blurb` alone is what produced the network's
   * indexation problem: measured 2026-08-19, service pages were ~180 words and
   * 54% identical to their siblings, and Google left them uncrawled.
   *
   * Write only what is TRUE and specific to this sub-service. Generic trade
   * copy that would fit any of them is worse than leaving the field out.
   */

  /** What the job actually involves, in plain terms. 100-200 words. */
  whatItInvolves?: string;

  /** Concrete situations that call for this specific sub-service. */
  whenYouNeedIt?: string[];

  /** How the job runs start to finish. */
  process?: { step: string; detail: string }[];

  /** Honest price framing — ranges and what moves them. Never invent figures. */
  priceGuide?: string;

  /** 2-4 questions buyers ask about THIS sub-service, not the trade generally. */
  faqs?: FAQ[];

  /** Illustrative image for the service card and page header. Optional. */
  image?: SiteImage;
}

/**
 * An image shipped in public/images.
 *
 * VOICE RULE APPLIES TO IMAGERY. This brand is a quote-matching service, not
 * the trade. An image — or an alt text — that reads as "our team" or "our work"
 * is the same Gate 1 fabrication as an invented review or licence number.
 *
 * So: photograph the WORK and the PLACE, never people presented as ours.
 * A switchboard, an engine bay, a hand tool, a streetscape. No smiling
 * tradespeople in branded hi-vis, no "meet the team", no before/after shots
 * implying we did the job.
 *
 * Stock imagery earns trust and conversion. It earns no ranking — these files
 * appear on thousands of other sites and Google knows it. Treat them as
 * conversion furniture, never as an SEO investment, and never let one push the
 * money copy below the fold.
 */
export interface SiteImage {
  /** Filename under public/images, e.g. "hero.webp" — not a full path. */
  src: string;
  /**
   * Describes what is literally shown, for screen readers and image search.
   * Describe the object or place. Never assert who owns or did the work.
   */
  alt: string;
  /** Intrinsic pixel dimensions. Required — they are what prevent layout shift. */
  width: number;
  height: number;
  /** Source + licence, kept on record even where attribution isn't required. */
  credit?: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface Fact {
  label: string;
  value: string;
}

/**
 * A qualifying question shown under the main lead fields.
 *
 * These exist so the operator you forward the lead to can price the job
 * without a site visit — the difference between "2 bed unit, please quote"
 * and a lead they can put a number against over the phone.
 *
 * Design rules, learned the expensive way:
 * - Keep it to ~5. Every extra field costs conversion, and a form that looks
 *   like paperwork gets abandoned by exactly the distressed customer you most
 *   want to reach.
 * - Prefer `select` over `text`. Tapping a dropdown is far cheaper than
 *   typing, and it gives you clean comparable values instead of prose.
 * - Always include a "Not sure" option. Someone clearing a late parent's unit
 *   often genuinely does not know, and forcing a guess makes them bounce.
 * - Leave `required` off unless the job cannot be priced without it. The four
 *   core fields (name, phone, suburb, message) are the only hard gates.
 */
export interface Qualifier {
  /** Payload key + form field name. Must be unique within the site. */
  name: string;
  /** Shown above the control. Short and conversational. */
  label: string;
  type: "select" | "text";
  /** Required for `select`, ignored for `text`. */
  options?: string[];
  /** Placeholder for `text`. */
  placeholder?: string;
  required?: boolean;
}

export interface SiteConfig {
  brandName: string;
  /** Canonical origin — always the www host, no trailing slash. */
  domain: string;
  service: {
    /** e.g. "Emergency Plumber" */
    name: string;
    /** e.g. "emergency plumbing" — used mid-sentence */
    phrase: string;
  };
  location: {
    city: string;
    state: string;
    stateAbbr: string;
    postcode: string;
  };
  email: string;
  /** Optional display phone; empty string hides phone UI + schema field. */
  phoneDisplay: string;
  theme: {
    primary: string;
    accent: string;
    /**
     * Visual variant. Sites in this network must not look like each other —
     * a shared template rendering forty identical layouts is a footprint,
     * and each site is meant to read as an independent local business.
     * Colour alone is not enough separation, so the variant also swaps the
     * heading typeface, the hero composition and the corner radius.
     *
     *   "bold"  condensed uppercase headings, dark photographic hero with
     *           the form beside it, tight corners. Reads trades/urgent.
     *   "clean" Inter headings, light hero with the photo as a side card and
     *           the form in a band below, soft corners. Reads considered.
     *
     * Defaults to "bold" when omitted so existing sites are unaffected.
     */
    variant?: "bold" | "clean";
  };
  subServices: SubService[];
  faqs: FAQ[];
  /**
   * Optional imagery. Omit entirely and every page renders exactly as it did
   * before the image layer existed — text-only is a supported state, not a
   * broken one.
   */
  images?: {
    /**
     * Wide contextual shot behind the hero. This is the page's LCP element,
     * so it renders with `priority` and must be pre-sized (~1600px wide max)
     * and compressed. A heavy hero is worse than no hero.
     */
    hero?: SiteImage;
  };
  /** Short, true, citable facts — rendered in the facts strip and llms.txt (GEO). */
  facts: Fact[];
  /** Omit or leave empty and the form renders with the core fields only. */
  qualifiers?: Qualifier[];
  /**
   * Overrides the message textarea placeholder. Use it to prompt for details
   * that matter to this trade but don't warrant a field of their own.
   */
  messagePrompt?: string;
}

// EXAMPLE CONFIG — the template must always build; the scaffolder replaces this.
export const SITE: SiteConfig = {
  brandName: "Gold Coast Emergency Plumber Quotes",
  domain: "https://www.example-leadgen-site.com",
  service: {
    name: "Emergency Plumber",
    phrase: "emergency plumbing",
  },
  location: {
    city: "Gold Coast",
    state: "Queensland",
    stateAbbr: "QLD",
    postcode: "4217",
  },
  email: "quotes@example-leadgen-site.com",
  phoneDisplay: "",
  theme: {
    primary: "#0f766e",
    accent: "#f59e0b",
  },
  subServices: [
    {
      slug: "burst-pipes",
      name: "Burst Pipe Repairs",
      blurb:
        "Burst or leaking pipes can flood a home in minutes. We connect you with local plumbers who handle urgent pipe repairs day and night.",
    },
    {
      slug: "blocked-drains",
      name: "Blocked Drains",
      blurb:
        "From slow-draining sinks to fully blocked sewer lines, get quotes from local plumbers with jet-rodding and CCTV drain camera equipment.",
    },
    {
      slug: "hot-water-systems",
      name: "Hot Water System Repairs",
      blurb:
        "No hot water? We match you with plumbers who repair and replace electric, gas, and solar hot water systems across the region.",
    },
  ],
  faqs: [
    {
      question: "How fast can an emergency plumber get to me on the Gold Coast?",
      answer:
        "Most emergency plumbers on the Gold Coast aim to arrive within 1–2 hours for genuine emergencies like burst pipes or gas leaks. Response times depend on your suburb and the time of day.",
    },
    {
      question: "How much does an emergency plumber cost in Queensland?",
      answer:
        "Emergency call-out fees in Queensland typically range from $120 to $250, with after-hours work billed at higher hourly rates. Requesting quotes from more than one plumber is the best way to compare pricing for your specific job.",
    },
    {
      question: "Is this site a plumbing company?",
      answer:
        "No. We are a free quote-matching service. We take your job details and connect you with licensed local plumbers who then contact you directly with quotes.",
    },
  ],
  facts: [
    { label: "Service area", value: "Gold Coast, QLD and surrounding suburbs" },
    { label: "Cost of a quote", value: "Free — no obligation" },
    { label: "Typical emergency response", value: "1–2 hours, subject to availability" },
  ],
};

/** "Emergency Plumber Gold Coast" — the site's core keyphrase. */
export const CORE_PHRASE = `${SITE.service.name} ${SITE.location.city}`;
