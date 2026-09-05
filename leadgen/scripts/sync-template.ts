#!/usr/bin/env bun
/**
 * Sync shared template files into already-scaffolded sites.
 *
 * `new-site.ts` copies the template once, at scaffold time, and nothing has
 * ever pushed template changes back out. That is why the network drifted: as
 * of 2026-09-05 the three oldest sites were 25 files behind the template and
 * missing 4 files entirely, while the two newest were 13 behind.
 *
 * The split below is the whole point of this script. Template files are
 * *shared logic* — layout, routes, components, SEO helpers. Everything a site
 * actually owns (its config, its suburbs, its written FAQ and blog content,
 * its images, its Worker name) is PROTECTED and never written. Overwriting one
 * of those would silently destroy the content the leadgen crons spent weeks
 * producing, so the list is deny-by-default: a file is only copied if it is
 * not protected.
 *
 * Dry run by default. Nothing is written without --apply.
 *
 *   bun run leadgen/scripts/sync-template.ts                    # dry run, all sites
 *   bun run leadgen/scripts/sync-template.ts --site electricianballarat
 *   bun run leadgen/scripts/sync-template.ts --apply
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { REGISTRY, TEMPLATE_DIR } from "./lib/scaffold";

/**
 * Site-owned. Never written, never diffed as "behind".
 *
 * `lib/faq-pages.ts` and `lib/posts.ts` look like code but are content: each
 * holds that site's written FAQ and guide bodies, appended to by the leadgen
 * crons. The template ships example entries, so copying them over a live site
 * would replace real content with sample plumbing FAQs.
 *
 * `package.json` / `bun.lock` are excluded because changing deps demands a
 * `bun install` the sync can't safely run mid-flight; drift there is reported
 * instead so it can be handled deliberately.
 */
const PROTECTED = [
  "site.config.ts",
  "wrangler.jsonc",
  "package.json",
  "bun.lock",
  "lib/faq-pages.ts",
  "lib/posts.ts",
];
const PROTECTED_DIRS = ["data", "public", "node_modules", ".git", ".open-next", ".next"];

/**
 * Build artifacts that live in the template working tree but are generated,
 * per-site and untracked. Copying them propagates one site's incremental build
 * state into every other site.
 */
const IGNORED = ["tsconfig.tsbuildinfo", "next-env.d.ts"];

/**
 * Files a previous template generation shipped that the current one replaces
 * under a different path. Left in place they are not merely stale — Next
 * resolves `app/robots.ts` and `app/robots.txt/route.ts` to the same route and
 * the build fails on the conflict.
 */
const OBSOLETE = ["app/robots.ts"];

interface Site {
  slug: string;
  localPath: string;
  status: string;
}

function templateFiles(dir = TEMPLATE_DIR, base = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? path.join(base, entry.name) : entry.name;
    if (entry.isDirectory()) {
      if (PROTECTED_DIRS.includes(rel)) continue;
      out.push(...templateFiles(path.join(dir, entry.name), rel));
    } else if (!PROTECTED.includes(rel) && !IGNORED.includes(entry.name)) {
      out.push(rel);
    }
  }
  return out;
}

function same(a: string, b: string): boolean {
  if (!existsSync(b)) return false;
  return readFileSync(a).equals(readFileSync(b));
}

/**
 * lib/posts.ts and lib/faq-pages.ts are protected because they hold content,
 * but they also declare the `Post` / `FaqPage` interfaces that synced template
 * code compiles against. Protecting the file therefore freezes the type, and a
 * template that starts reading a new field breaks the build on every older
 * site — which is exactly what `Post.updatedAt` did on 2026-09-05.
 *
 * We can't safely rewrite these files, so surface the mismatch instead: report
 * any interface field the template declares that the site's copy is missing.
 */
function protectedTypeDrift(siteDir: string): string[] {
  const out: string[] = [];
  const fields = (src: string, iface: string): string[] => {
    const m = src.match(new RegExp(`export interface ${iface} \\{([\\s\\S]*?)\\n\\}`));
    if (!m) return [];
    return [...m[1].matchAll(/^\s*(\w+)\??:/gm)].map((x) => x[1]);
  };

  for (const [file, iface] of [["lib/posts.ts", "Post"], ["lib/faq-pages.ts", "FaqPage"]]) {
    const sitePath = path.join(siteDir, file);
    if (!existsSync(sitePath)) continue;
    const tplFields = fields(readFileSync(path.join(TEMPLATE_DIR, file), "utf8"), iface);
    const siteFields = fields(readFileSync(sitePath, "utf8"), iface);
    const missing = tplFields.filter((f) => !siteFields.includes(f));
    if (missing.length) {
      out.push(
        `${file}: interface ${iface} is missing ${missing.map((f) => `"${f}"`).join(", ")} ` +
          `— protected file, add the field by hand or the build will fail`
      );
    }
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const only = args.includes("--site") ? args[args.indexOf("--site") + 1] : null;

  const sites: Site[] = JSON.parse(readFileSync(REGISTRY, "utf8")).sites;
  const targets = sites.filter((s) => (only ? s.slug === only : true));
  if (!targets.length) {
    console.error(only ? `no site "${only}" in the registry` : "no sites in the registry");
    process.exit(1);
  }

  const files = templateFiles();
  console.log(
    `${apply ? "SYNCING" : "DRY RUN"} — ${files.length} shared template files, ` +
      `${PROTECTED.length} protected paths\n`
  );

  for (const site of targets) {
    if (!existsSync(site.localPath)) {
      console.log(`=== ${site.slug}: no local clone, skipped\n`);
      continue;
    }

    const changed: string[] = [];
    const added: string[] = [];
    for (const rel of files) {
      const src = path.join(TEMPLATE_DIR, rel);
      const dest = path.join(site.localPath, rel);
      if (same(src, dest)) continue;
      (existsSync(dest) ? changed : added).push(rel);
      if (apply) {
        mkdirSync(path.dirname(dest), { recursive: true });
        copyFileSync(src, dest);
      }
    }

    const removed: string[] = [];
    for (const rel of OBSOLETE) {
      const dest = path.join(site.localPath, rel);
      if (!existsSync(dest)) continue;
      removed.push(rel);
      if (apply) rmSync(dest, { recursive: true });
    }

    // Reported, never written — see PROTECTED.
    const depDrift = ["package.json"].filter(
      (f) => existsSync(path.join(site.localPath, f)) &&
        !same(path.join(TEMPLATE_DIR, f), path.join(site.localPath, f))
    );
    const typeDrift = protectedTypeDrift(site.localPath);

    console.log(`=== ${site.slug} (${site.status})`);
    console.log(`    ${added.length} added, ${changed.length} updated, ${removed.length} removed`);
    for (const f of added) console.log(`      + ${f}`);
    for (const f of changed) console.log(`      ~ ${f}`);
    for (const f of removed) console.log(`      - ${f} (obsolete)`);
    if (depDrift.length) console.log(`      ! package.json differs from template — review by hand`);
    for (const d of typeDrift) console.log(`      ! ${d}`);
    console.log();
  }

  if (!apply) console.log("Nothing written. Re-run with --apply.");
}

main();
