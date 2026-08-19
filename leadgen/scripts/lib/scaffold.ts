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
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface Fact {
  label: string;
  value: string;
}

export interface ScaffoldOpts {
  service: string;
  phrase: string;
  city: string;
  state: string;
  stateAbbr: string;
  postcode: string;
  brand: string;
  /** www host or bare domain, with or without protocol — normalised internally. */
  domain: string;
  email: string;
  suburbs: Suburb[];
  phone?: string;
  primary?: string;
  accent?: string;
  /**
   * Optional AI-drafted config (from the batch candidates file). When present
   * and non-empty these replace the generic defaults the single-site CLI uses.
   */
  subServices?: SubService[];
  faqs?: FAQ[];
  facts?: Fact[];
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
            blurb: `Fast-response ${opts.phrase} for jobs that can't wait. We connect you with local pros available now.`,
          },
          {
            slug: "quotes-and-inspections",
            name: "Quotes & Inspections",
            blurb: `Planning ahead? Get local ${opts.phrase} professionals to inspect and quote your job for free.`,
          },
        ];

  const faqs: FAQ[] =
    opts.faqs && opts.faqs.length
      ? opts.faqs
      : [
          {
            question: `How do I get ${opts.phrase} quotes in ${opts.city}?`,
            answer: `Describe your job through ${opts.brand} and licensed local professionals who service ${opts.city} will contact you directly with quotes. The service is free with no obligation.`,
          },
          {
            question: `Does ${opts.brand} do the work itself?`,
            answer: `No. ${opts.brand} is a free quote-matching service — we pass your job details to licensed local professionals who quote and carry out the work.`,
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
 * VOICE RULE (do not remove): this brand is a quote-matching / referral
 * service. Copy must never claim to be a licensed tradesperson, and no
 * reviews, ABNs, or licence numbers may be invented.
 */

export interface SubService {
  slug: string;
  name: string;
  blurb: string;
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
  domain: string;
  service: { name: string; phrase: string };
  location: { city: string; state: string; stateAbbr: string; postcode: string };
  email: string;
  phoneDisplay: string;
  theme: { primary: string; accent: string };
  subServices: SubService[];
  faqs: FAQ[];
  facts: Fact[];
}

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
      theme: { primary, accent },
      subServices,
      faqs,
      facts,
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
