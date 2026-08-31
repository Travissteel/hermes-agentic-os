import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";

/**
 * robots.txt as a route handler rather than Next's `MetadataRoute.Robots`.
 *
 * The metadata API only emits the directives it knows about (allow, disallow,
 * crawl-delay), and there is no escape hatch for custom lines — so declaring a
 * Content-Signal requires generating the file ourselves. Same plain-text route
 * pattern as app/llms.txt.
 *
 * Content signals (content-signals.org) are the machine-readable statement of
 * what AI systems may do with this content. These sites are lead gen: being
 * ingested, cited, and surfaced by answer engines IS the distribution channel,
 * so every signal is an explicit yes. That is the opposite of the default
 * Cloudflare applies to a new free zone — its managed robots.txt injects
 * `ai-train=no` plus a `User-agent: ClaudeBot / Disallow: /` block, and a
 * UA-specific group overrides the wildcard below, so this file cannot undo it.
 * Managed robots.txt must be turned off per zone in the Cloudflare dashboard
 * (see leadgen/LAUNCH-CHECKLIST.md, Phase 2) or none of this is served.
 */
export function GET() {
  const body = [
    "# Content signals — https://contentsignals.org/",
    "# This site is a lead gen referral service. Being read, cited, and",
    "# surfaced by AI answer engines is the point, so all three are yes.",
    "User-agent: *",
    "Content-Signal: search=yes,ai-input=yes,ai-train=yes",
    "Allow: /",
    "Disallow: /api/",
    "",
    `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    "",
    "# Plain-text site summary for AI/answer engines:",
    `# ${absoluteUrl("/llms.txt")}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
