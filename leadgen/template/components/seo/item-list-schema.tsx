import { absoluteUrl } from "@/lib/seo";

export interface ItemListEntry {
  name: string;
  /** Route path starting with "/" — converted to an absolute www URL. */
  path: string;
}

/**
 * ItemList JSON-LD for the index pages (/services, /areas, /faq, /blog).
 *
 * These pages are pure link hubs, so without this an answer engine has to infer
 * the set from markup. Naming the members explicitly makes the site's coverage
 * legible: which suburbs, which sub-services, which questions are answered.
 *
 * Null-safe like the other schema components, so a site with an empty list
 * (no posts yet on a fresh scaffold) simply emits nothing.
 */
export function ItemListSchema({
  name,
  items,
}: {
  name: string;
  items: ItemListEntry[];
}) {
  if (!items.length) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
