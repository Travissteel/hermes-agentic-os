import { SITE } from "@/site.config";

/** Service JSON-LD for a sub-service or area page. */
export function ServiceSchema({
  serviceName,
  description,
  areaName,
}: {
  serviceName: string;
  description: string;
  areaName?: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: serviceName,
    description,
    provider: {
      "@type": "LocalBusiness",
      name: SITE.brandName,
      url: SITE.domain,
    },
    areaServed: {
      "@type": "Place",
      name: areaName ?? `${SITE.location.city}, ${SITE.location.stateAbbr}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
