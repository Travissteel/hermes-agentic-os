#!/usr/bin/env bun
/**
 * Batch-scaffold a set of lead gen sites from leadgen/batch/candidates.json.
 *
 * Reads every candidate with status "approved" that isn't already scaffolded,
 * runs the shared scaffoldSite() for each (continue-on-error), and prints a
 * summary. Domains are bought BETWEEN scaffold and deploy, so --deploy is a
 * separate opt-in pass.
 *
 * Usage:
 *   bun batch-new-sites.ts                 # scaffold all approved candidates
 *   bun batch-new-sites.ts --dry-run       # scaffold locally, no repo/push
 *   bun batch-new-sites.ts --only <slug>   # one candidate by domain slug
 *   bun batch-new-sites.ts --deploy        # deploy scaffolded candidates to Cloudflare
 *   bun batch-new-sites.ts --deploy --only <slug>
 *
 * A candidate's domain slug = its bare domain minus the TLD (same rule the
 * scaffolder uses), e.g. www.towinggeelong.com → "towinggeelong".
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { scaffoldSite, slugify, type ScaffoldOpts } from "./lib/scaffold";
import { deploySite } from "./lib/deploy";

const CANDIDATES = path.join(homedir(), "antigravity", "leadgen", "batch", "candidates.json");

interface Candidate extends Omit<ScaffoldOpts, "noPush" | "primary" | "accent"> {
  status: "seed" | "draft" | "approved" | "scaffolded";
  greenLight?: { verdict?: string; notes?: string };
  population?: number;
  targetKeywords?: string[];
  /** Candidates carry theme as a nested object (mirrors site.config); mapped
   * to scaffoldSite's flat primary/accent below. */
  theme?: { primary?: string; accent?: string };
}

const dryRun = process.argv.includes("--dry-run");
const deploy = process.argv.includes("--deploy");
const onlyIdx = process.argv.indexOf("--only");
const only = onlyIdx !== -1 ? process.argv[onlyIdx + 1] : null;

function domainSlug(domain: string): string {
  const bare = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  return slugify(bare.replace(/\.[a-z.]+$/, ""));
}

if (!existsSync(CANDIDATES)) {
  console.error(`No candidates file at ${CANDIDATES}. See leadgen/batch/README.md.`);
  process.exit(1);
}

const data = JSON.parse(readFileSync(CANDIDATES, "utf8")) as { candidates: Candidate[] };
const candidates = data.candidates ?? [];

const results: { slug: string; outcome: string; detail?: string }[] = [];

for (const c of candidates) {
  const slug = domainSlug(c.domain ?? "");
  if (only && slug !== only) continue;

  if (deploy) {
    // Deploy pass: only touch candidates already scaffolded.
    if (c.status !== "scaffolded") {
      results.push({ slug: slug || "(no domain)", outcome: "skipped", detail: `status=${c.status}, not scaffolded` });
      continue;
    }
    const res = await deploySite(slug);
    results.push({
      slug,
      outcome: res.ok ? "deployed" : res.skipped ? "skipped" : "failed",
      detail: res.reason,
    });
    continue;
  }

  // Scaffold pass: only approved candidates that aren't scaffolded yet.
  if (c.status !== "approved") {
    if (!only) continue; // silently skip non-approved unless explicitly targeted
    results.push({ slug: slug || "(no domain)", outcome: "skipped", detail: `status=${c.status}, not approved` });
    continue;
  }

  console.log(`\n━━━ Scaffolding ${slug} (${c.service} — ${c.city}) ━━━`);
  try {
    await scaffoldSite({
      ...c,
      primary: c.theme?.primary,
      accent: c.theme?.accent,
      noPush: dryRun,
    });
    if (!dryRun) {
      // A dry-run is a preview — leave the candidate "approved" for the real run.
      c.status = "scaffolded";
      // Persist status flip immediately so a mid-batch failure doesn't redo work.
      writeFileSync(CANDIDATES, JSON.stringify(data, null, 2) + "\n");
    }
    results.push({ slug, outcome: dryRun ? "scaffolded (dry-run)" : "scaffolded" });
  } catch (err) {
    results.push({ slug, outcome: "failed", detail: err instanceof Error ? err.message : String(err) });
  }
}

console.log("\n════════ Batch summary ════════");
if (!results.length) {
  console.log(
    deploy
      ? "No scaffolded candidates to deploy."
      : "No approved candidates to scaffold. Set a candidate's status to \"approved\" in candidates.json."
  );
} else {
  for (const r of results) {
    const tag = r.outcome.startsWith("scaffolded") || r.outcome === "deployed" ? "✓" : r.outcome === "failed" ? "✗" : "•";
    console.log(`  ${tag} ${r.slug.padEnd(28)} ${r.outcome}${r.detail ? ` — ${r.detail}` : ""}`);
  }
}
const failed = results.filter((r) => r.outcome === "failed").length;
process.exit(failed ? 1 : 0);
