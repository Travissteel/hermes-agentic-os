import { notFound } from "next/navigation";
import Link from "next/link";
import { SITE } from "@/site.config";
import { getAllAreas, getAreaBySlug } from "@/lib/locations";
import { pageMetadata } from "@/lib/seo";
import { QuoteForm } from "@/components/quote-form";
import { AnswerBlock } from "@/components/answer-block";
import { BreadcrumbSchema, ServiceSchema } from "@/components/seo";

export function generateStaticParams() {
  return getAllAreas().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const area = getAreaBySlug(slug);
  if (!area) return {};
  return pageMetadata({
    title: `${SITE.service.name} ${area.name} — Free Local Quotes`,
    description: `Need ${SITE.service.phrase} in ${area.name} ${area.postcode}? Get free quotes from local pros who service ${area.name} and nearby suburbs.`,
    path: `/areas/${area.slug}`,
  });
}

export default async function AreaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const area = getAreaBySlug(slug);
  if (!area) notFound();

  return (
    <>
      <ServiceSchema
        serviceName={SITE.service.name}
        description={`${SITE.service.name} quote matching for ${area.name}, ${SITE.location.stateAbbr} ${area.postcode}.`}
        areaName={`${area.name}, ${SITE.location.stateAbbr}`}
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "Areas", path: "/areas" },
          { name: area.name, path: `/areas/${area.slug}` },
        ]}
      />
      <section className="grid gap-10 py-12 md:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {SITE.service.name} in {area.name}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {area.name}, {SITE.location.stateAbbr} {area.postcode}
          </p>
          <p className="mt-4 text-muted">{area.blurb}</p>
          <AnswerBlock
            question={`How do I find a ${SITE.service.name.toLowerCase()} in ${area.name}?`}
            answer={`${SITE.brandName} matches ${area.name} residents with local ${SITE.service.phrase} professionals for free. Describe the job, and pros who service ${area.name} (${area.postcode}) will contact you with quotes — usually the same day for urgent work.`}
          />
          <div className="mt-6 text-sm text-muted">
            Nearby areas:{" "}
            {getAllAreas()
              .filter((a) => a.slug !== area.slug)
              .map((a, i, arr) => (
                <span key={a.slug}>
                  <Link href={`/areas/${a.slug}`} className="text-primary underline">
                    {a.name}
                  </Link>
                  {i < arr.length - 1 ? " · " : ""}
                </span>
              ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Get quotes in {area.name}
          </h2>
          <QuoteForm sourcePage={`/areas/${area.slug}`} />
        </div>
      </section>
    </>
  );
}
