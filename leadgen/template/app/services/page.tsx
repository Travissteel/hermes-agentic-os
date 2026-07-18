import Link from "next/link";
import { SITE, CORE_PHRASE } from "@/site.config";
import { pageMetadata } from "@/lib/seo";
import { BreadcrumbSchema } from "@/components/seo";

export const metadata = pageMetadata({
  title: `${SITE.service.name} Services in ${SITE.location.city}`,
  description: `All ${SITE.service.phrase} services we arrange quotes for in ${SITE.location.city}: ${SITE.subServices.map((s) => s.name.toLowerCase()).join(", ")}.`,
  path: "/services",
});

export default function ServicesPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
        ]}
      />
      <section className="py-12">
        <h1 className="text-3xl font-bold text-foreground">
          {CORE_PHRASE} services
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Whatever the job, we&apos;ll match you with local {SITE.location.city}{" "}
          pros who can quote it.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {SITE.subServices.map((s) => (
            <Link
              key={s.slug}
              href={`/services/${s.slug}`}
              className="rounded-xl border border-border p-6 transition hover:border-primary"
            >
              <h2 className="text-lg font-semibold text-foreground">{s.name}</h2>
              <p className="mt-2 text-sm text-muted">{s.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
