import locationsData from "@/data/locations.json";
import type { FAQ } from "@/site.config";

export interface ServiceArea {
  slug: string;
  name: string;
  postcode: string;
  blurb: string;

  /**
   * Everything below is the SUBSTANCE of the page. Optional so existing sites
   * keep building, but a page without them is not worth publishing.
   *
   * Why this exists: measured 2026-08-19, area pages across the network were
   * ~175 words and 59% identical to their siblings — the template rendered
   * only `blurb` plus a hardcoded answer block, so every page was the same
   * text with a suburb name swapped. Google's response was to mark 66 of 80
   * pages "Discovered - currently not indexed" and never crawl them. Page
   * depth was capped by the template, not by whoever wrote the content.
   *
   * Fill these with things that are TRUE and could ONLY be written about this
   * suburb. Generic filler here defeats the entire point.
   */

  /** Housing stock, construction era, soil/site conditions — why this trade matters here. 80-150 words. */
  localContext?: string;

  /** Signs a local homeowner actually notices, specific to this area's housing. */
  commonIssues?: string[];

  /** Streets, estates or precincts that anchor the page to a real place. */
  landmarks?: string[];

  /** 2-4 questions specific to this suburb (access, permits, typical job size). */
  faqs?: FAQ[];
}

const locations = locationsData as ServiceArea[];

export function getAllAreas(): ServiceArea[] {
  return locations;
}

export function getAreaBySlug(slug: string): ServiceArea | undefined {
  return locations.find((a) => a.slug === slug);
}
