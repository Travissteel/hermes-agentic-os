/**
 * Core scaffolding logic for a micro-niche lead gen site, extracted so both
 * the single-site CLI (../new-site.ts) and the batch runner
 * (../batch-new-sites.ts) share one verified code path.
 *
 * scaffoldSite() copies the template → writes site.config.ts +
 * data/locations.json + per-site wrangler.jsonc name → bun install →
 * bun run build (must pass) → git init/commit → create private GitHub repo →
 * push → register in sites.json. Returns the created site's identifiers.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
/**
 * Type-only, so it is erased before this ever runs — no runtime coupling to
 * the Next app, just one definition of the content shapes instead of a second
 * copy that drifts. These are passed straight through into the generated
 * site.config.ts.
 */
import type {
  GalleryItem,
  LongformSection,
  ProcessStep,
  Stat,
  ValueCard,
} from "../../template/lib/site-types";

export const LEADGEN_DIR = path.join(homedir(), "antigravity", "leadgen");
export const TEMPLATE_DIR = path.join(LEADGEN_DIR, "template");
export const REGISTRY = path.join(LEADGEN_DIR, "sites.json");
export const SITES_DIR = path.join(homedir(), "sites");
export const GITHUB_USER = "Travissteel";
/** Default page count a site should reach before it graduates launch → maintain. */
export const DEFAULT_LAUNCH_TARGET = 15;

export interface Suburb {
  name: string;
  postcode: string;
  /**
   * Locally specific opening paragraph. Supply this whenever it's known —
   * omitting it now seeds a visible TODO rather than generic filler, because
   * interpolated boilerplate across suburbs is what got the network's area
   * pages left uncrawled.
   */
  blurb?: string;
}

export interface SubService {
  slug: string;
  name: string;
  blurb: string;
  /** Optional depth fields — see the emitted site.config.ts for the contract. */
  whatItInvolves?: string;
  whenYouNeedIt?: string[];
  process?: { step: string; detail: string }[];
  priceGuide?: string;
  faqs?: FAQ[];
  image?: SiteImage;
}

/**
 * See the SiteImage docblock in the emitted site.config.ts, and
 * template/public/images/README.md for the sourcing + sizing rules.
 * Objects and places only — never people presented as ours.
 */
export interface SiteImage {
  src: string;
  alt: string;
  width: number;
  height: number;
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

/** See the Qualifier docblock in the emitted site.config.ts. */
export interface Qualifier {
  name: string;
  label: string;
  type: "select" | "text";
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

export interface ScaffoldOpts {
  service: string;
  phrase: string;
  city: string;
  state: string;
  stateAbbr: string;
  postcode: string;
  brand: string;
  /** Short positioning line under the logo, e.g. "Strong Foundations Start Here". */
  tagline?: string;
  /**
   * Real founding year only. Drives the stats strip, the about heading and
   * `foundingDate` in LocalBusiness JSON-LD — omit it and every consumer
   * falls back to timeless phrasing. Never pass a number you made up.
   */
  establishedYear?: number;
  /** Thin bar above the header. Omitted → no bar. */
  announcement?: string;
  /** www host or bare domain, with or without protocol — normalised internally. */
  domain: string;
  email: string;
  suburbs: Suburb[];
  phone?: string;
  primary?: string;
  accent?: string;
  /**
   * Visual variant — "bold" | "clean" | "trade". Forty sites off one template
   * rendering one layout is a footprint, so spread these across the network
   * rather than defaulting everything. Omitted → "bold", as before.
   */
  variant?: "bold" | "clean" | "trade";
  /**
   * Optional AI-drafted config (from the batch candidates file). When present
   * and non-empty these replace the generic defaults the single-site CLI uses.
   */
  subServices?: SubService[];
  faqs?: FAQ[];
  facts?: Fact[];
  /**
   * Optional imagery. Files themselves are added to the site's public/images
   * by hand after scaffolding — this only carries the config that points at
   * them. Omitted → the site renders text-only.
   */
  images?: { hero?: SiteImage; about?: SiteImage; gallery?: GalleryItem[] };
  /**
   * Rich home-page content. All optional — a site with none of it renders the
   * same lean page the network shipped before these sections existed.
   *
   * `longform` is the one that matters most: 250-450 words per section of
   * genuinely local, genuinely specific copy is the fix for the thin-page
   * indexation problem (service pages measured ~180 words and 54% identical
   * to their siblings on 2026-08-19, and went uncrawled).
   */
  stats?: Stat[];
  differentiators?: ValueCard[];
  process?: ProcessStep[];
  promises?: ValueCard[];
  about?: { eyebrow: string; heading: string; body: string[] };
  localArea?: { eyebrow: string; heading: string; intro: string; body: string[] };
  longform?: LongformSection[];
  /**
   * Niche-specific qualifying questions for the lead form. Omitted → the form
   * ships with the four core fields only, which is a fine starting point.
   */
  qualifiers?: Qualifier[];
  messagePrompt?: string;
  /** Skip GitHub repo creation + push (dry run). */
  noPush?: boolean;
  launchTarget?: number;
}

export interface ScaffoldResult {
  slug: string;
  targetDir: string;
  domainUrl: string;
  repoUrl: string | null;
}

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Parse the CLI --suburbs form "Name:postcode,Name:postcode" into Suburb[]. */
export function parseSuburbs(raw: string): Suburb[] {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, postcode = ""] = entry.split(":").map((s) => s.trim());
      return { name, postcode };
    });
}

