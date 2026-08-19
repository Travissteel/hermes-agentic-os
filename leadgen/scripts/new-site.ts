#!/usr/bin/env bun
/**
 * Scaffold ONE micro-niche lead gen site from the template. Thin CLI wrapper
 * around scaffoldSite() in ./lib/scaffold.ts (shared with batch-new-sites.ts).
 *
 * Usage:
 *   bun new-site.ts \
 *     --service "Emergency Plumber" --phrase "emergency plumbing" \
 *     --city "Gold Coast" --state "Queensland" --state-abbr QLD --postcode 4217 \
 *     --brand "Gold Coast Emergency Plumber Quotes" \
 *     --domain www.emergencyplumbergoldcoast.com \
 *     --email quotes@emergencyplumbergoldcoast.com \
 *     --suburbs "Southport:4215,Surfers Paradise:4217,Burleigh Heads:4220" \
 *     [--phone "07 5555 5555"] [--primary "#0f766e"] [--accent "#f59e0b"] [--no-push]
 *
 * For a whole batch of sites, use batch-new-sites.ts instead.
 */
import { parseSuburbs, scaffoldSite } from "./lib/scaffold";

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  if (fallback !== undefined) return fallback;
  console.error(`Missing required flag: --${name}`);
  process.exit(1);
}

const result = await scaffoldSite({
  service: arg("service"),
  phrase: arg("phrase"),
  city: arg("city"),
  state: arg("state"),
  stateAbbr: arg("state-abbr"),
  postcode: arg("postcode"),
  brand: arg("brand"),
  domain: arg("domain"),
  email: arg("email"),
  suburbs: parseSuburbs(arg("suburbs")),
  phone: arg("phone", ""),
  primary: arg("primary", "#0f766e"),
  accent: arg("accent", "#f59e0b"),
  noPush: process.argv.includes("--no-push"),
});

console.log(`
✓ ${result.slug} scaffolded at ${result.targetDir}

Next steps (see ~/antigravity/leadgen/LAUNCH-CHECKLIST.md):
  1. Buy the domain (${result.domainUrl.replace("https://www.", "")}) — aim for the exact-match .com under $30
  2. Deploy to Cloudflare: bun ~/antigravity/leadgen/scripts/batch-new-sites.ts --deploy --only ${result.slug}
     (or manually: cd ${result.targetDir} && bun run deploy)
  3. Attach the domain in Cloudflare (www canonical; apex→www Redirect Rule) + set Worker secrets
  4. Set status to "live" in leadgen/sites.json + set launchedAt
  5. Submit the sitemap in Google Search Console
`);
