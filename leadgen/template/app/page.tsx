import Link from "next/link";
import { SITE, CORE_PHRASE } from "@/site.config";
import { getAllAreas } from "@/lib/locations";
import { pageMetadata } from "@/lib/seo";
import { QuoteForm } from "@/components/quote-form";
import { AnswerBlock } from "@/components/answer-block";
import { CallButton } from "@/components/call-button";
import { FAQSchema, ServiceSchema } from "@/components/seo";

export const metadata = pageMetadata({
  title: `${CORE_PHRASE} — Free Quotes From Local Pros`,
  description: `Need ${SITE.service.phrase} in ${SITE.location.city}? Tell us the job and get quotes from local professionals. Free, fast, no obligation.`,
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <ServiceSchema
        serviceName={SITE.service.name}
        description={`${SITE.service.name} quote matching in ${SITE.location.city}, ${SITE.location.stateAbbr}.`}
      />
      <FAQSchema faqs={SITE.faqs} />

      {/* Hero + form above the fold */}
      <section className="grid gap-10 py-12 md:grid-cols-2 md:items-center">
        <div>
          <h1 className="text-4xl font-bold leading-tight text-foreground">
            {SITE.service.name} in {SITE.location.city}
          </h1>
          <p className="mt-4 text-lg text-muted">
            Tell us what you need done, and we&apos;ll connect you with local{" "}
            {SITE.service.phrase} pros who&apos;ll quote your job — free, with no
            obligation.
          </p>
          <ul className="mt-6 space-y-2 text-muted">
            <li>✓ Local {SITE.location.city} professionals</li>
            <li>✓ Fast responses for urgent jobs</li>
            <li>✓ Compare quotes before you commit</li>
          </ul>
          <div className="mt-6">
            <CallButton />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Get free quotes now
          </h2>
          <QuoteForm sourcePage="/" />
        </div>
      </section>

      {/* Facts strip — citable, entity-consistent (GEO) */}
      <section className="grid gap-4 rounded-xl border border-border bg-slate-50 p-6 sm:grid-cols-3">
        {SITE.facts.map((f) => (
          <div key={f.label}>
            <p className="text-xs uppercase tracking-wide text-muted">{f.label}</p>
            <p className="mt-1 font-semibold text-foreground">{f.value}</p>
          </div>
        ))}
      </section>

      {/* Sub-services */}
      <section className="py-12">
        <h2 className="text-2xl font-bold text-foreground">
          {SITE.service.name} services in {SITE.location.city}
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {SITE.subServices.map((s) => (
            <Link
              key={s.slug}
              href={`/services/${s.slug}`}
              className="rounded-xl border border-border p-5 transition hover:border-primary"
            >
              <h3 className="font-semibold text-foreground">{s.name}</h3>
              <p className="mt-2 text-sm text-muted">{s.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Answer blocks (GEO) */}
      <section className="py-4">
        {SITE.faqs.map((f) => (
          <AnswerBlock key={f.question} question={f.question} answer={f.answer} />
        ))}
      </section>

      {/* Areas */}
      <section className="py-12">
        <h2 className="text-2xl font-bold text-foreground">Areas we cover</h2>
        <p className="mt-2 text-muted">
          {SITE.brandName} connects residents across {SITE.location.city} and
          surrounding suburbs with local pros.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {getAllAreas().map((a) => (
            <Link
              key={a.slug}
              href={`/areas/${a.slug}`}
              className="rounded-full border border-border px-4 py-1.5 text-sm text-muted transition hover:border-primary hover:text-foreground"
            >
              {a.name}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
