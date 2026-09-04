import type { MetadataRoute } from "next";
import { SITE } from "@/site.config";
import { getAllAreas } from "@/lib/locations";
import { getAllFaqPages } from "@/lib/faq-pages";
import { getAllPosts } from "@/lib/posts";
import { absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const faqPages = getAllFaqPages();
  const posts = getAllPosts();

  /**
   * A hub with no children is an empty page. Submitting one asks Google to
   * spend crawl budget on a listing of nothing, while the money pages it
   * should be fetching sit at "Discovered - currently not indexed" — measured
   * at 1/21 pages earning on both live sites, 2026-08-31. The hub reappears
   * automatically on the first post or FAQ page.
   */
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/services"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/areas"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...(posts.length
      ? [{ url: absoluteUrl("/blog"), lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 }]
      : []),
    ...(faqPages.length
      ? [{ url: absoluteUrl("/faq"), lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 }]
      : []),
    /* Same rule as the hubs above: /gallery 404s without images, so it only
       enters the sitemap once there is something on it. */
    ...(SITE.images?.gallery?.length
      ? [{ url: absoluteUrl("/gallery"), lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 }]
      : []),
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/contact"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const servicePages: MetadataRoute.Sitemap = SITE.subServices.map((s) => ({
    url: absoluteUrl(`/services/${s.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const areaPages: MetadataRoute.Sitemap = getAllAreas().map((a) => ({
    url: absoluteUrl(`/areas/${a.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const faqColonyPages: MetadataRoute.Sitemap = faqPages.map((f) => ({
    url: absoluteUrl(`/faq/${f.slug}`),
    lastModified: new Date(f.publishedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const blogPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: absoluteUrl(`/blog/${p.slug}`),
    lastModified: new Date(p.publishedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...servicePages, ...areaPages, ...faqColonyPages, ...blogPages];
}
