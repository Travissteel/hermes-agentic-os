/**
 * Central SEO helpers — adapted from the proven BSF lib/seo.ts pattern.
 * Canonicals ALWAYS use SITE.domain (the www host). Never emit apex URLs
 * in canonicals, sitemaps, or schema (Ahrefs "canonical points to redirect"
 * lesson from BSF).
 */
import type { Metadata } from "next";
import { SITE, CORE_PHRASE } from "@/site.config";

export const SEO_LIMITS = {
  titleMax: 60,
  descriptionMax: 160,
} as const;

export function absoluteUrl(path: string): string {
  return new URL(path, SITE.domain).toString();
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Build page metadata with canonical, OG, and Twitter cards wired.
 * `path` is the route path starting with "/" ("" for home).
 */
export function pageMetadata(input: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const title = truncate(input.title, SEO_LIMITS.titleMax);
  const description = truncate(input.description, SEO_LIMITS.descriptionMax);
  const url = absoluteUrl(input.path || "/");
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "en_AU",
      url,
      siteName: SITE.brandName,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/** Root layout metadata (template pattern like BSF's layout). */
export function rootMetadata(): Metadata {
  const title = `${CORE_PHRASE} | Fast Free Quotes`;
  const description = `Get free quotes from local ${SITE.service.phrase} professionals in ${SITE.location.city}, ${SITE.location.stateAbbr}. Fast responses, no obligation.`;
  return {
    metadataBase: new URL(SITE.domain),
    title: {
      default: title,
      template: `%s | ${SITE.brandName}`,
    },
    description,
    keywords: [
      CORE_PHRASE.toLowerCase(),
      `${SITE.service.phrase} ${SITE.location.city}`.toLowerCase(),
      `${SITE.service.phrase} quotes`,
      `${SITE.location.city} ${SITE.location.stateAbbr}`,
    ],
    authors: [{ name: SITE.brandName }],
    publisher: SITE.brandName,
    openGraph: {
      type: "website",
      locale: "en_AU",
      url: SITE.domain,
      siteName: SITE.brandName,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}
