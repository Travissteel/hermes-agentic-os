import { notFound } from "next/navigation";
import Link from "next/link";
import { SITE } from "@/site.config";
import { pageMetadata } from "@/lib/seo";
import { BreadcrumbSchema } from "@/components/seo";
import { GalleryGrid } from "@/components/sections";
import { CallButton } from "@/components/call-button";

/**
 * Work gallery. 404s when the config has no gallery, because an empty gallery
 * page is worse than no gallery page — it is a thin page in the sitemap, and
 * thin pages are precisely what left the network's URLs uncrawled. The navbar
 * and sitemap both gate on the same condition, so nothing links here when the
 * array is absent.
 */
export const metadata = pageMetadata({
  title: `Project Gallery | ${SITE.brandName}`,
  description: `Photos of recent ${SITE.service.phrase} work around ${SITE.location.city}, ${SITE.location.stateAbbr}.`,
  path: "/gallery",
});

export default function GalleryPage() {
  const items = SITE.images?.gallery;
  if (!items?.length) notFound();

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "Gallery", path: "/gallery" },
        ]}
      />
      <section className="band">
        <div className="container">
          <p className="eyebrow">Recent projects</p>
          <h1 className="h1 mt-4">Our work around {SITE.location.city}</h1>
          {/* Not CORE_PHRASE — "restumping Ballarat" is a keyphrase, and
              dropping it into a sentence reads as one. */}
          <p className="lede mt-4 max-w-2xl">
            A look at the preparation and workmanship behind our{" "}
            {SITE.service.phrase} work around {SITE.location.city}. Every
            property is assessed on its own condition, access and construction.
          </p>
          <div className="mt-10">
            <GalleryGrid items={items} />
          </div>
        </div>
      </section>
      <section className="band--dark">
        <div className="container flex flex-col items-start gap-6 py-14 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="h2 text-white">Thinking about your own job?</h2>
            <p className="lede mt-2">
              Tell us what you&apos;ve noticed and we&apos;ll take a look. Free
              quote, no obligation.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="btn btn--accent btn--lg">
              Get a free quote
            </Link>
            <CallButton />
          </div>
        </div>
      </section>
    </>
  );
}
