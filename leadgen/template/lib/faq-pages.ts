/**
 * Colony Strategy pages (SOP step 5): each entry is a dedicated page under
 * /faq/<slug> answering ONE non-competitive "People Also Ask" style question
 * in ~120 words, then funnelling authority via internal links to the
 * high-intent money pages (home, /services/*, /areas/*).
 *
 * Cron rules: target keyword must appear in `question` (the H1), the slug,
 * and the title; answers must be genuinely useful and locally specific;
 * every page links to at least one money page; append to the END of the
 * array; never link to other sites in the network.
 */

export interface FaqPage {
  slug: string;
  /** The PAA-style question — becomes H1 and title. */
  question: string;
  /** ~120-word direct answer. First sentence must stand alone (GEO). */
  answer: string;
  /** ISO date. */
  publishedAt: string;
  /** Internal money-page links to funnel authority to. */
  linksTo: { label: string; path: string }[];
}

export const faqPages: FaqPage[] = [
  {
    slug: "can-a-burst-pipe-flood-a-house",
    question: "Can a burst pipe flood a house?",
    publishedAt: "2026-07-18",
    answer:
      "Yes — a burst mains pipe can release more than 100 litres of water per minute, which is enough to flood a single-storey home in under an hour. The speed of the damage depends on where the pipe fails: a burst under the slab may show up slowly as warm patches or unexplained water bills, while a failed flexi-hose under a sink can dump water into cabinetry and flooring within minutes. If you suspect a burst pipe, turn the water off at the meter isolation valve immediately, then get a licensed plumber out urgently. Insurance usually covers sudden water damage but not gradual leaks, so acting fast matters for your claim as well as your floors.",
    linksTo: [
      { label: "Burst pipe repair quotes", path: "/services/burst-pipes" },
      { label: "Emergency plumber Gold Coast", path: "/" },
    ],
  },
];

export function getAllFaqPages(): FaqPage[] {
  return [...faqPages].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getFaqPageBySlug(slug: string): FaqPage | undefined {
  return faqPages.find((f) => f.slug === slug);
}
