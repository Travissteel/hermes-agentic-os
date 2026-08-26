import { notFound } from "next/navigation";
import Link from "next/link";
import { SITE } from "@/site.config";
import { pageMetadata } from "@/lib/seo";
import { QuoteForm } from "@/components/quote-form";
import { AnswerBlock } from "@/components/answer-block";
import { SiteImage } from "@/components/site-image";
import { BreadcrumbSchema, ServiceSchema, FAQSchema } from "@/components/seo";

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
    <div className="container">
      <ServiceSchema serviceName={sub.name} description={sub.blurb} />
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
          { name: sub.name, path: `/services/${sub.slug}` },
        ]}
      />
      {sub.faqs && sub.faqs.length > 0 && <FAQSchema faqs={sub.faqs} />}
      {/*
        Sub-service header image. Sits above the h1 rather than behind it —
        this is a money page, and the copy below is what has to rank, so the
        image gets a fixed band and no more. `priority` because on this route
        it is the LCP element.
      */}
      {sub.image && (
        <SiteImage
          image={sub.image}
          priority
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="mt-8 h-48 w-full rounded-2xl object-cover md:h-64"
        />
      )}
      <section className="grid items-start gap-10 py-12 md:grid-cols-[1.15fr_minmax(0,24rem)]">
        <div>
          <h1 className="h2">
            {sub.name} in {SITE.location.city}
          </h1>
          <p className="lede mt-4">{sub.blurb}</p>

          {/*
            Substance sections for the money page. Previously this rendered
            `blurb` plus a hardcoded answer block — ~180 words, 54% identical
            to sibling services. Each block renders only when written.
          */}

          {sub.whatItInvolves && (
            <div className="mt-8">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                What {sub.name.toLowerCase()} involves
              </h2>
              <p className="mt-3 text-muted">{sub.whatItInvolves}</p>
            </div>
          )}

          {sub.whenYouNeedIt && sub.whenYouNeedIt.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                When you need {sub.name.toLowerCase()}
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
                {sub.whenYouNeedIt.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {sub.process && sub.process.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                How the job runs
              </h2>
              <ol className="mt-3 space-y-4">
                {sub.process.map((p, i) => (
                  <li key={p.step} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-foreground">{p.step}</h3>
                      <p className="mt-1 text-sm text-muted">{p.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {sub.priceGuide && (
            <div className="mt-8">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                What {sub.name.toLowerCase()} costs in {SITE.location.city}
              </h2>
              <p className="mt-3 text-muted">{sub.priceGuide}</p>
            </div>
          )}

          <AnswerBlock
            className="mt-8"
            question={`How do I get ${sub.name.toLowerCase()} quotes in ${SITE.location.city}?`}
            answer={`Submit your job details through ${SITE.brandName} and local ${SITE.service.phrase} professionals who handle ${sub.name.toLowerCase()} will contact you directly with quotes. The service is free and there is no obligation to accept any quote.`}
          />

          {sub.faqs && sub.faqs.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {sub.name} questions
              </h2>
              <div className="mt-3 space-y-5">
                {sub.faqs.map((f) => (
                  <div key={f.question}>
                    <h3 className="font-semibold text-foreground">{f.question}</h3>
                    <p className="mt-1 text-muted">{f.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="mt-8 text-sm text-muted">
            Also need something else? See all{" "}
            <Link href="/services" className="text-primary underline">
              {SITE.service.phrase} services
            </Link>{" "}
            we arrange quotes for.
          </p>
        </div>
        <div className="card h-fit p-6 shadow-sm md:sticky md:top-24">
          <h2 className="mb-4 text-lg font-bold tracking-tight text-foreground">
            Get {sub.name.toLowerCase()} quotes
          </h2>
          <QuoteForm sourcePage={`/services/${sub.slug}`} />
        </div>
      </section>
    </div>
  );
}
