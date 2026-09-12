/**
 * Shared type definitions for site.config.ts.
 *
 * These live apart from the config itself because the scaffolder
 * (~/antigravity/leadgen/scripts/lib/scaffold.ts) generates a fresh
 * site.config.ts for every new site. It used to carry its own copy of every
 * interface in a template literal, so each field added here had to be
 * hand-duplicated there — and when that was missed, new sites silently
 * shipped with an older schema. The scaffolder now emits a config that
 * imports from this file, so there is one definition of the shape.
 *
 * site.config.ts re-exports everything below, so `@/site.config` remains the
 * import path for the rest of the app.
 */

/**
 * Icons available to value cards and process steps. Kept as a closed union so
 * a typo in a config fails the build rather than rendering a blank square —
 * these configs are written by an unattended cron, which never sees a warning.
 * Implementations live in components/icons.tsx.
 */
export type IconName =
  | "activity"
  | "calendar"
  | "check"
  | "clipboard"
  | "clock"
  | "dollar"
  | "home"
  | "phone"
  | "search"
  | "shield"
  | "star"
  | "users"
  | "wrench";

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
 * IMAGERY RULE. Under the operator voice an image may show the work and be
 * captioned as ours — a gallery of jobs is expected of a trade site and is
 * no longer treated as a fabrication.
 *
 * The line that remains: do not present identifiable PEOPLE as our team, and
 * do not stage before/after pairs as a specific customer's job. A stranger's
 * face in stock hi-vis captioned "our crew" is a claim about a real person,
 * not positioning. Photograph the work, the tools and the place.
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
 * A single figure in the stats strip.
 *
 * TRUTH GATE. This strip is the easiest place on the site to lie by accident,
 * because a number reads as evidence. Only use values that are true by
 * construction — the size of the service area, the response window you
 * actually honour, the year in `establishedYear` if one is set. Never a job
 * count, a customer count, a rating, or "X years" derived from a year you
 * invented.
 */
export interface Stat {
  /** The figure itself, e.g. "< 24 hrs". Kept short — this renders large. */
  value: string;
  label: string;
}

/**
 * A titled block of body copy with an icon — used by the differentiators
 * ("what sets us apart") and promises sections.
 *
 * `body` should run 60-110 words and say something specific to this trade in
 * this city. Three cards of interchangeable reassurance ("quality work, fair
 * prices, great service") add page weight with no ranking value and are worse
 * than shipping fewer cards.
 */
export interface ValueCard {
  title: string;
  body: string;
  /** Named icon from components/icons.tsx. Falls back to a check mark. */
  icon?: IconName;
}

/** Site-level process step, distinct from the per-sub-service `process`. */
export interface ProcessStep {
  title: string;
  body: string;
  icon?: IconName;
}

/**
 * A long, image-flanked prose section on the home page.
 *
 * This is the single highest-value block in the template. The network's
 * indexation problem was thin pages — measured 2026-08-19, service pages ran
 * ~180 words and 54% identical to their siblings, and Google left them
 * uncrawled. These sections are the fix: each one should carry 250-450 words
 * of genuinely specific copy (materials and methods, what moves the price,
 * how long jobs take, local ground and access conditions).
 *
 * Name real suburbs, real streets, real local conditions. That specificity is
 * the part a competitor cannot copy and the part Google cannot dismiss as
 * boilerplate.
 */
export interface LongformSection {
  /** Stable anchor + React key, e.g. "materials". */
  id: string;
  eyebrow: string;
  heading: string;
  /** One-paragraph standfirst under the heading. */
  intro: string;
  /** Body paragraphs. Two to five. */
  body: string[];
  image?: SiteImage;
}

/** A gallery entry — a photo of the work with a short caption. */
export interface GalleryItem extends SiteImage {
  /** Overlay label, e.g. "House Restumping". */
  caption: string;
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
  /** Optional site-owned brand treatment; preserved by template sync. */
  homepage?: {
    style: "grounded" | "goldfields";
    quickLinks?: { label: string; href: string }[];
    headline: string;
    introduction: string;
    serviceHints: Record<string, { situation: string; explanation: string }>;
  };
  brandName: string;
  /** Short positioning line under the logo, e.g. "Strong Foundations Start Here". */
  tagline?: string;
  /**
   * Year the operating business was established.
   *
   * OMIT IT unless a real business stands behind the site. It drives the
   * stats strip, the about heading and `foundingDate` in LocalBusiness JSON-LD
   * — a fabricated value here is a structured-data claim to Google, not just
   * marketing copy. Every consumer of this field falls back to timeless
   * phrasing when it is absent.
   */
  establishedYear?: number;
  /**
   * Real, produceable credentials only — licence or registration numbers, ABN,
   * insurance. Rendered verbatim in the footer. Empty by default and it must
   * stay that way until the site is let to an operator who actually holds them.
   */
  credentials?: string[];
  /** Thin bar above the header. Omit to hide it. */
  announcement?: string;
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
     *   "trade" Poppins headings, full-bleed photographic hero with a dark
     *           scrim and the quote card floating over it, warm neutral
     *           surfaces, announcement bar above the header and mobile
     *           call/quote FABs. Reads established local operator.
     *
     * Defaults to "bold" when omitted so existing sites are unaffected.
     */
    variant?: "bold" | "clean" | "trade";
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
    /** Portrait-ish shot beside the about block. */
    about?: SiteImage;
    /**
     * Work photos. The home page shows the first 8; /gallery shows them all.
     * Omit entirely and both the home section and the /gallery route drop out
     * — an empty gallery page is worse than no gallery page.
     */
    gallery?: GalleryItem[];
  };
  /** Short, true, citable facts — rendered in the facts strip and llms.txt (GEO). */
  facts: Fact[];
  /** Large-figure strip under the services grid. Omit to hide. See Stat's truth gate. */
  stats?: Stat[];
  /** "What sets us apart" cards. Aim for 4-6. */
  differentiators?: ValueCard[];
  /** Site-level "how we work" steps. Aim for 3-4. */
  process?: ProcessStep[];
  /** "Our promise" cards addressing what customers worry about. Aim for 3. */
  promises?: ValueCard[];
  /** Multi-paragraph about block on the home page. */
  about?: {
    eyebrow: string;
    heading: string;
    body: string[];
  };
  /**
   * The suburb-by-suburb block. This is where local specificity lives and it
   * is the strongest single ranking asset on the home page — name real
   * neighbourhoods, landmarks and ground conditions, not "the surrounding
   * areas".
   */
  localArea?: {
    eyebrow: string;
    heading: string;
    intro: string;
    body: string[];
  };
  /** Long image-flanked prose sections. See LongformSection — 250-450 words each. */
  longform?: LongformSection[];
  /** Omit or leave empty and the form renders with the core fields only. */
  qualifiers?: Qualifier[];
  /**
   * Overrides the message textarea placeholder. Use it to prompt for details
   * that matter to this trade but don't warrant a field of their own.
   */
  messagePrompt?: string;
}
