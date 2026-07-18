import { SITE } from "@/site.config";
import { getAllAreas } from "@/lib/locations";

/**
 * Sitewide LocalBusiness JSON-LD for the referral brand. Rendered once in
 * the root layout. Phone/logo fields are omitted when absent (never point
 * schema at assets that don't exist — BSF lesson).
 */
export function LocalBusinessSchema() {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: SITE.brandName,
    url: SITE.domain,
    email: SITE.email,
    description: `Free quote-matching service connecting ${SITE.location.city} residents with local ${SITE.service.phrase} professionals.`,
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
  };
  if (SITE.phoneDisplay) schema.telephone = SITE.phoneDisplay;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
