import { SITE, CORE_PHRASE } from "@/site.config";
import { getAllAreas } from "@/lib/locations";
import { getAllFaqPages } from "@/lib/faq-pages";
import { getAllPosts } from "@/lib/posts";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";

/**
 * llms.txt — a plain-text site summary for AI/answer engines (GEO).
 * Generated from site.config.ts so it never drifts from the site content.
 */
export function GET() {
  const areas = getAllAreas();
  const lines = [
    `# ${SITE.brandName}`,
    "",
    `> Free quote-matching service for ${SITE.service.phrase} in ${SITE.location.city}, ${SITE.location.state}, Australia. Residents describe their job and licensed local professionals respond with quotes. ${SITE.brandName} is a referral service and does not perform the work itself.`,
    "",
    "## Key facts",
    ...SITE.facts.map((f) => `- ${f.label}: ${f.value}`),
    `- Contact: ${SITE.email}`,
    "",
    "## Services",
    ...SITE.subServices.map(
      (s) => `- [${s.name}](${absoluteUrl(`/services/${s.slug}`)}): ${s.blurb}`
    ),
    "",
    "## Service areas",
    ...areas.map(
      (a) =>
        `- [${SITE.service.name} ${a.name}](${absoluteUrl(`/areas/${a.slug}`)}): ${a.name}, ${SITE.location.stateAbbr} ${a.postcode}`
    ),
    "",
    "## Guides",
    ...getAllPosts().map(
      (p) => `- [${p.title}](${absoluteUrl(`/blog/${p.slug}`)}): ${p.description}`
    ),
    "",
    "## FAQ",
    ...SITE.faqs.flatMap((f) => [`### ${f.question}`, f.answer, ""]),
    "## Answered questions",
    ...getAllFaqPages().map(
      (f) => `- [${f.question}](${absoluteUrl(`/faq/${f.slug}`)})`
    ),
    "",
    `Site: ${SITE.domain} — ${CORE_PHRASE} quotes.`,
  ];

  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
