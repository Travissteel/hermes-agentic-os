import { SITE } from "@/site.config";
import { getAllAreas } from "@/lib/locations";

/**
 * Sitewide LocalBusiness JSON-LD. Rendered once in the root layout.
 *
 * Every field is omitted when absent rather than emitted empty — never point
 * schema at assets or claims that don't exist (BSF lesson). That applies
 * doubly to `foundingDate`: it ships only when `establishedYear` is set, so a
 * site with no real business behind it makes no dated claim to Google.
 *
 * `hasOfferCatalog` is what ties the sub-service pages to the business entity.
 * It is the cheapest structured-data win available to these sites and the one
 * most often missed.
 */
export function LocalBusinessSchema() {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE.domain}/#business`,
    name: SITE.brandName,
    url: SITE.domain,
    email: SITE.email,
    description: `${SITE.service.name} in ${SITE.location.city}, ${SITE.location.state}. ${SITE.brandName} assesses the job, explains the options and provides a clear quote.`,
    address: {
      "@type": "PostalAddress",
      addressLocality: SITE.location.city,
      addressRegion: SITE.location.stateAbbr,
      postalCode: SITE.location.postcode,
      addressCountry: "AU",
    },
    areaServed: [
      { "@type": "City", name: SITE.location.city },
      ...getAllAreas().map((a) => ({ "@type": "Place", name: a.name })),
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${SITE.service.name} Services`,
      itemListElement: SITE.subServices.map((s) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: s.name,
          url: `${SITE.domain}/services/${s.slug}`,
        },
      })),
    },
  };
  if (SITE.phoneDisplay) schema.telephone = SITE.phoneDisplay;
  if (SITE.establishedYear) schema.foundingDate = String(SITE.establishedYear);
  if (SITE.images?.hero) {
    schema.image = `${SITE.domain}/images/${SITE.images.hero.src}`;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
