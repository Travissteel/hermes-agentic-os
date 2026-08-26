import Link from "next/link";
import { SITE, CORE_PHRASE } from "@/site.config";
import { pageMetadata } from "@/lib/seo";
import { BreadcrumbSchema } from "@/components/seo";
import { CardMedia } from "@/components/card-media";

export const metadata = pageMetadata({
  title: `${SITE.service.name} Services in ${SITE.location.city}`,
  description: `All ${SITE.service.phrase} services we arrange quotes for in ${SITE.location.city}: ${SITE.subServices.map((s) => s.name.toLowerCase()).join(", ")}.`,
  path: "/services",
});

export default function ServicesPage() {
  return (
    <div className="container">
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
        ]}
      />
      <section className="band">
        <p className="eyebrow">Our services</p>
        <h1 className="h1 mt-4">{CORE_PHRASE} services</h1>
        <p className="lede mt-4 max-w-2xl">
          Whatever the job, we&apos;ll match you with local {SITE.location.city}{" "}
          pros who can quote it.
        </p>
        {/* Flex so the final row fills the width at any sub-service count —
            these lists run to five, which orphaned two cards under a fixed
            two-column grid. */}
        <div className="mt-10 flex flex-wrap gap-6">
          {SITE.subServices.map((s) => (
            <Link
              key={s.slug}
              href={`/services/${s.slug}`}
              className="card card--hover group flex min-w-0 flex-1 basis-80 flex-col overflow-hidden"
            >
              <CardMedia
                image={s.image}
                sizes="(max-width: 640px) 100vw, 420px"
              />
              <div className="flex flex-1 flex-col p-6">
                <h2 className="h3">{s.name}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                  {s.blurb}
                </p>
                <span className="mt-4 text-sm font-semibold text-accent-ink">
                  Get quotes
                  <span
                    aria-hidden
                    className="ml-1 inline-block transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
