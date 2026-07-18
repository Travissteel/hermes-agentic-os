/**
 * Blog posts as typed data (the BSF lib/articles.ts pattern — proven easy
 * for the nightly cron to append to without MDX tooling).
 *
 * Cron rule: append new posts to the END of the array, never edit published
 * slugs, keep dates real.
 */
import type { FAQ } from "@/site.config";

export interface PostSection {
  heading: string;
  paragraphs: string[];
}

export interface Post {
  slug: string;
  title: string;
  description: string;
  /** ISO date, e.g. "2026-07-18" */
  publishedAt: string;
  sections: PostSection[];
  faqs?: FAQ[];
}

export const posts: Post[] = [
  {
    slug: "what-counts-as-a-plumbing-emergency",
    title: "What Counts as a Plumbing Emergency? A Gold Coast Guide",
    description:
      "Not every leak needs a 2am call-out. Here's how Gold Coast residents can tell a genuine plumbing emergency from a job that can wait until morning.",
    publishedAt: "2026-07-18",
    sections: [
      {
        heading: "Call now: situations that can't wait",
        paragraphs: [
          "A burst pipe, sewage backing up into the house, a gas smell near an appliance, or water contacting electrical fittings are genuine emergencies. Shutting off the water main and calling an emergency plumber immediately limits damage that can otherwise run into the thousands.",
        ],
      },
      {
        heading: "Probably fine until morning",
        paragraphs: [
          "A dripping tap, a slow drain, or a running toilet cistern are urgent to you but rarely damage property overnight. Booking a standard call-out instead of an after-hours emergency visit typically saves 30–50% on labour rates.",
        ],
      },
    ],
    faqs: [
      {
        question: "Should I turn off the water before the plumber arrives?",
        answer:
          "Yes. For any leak or burst pipe, turn off the water at the main isolation valve (usually near your water meter) before the plumber arrives. It limits damage and costs nothing to do.",
      },
    ],
  },
];

export function getAllPosts(): Post[] {
  return [...posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
