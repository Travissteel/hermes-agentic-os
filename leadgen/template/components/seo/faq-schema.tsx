import type { FAQ } from "@/site.config";

/** FAQPage JSON-LD. Returns null when there are no FAQs (null-safe, BSF pattern). */
export function FAQSchema({ faqs }: { faqs: FAQ[] }) {
  if (!faqs.length) return null;
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
