import { notFound } from "next/navigation";
import Link from "next/link";
import { SITE } from "@/site.config";
import { pageMetadata } from "@/lib/seo";
import { QuoteForm } from "@/components/quote-form";
import { AnswerBlock } from "@/components/answer-block";
import { BreadcrumbSchema, ServiceSchema } from "@/components/seo";

export function generateStaticParams() {
  return SITE.subServices.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sub = SITE.subServices.find((s) => s.slug === slug);
  if (!sub) return {};
  return pageMetadata({
    title: `${sub.name} ${SITE.location.city} — Free Quotes`,
    description: `${sub.blurb} Get free quotes from ${SITE.location.city} pros today.`,
    path: `/services/${sub.slug}`,
  });
}

export default async function SubServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sub = SITE.subServices.find((s) => s.slug === slug);
  if (!sub) notFound();

  return (
    <>
      <ServiceSchema serviceName={sub.name} description={sub.blurb} />
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
          { name: sub.name, path: `/services/${sub.slug}` },
        ]}
      />
      <section className="grid gap-10 py-12 md:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {sub.name} in {SITE.location.city}
          </h1>
          <p className="mt-4 text-muted">{sub.blurb}</p>
          <AnswerBlock
            question={`How do I get ${sub.name.toLowerCase()} quotes in ${SITE.location.city}?`}
            answer={`Submit your job details through ${SITE.brandName} and local ${SITE.service.phrase} professionals who handle ${sub.name.toLowerCase()} will contact you directly with quotes. The service is free and there is no obligation to accept any quote.`}
          />
          <p className="mt-6 text-sm text-muted">
            Also need something else? See all{" "}
            <Link href="/services" className="text-primary underline">
              {SITE.service.phrase} services
            </Link>{" "}
            we arrange quotes for.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Get {sub.name.toLowerCase()} quotes
          </h2>
          <QuoteForm sourcePage={`/services/${sub.slug}`} />
        </div>
      </section>
    </>
  );
}
