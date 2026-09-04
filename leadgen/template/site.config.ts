/**
 * Single source of truth for this site. The scaffolder
 * (~/antigravity/leadgen/scripts/new-site.ts) overwrites this file and
 * data/locations.json for each new site — every page, schema block, and
 * the llms.txt route read from here.
 *
 * VOICE RULE (do not remove) — changed 2026-09-01, operator brand.
 *
 * These sites present as the local operator, not as a matching service.
 * Copy is first-person and confident: "we assess", "our process", "the work
 * we do". No "we're just a referral service" disclaimers anywhere in the
 * funnel — they were costing form fills and they are gone.
 *
 * WHAT DID NOT CHANGE: nothing verifiable may be invented. Presenting as an
 * operator is positioning; claiming a specific credential you cannot produce
 * on request is a false representation, and in most of these trades it is
 * also a licensing offence. So:
 *
 *   - NEVER invent reviews, ratings, testimonials or completed-job counts.
 *   - NEVER invent an ABN, licence, registration or insurance claim. The
 *     `credentials` field exists for real ones and is empty by default.
 *   - NEVER invent a founding year or "X years serving". `establishedYear`
 *     is optional and must be omitted until there is a real business behind
 *     it — copy falls back to timeless phrasing when it is absent.
 *
 * Write in the operator's voice about the WORK (what the job involves, what
 * affects the price, how long it takes, local conditions). That is both true
 * and what actually ranks.
 */

export type {
  IconName,
  SubService,
  SiteImage,
  FAQ,
  Fact,
  Stat,
  ValueCard,
  ProcessStep,
  LongformSection,
  GalleryItem,
  Qualifier,
  SiteConfig,
} from "@/lib/site-types";

import type { SiteConfig } from "@/lib/site-types";

// EXAMPLE CONFIG — the template must always build; the scaffolder replaces this.
export const SITE: SiteConfig = {
  brandName: "Gold Coast Emergency Plumbing",
  tagline: "Fast Help When Water Won't Wait",
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
        "Burst or leaking pipes can flood a home in minutes. We isolate the leak, expose the damaged section and repair or replace it, day or night.",
    },
    {
      slug: "blocked-drains",
      name: "Blocked Drains",
      blurb:
        "From slow-draining sinks to fully blocked sewer lines, we clear the blockage with jet-rodding and confirm the cause with a CCTV drain camera.",
    },
    {
      slug: "hot-water-systems",
      name: "Hot Water System Repairs",
      blurb:
        "No hot water? We diagnose and repair electric, gas and solar hot water systems, and replace the ones that are past economical repair.",
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
      question: "Do you charge to come out and quote?",
      answer:
        "No. Quoting an emergency plumbing job on the Gold Coast is free and carries no obligation. We look at what's happening, explain the options in plain terms, and give you a written scope before any work starts.",
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
