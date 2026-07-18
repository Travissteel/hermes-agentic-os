import Link from "next/link";
import { SITE } from "@/site.config";
import { getAllAreas } from "@/lib/locations";
import { pageMetadata } from "@/lib/seo";
import { BreadcrumbSchema } from "@/components/seo";

export const metadata = pageMetadata({
  title: `${SITE.service.name} Service Areas — ${SITE.location.city}`,
  description: `Suburbs where ${SITE.brandName} arranges free ${SITE.service.phrase} quotes: ${getAllAreas().map((a) => a.name).join(", ")}.`,
  path: "/areas",
});

export default function AreasPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "Areas", path: "/areas" },
        ]}
      />
      <section className="py-12">
        <h1 className="text-3xl font-bold text-foreground">
          {SITE.service.name} service areas
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          We connect residents in these {SITE.location.city} suburbs with local{" "}
          {SITE.service.phrase} pros.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {getAllAreas().map((a) => (
            <Link
              key={a.slug}
              href={`/areas/${a.slug}`}
              className="rounded-xl border border-border p-6 transition hover:border-primary"
            >
              <h2 className="text-lg font-semibold text-foreground">
                {SITE.service.name} {a.name}
              </h2>
              <p className="mt-1 text-xs text-muted">
                {a.name} {SITE.location.stateAbbr} {a.postcode}
              </p>
              <p className="mt-2 text-sm text-muted">{a.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
