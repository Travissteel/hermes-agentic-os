import { absoluteUrl } from "@/lib/seo";

/** BreadcrumbList JSON-LD. Pass items in order from home to current page. */
export function BreadcrumbSchema({
  items,
}: {
  items: { name: string; path: string }[];
}) {
  if (!items.length) return null;
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
