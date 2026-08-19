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
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface Fact {
  label: string;
  value: string;
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
  };
  subServices: SubService[];
  faqs: FAQ[];
  /** Short, true, citable facts — rendered in the facts strip and llms.txt (GEO). */
  facts: Fact[];
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