export async function scaffoldSite(opts: ScaffoldOpts): Promise<ScaffoldResult> {
  const host = opts.domain.replace(/^https?:\/\//, "");
  const bareHost = host.replace(/^www\./, "");
  const siteSlug = slugify(bareHost.replace(/\.[a-z.]+$/, ""));
  const targetDir = path.join(SITES_DIR, siteSlug);
  const domainUrl = `https://${host.startsWith("www.") ? host : `www.${host}`}`;
  const primary = opts.primary ?? "#0f766e";
  const accent = opts.accent ?? "#f59e0b";
  const phone = opts.phone ?? "";

  const subServices: SubService[] =
    opts.subServices && opts.subServices.length
      ? opts.subServices
      : [
          {
            slug: "urgent-callouts",
            name: `Urgent ${opts.service} Call-Outs`,
            blurb: `Fast-response ${opts.phrase} for jobs that can't wait. Tell us what's happening and we'll get to you as soon as we can.`,
          },
          {
            slug: "quotes-and-inspections",
            name: "Quotes & Inspections",
            blurb: `Planning ahead? We'll inspect the job, explain what we find and quote the work in writing — free, with no obligation.`,
          },
        ];

  const faqs: FAQ[] =
    opts.faqs && opts.faqs.length
      ? opts.faqs
      : [
          {
            question: `How do I get a ${opts.phrase} quote in ${opts.city}?`,
            answer: `Tell us what you need through the form or give us a call. We look at the job, talk through the practical options and give you a clear written quote. Quoting is free and there is no obligation to go ahead.`,
          },
          {
            question: `Which areas around ${opts.city} do you cover?`,
            answer: `We work throughout ${opts.city} and the surrounding towns. If you are not sure whether your address falls inside the service area, send it through and we will tell you straight away.`,
          },
        ];

  const facts: Fact[] =
    opts.facts && opts.facts.length
      ? opts.facts
      : [
          { label: "Service area", value: `${opts.city}, ${opts.stateAbbr} and surrounding suburbs` },
          { label: "Cost of a quote", value: "Free — no obligation" },
        ];

  if (existsSync(targetDir)) {
    throw new Error(`Target already exists: ${targetDir}`);
  }

  // Suburb blurbs.
  //
  // These used to be generated here as `${name} is one of the ${city} suburbs
  // where ${brand} arranges free ${phrase} quotes from local professionals.` —
  // pure string interpolation, identical on every suburb of every site in the
  // network. Combined with a template that rendered nothing but the blurb, it
  // produced ~175-word area pages that were 59% identical to their siblings.
  // Google's response (measured 2026-08-19) was to leave 66 of 80 such pages
  // "Discovered - currently not indexed" and never crawl them.
  //
  // A caller-supplied blurb is used as-is. Where none is given we now emit a
  // short factual placeholder that is obviously unfinished, so thin pages are
  // visible as work-in-progress rather than looking deliberate. The nightly
  // cron's job is to replace these and fill `localContext`, `commonIssues`
  // and `faqs` with genuinely local substance.
  const suburbs = opts.suburbs.map((s) => ({
    slug: slugify(s.name),
    name: s.name,
    postcode: s.postcode,
    blurb:
      s.blurb?.trim() ||
      `${s.name} (${s.postcode}) is within the ${opts.city} service area. TODO: replace with locally specific detail — housing stock and construction era, soil or site conditions, and the issues that actually bring ${opts.phrase} work to this suburb.`,
  }));

  const run = (cmd: string, cwd = targetDir) => {
    console.log(`  $ ${cmd}`);
    execSync(cmd, { cwd, stdio: "inherit" });
  };

  console.log(`→ Copying template to ${targetDir}`);
  mkdirSync(SITES_DIR, { recursive: true });
  cpSync(TEMPLATE_DIR, targetDir, {
    recursive: true,
    filter: (src) =>
      !src.includes("node_modules") &&
      !src.includes(".next") &&
      !src.includes(".open-next") &&
      !src.includes(".wrangler"),
  });

  console.log("→ Writing site.config.ts");
  const config = `/**
 * Single source of truth for this site — generated by
 * ~/antigravity/leadgen/scripts/new-site.ts. Every page, schema block, and
 * llms.txt read from here.
 *
 * The shape lives in lib/site-types.ts and is re-exported below, so
 * \`@/site.config\` stays the import path for the rest of the app. This file
 * used to carry its own copy of every interface, which drifted from the
 * template's — \`theme.variant\` existed in the template for weeks while every
 * scaffolded site declared a theme with no variant field.
 *
 * VOICE RULE (do not remove) — operator brand, set 2026-09-01.
 *
 * This site presents as the local operator. Copy is first-person and
 * confident: "we assess", "our process", "the work we do". No "we're only a
 * matching service" disclaimers anywhere in the funnel.
 *
 * Positioning is not licence to invent facts. Never fabricate reviews,
 * ratings, testimonials, job counts, an ABN, a licence or registration
 * number, an insurance claim, or a founding year. \`credentials\` and
 * \`establishedYear\` exist for real values and ship empty — every consumer
 * of them falls back to timeless phrasing when they are absent.
 *
 * Write in the operator's voice about the WORK: what the job involves, what
 * moves the price, how long it takes, what the local ground and access
 * conditions are. That is both true and the part that ranks.
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

export const SITE: SiteConfig = ${JSON.stringify(
    {
      brandName: opts.brand,
      domain: domainUrl,
      service: { name: opts.service, phrase: opts.phrase },
      location: {
        city: opts.city,
        state: opts.state,
        stateAbbr: opts.stateAbbr,
        postcode: opts.postcode,
      },
      email: opts.email,
      phoneDisplay: phone,
      theme: { primary, accent, ...(opts.variant ? { variant: opts.variant } : {}) },
      subServices,
      faqs,
      facts,
      ...(opts.tagline ? { tagline: opts.tagline } : {}),
      ...(opts.establishedYear ? { establishedYear: opts.establishedYear } : {}),
      ...(opts.announcement ? { announcement: opts.announcement } : {}),
      ...(opts.images ? { images: opts.images } : {}),
      ...(opts.stats?.length ? { stats: opts.stats } : {}),
      ...(opts.differentiators?.length
        ? { differentiators: opts.differentiators }
        : {}),
      ...(opts.process?.length ? { process: opts.process } : {}),
      ...(opts.promises?.length ? { promises: opts.promises } : {}),
      ...(opts.about ? { about: opts.about } : {}),
      ...(opts.localArea ? { localArea: opts.localArea } : {}),
      ...(opts.longform?.length ? { longform: opts.longform } : {}),
      ...(opts.qualifiers?.length ? { qualifiers: opts.qualifiers } : {}),
      ...(opts.messagePrompt ? { messagePrompt: opts.messagePrompt } : {}),
    },
    null,
    2
  )};

export const CORE_PHRASE = \`\${SITE.service.name} \${SITE.location.city}\`;
`;
  writeFileSync(path.join(targetDir, "site.config.ts"), config);

  console.log("→ Writing data/locations.json");
  writeFileSync(
    path.join(targetDir, "data", "locations.json"),
    JSON.stringify(suburbs, null, 2) + "\n"
  );

  // The template ships Gold Coast example content in lib/posts.ts and
  // lib/faq-pages.ts. Reset both to empty for a fresh site — the nightly cron
  // fills them with niche-specific content.
  console.log("→ Resetting example content (posts, FAQ colony pages)");
  for (const [file, type] of [
    ["lib/posts.ts", "Post"],
    ["lib/faq-pages.ts", "FaqPage"],
  ] as const) {
    const p = path.join(targetDir, file);
    const src = readFileSync(p, "utf8");
    const marker = `export const ${type === "Post" ? "posts: Post" : "faqPages: FaqPage"}[] = [`;
    const start = src.indexOf(marker);
    const end = src.indexOf("];", start);
    writeFileSync(p, src.slice(0, start + marker.length) + "\n" + src.slice(end));
  }

  // Set the per-site Cloudflare Worker name in wrangler.jsonc (= site slug).
  console.log("→ Setting wrangler.jsonc worker name");
  const wranglerPath = path.join(targetDir, "wrangler.jsonc");
  if (existsSync(wranglerPath)) {
    const wrangler = readFileSync(wranglerPath, "utf8").replace(
      /"name":\s*"[^"]*"/,
      `"name": "${siteSlug}"`
    );
    writeFileSync(wranglerPath, wrangler);
  }

  console.log("→ Installing dependencies");
  run("bun install");

  console.log("→ Verifying build (must pass before repo creation)");
  run("bun run build");

  console.log("→ Initialising git repo");
  run("git init -b main");
  run('git config user.email "travissteel@users.noreply.github.com"');
  run('git config user.name "Travis Steel"');
  run("git add -A");
  run(`git commit -m "Scaffold ${opts.brand} from leadgen template"`);

  let repoUrl: string | null = null;
  if (opts.noPush) {
    console.log("⚠ noPush: skipping GitHub repo creation and push.");
  } else {
    const env = readFileSync(path.join(homedir(), ".hermes", ".env"), "utf8");
    const token = env.match(/^GITHUB_TOKEN=(.+)$/m)?.[1]?.trim();
    if (!token) {
      throw new Error("GITHUB_TOKEN not found in ~/.hermes/.env — cannot create repo.");
    }
    console.log(`→ Creating private GitHub repo ${GITHUB_USER}/${siteSlug}`);
    const res = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
      },
      body: JSON.stringify({ name: siteSlug, private: true }),
    });
    if (!res.ok) {
      throw new Error(`GitHub repo creation failed: ${res.status} ${await res.text()}`);
    }
    repoUrl = `https://github.com/${GITHUB_USER}/${siteSlug}`;
    run(`git remote add origin ${repoUrl}.git`);
    // Push with the token supplied via ENV (GIT_USER/GIT_PAT), not interpolated
    // into the command string — so the token never appears in logs or in the
    // error message if the push fails. The single-quoted helper is expanded by
    // git's own shell at credential time, reading the env we pass below.
    const pushCmd =
      "git -c credential.helper='!f(){ echo username=$GIT_USER; echo password=$GIT_PAT; };f' push -u origin main";
    console.log(`  $ ${pushCmd}`);
    try {
      execSync(pushCmd, {
        cwd: targetDir,
        stdio: "inherit",
        env: { ...process.env, GIT_USER: GITHUB_USER, GIT_PAT: token, GIT_TERMINAL_PROMPT: "0" },
      });
    } catch {
      throw new Error(
        `git push failed for ${siteSlug} (repo created but push rejected). ` +
          "Most often HTTP 403 = GITHUB_TOKEN lacks 'Contents: write' or repository access to the new repo."
      );
    }
  }

  console.log("→ Registering site in sites.json");
  const registry = existsSync(REGISTRY)
    ? JSON.parse(readFileSync(REGISTRY, "utf8"))
    : { sites: [] };
  registry.sites.push({
    slug: siteSlug,
    domain: domainUrl,
    repo: repoUrl,
    localPath: targetDir,
    service: opts.service,
    location: `${opts.city}, ${opts.stateAbbr}`,
    status: "scaffolded",
    launchTarget: opts.launchTarget ?? DEFAULT_LAUNCH_TARGET,
    launchedAt: null,
    lastWorkedAt: null,
    notes: "",
  });
  writeFileSync(REGISTRY, JSON.stringify(registry, null, 2) + "\n");

  return { slug: siteSlug, targetDir, domainUrl, repoUrl };
}
