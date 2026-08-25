import Link from "next/link";
import { SITE, CORE_PHRASE } from "@/site.config";
import { getAllAreas } from "@/lib/locations";
import { pageMetadata } from "@/lib/seo";
import { QuoteForm } from "@/components/quote-form";
import { AnswerBlock } from "@/components/answer-block";
import { CallButton } from "@/components/call-button";
import { SiteImage } from "@/components/site-image";
import { FAQSchema, ServiceSchema } from "@/components/seo";

export const metadata = pageMetadata({
  title: `${CORE_PHRASE} — Free Quotes From Local Pros`,
  description: `Need ${SITE.service.phrase} in ${SITE.location.city}? Tell us the job and get quotes from local professionals. Free, fast, no obligation.`,
  path: "/",
});

export default function HomePage() {
  const hero = SITE.images?.hero;

  return (
    <>
      <ServiceSchema
        serviceName={SITE.service.name}
        description={`${SITE.service.name} quote matching in ${SITE.location.city}, ${SITE.location.stateAbbr}.`}
      />
      <FAQSchema faqs={SITE.faqs} />

      {/*
        Hero + form above the fold.

        With a hero image the section becomes a dark photographic band; without
        one it renders exactly as it always has. The overlay is a fixed
        slate-950/70 rather than a theme colour on purpose — white text over an
        arbitrary stock photo is a contrast lottery, and a fixed dark scrim is
        the only thing that wins it for every image someone might drop in.

        The form keeps its opaque white card in both modes. It is the
        conversion element and must never depend on the photo behind it.
      */}
      <section
        className={
          hero
            ? "relative my-8 overflow-hidden rounded-2xl"
            : undefined
        }
      >
        {hero && (
          <>
            <SiteImage
              image={hero}
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-slate-950/70" />
          </>
        )}
        <div
          className={`relative grid gap-10 py-12 md:grid-cols-2 md:items-center ${
            hero ? "px-6 md:px-10" : ""
          }`}
        >
          <div>
            <h1
              className={`text-4xl font-bold leading-tight ${
                hero ? "text-white" : "text-foreground"
              }`}
            >
              {SITE.service.name} in {SITE.location.city}
            </h1>
            <p
              className={`mt-4 text-lg ${hero ? "text-white/90" : "text-muted"}`}
            >
              Tell us what you need done, and we&apos;ll connect you with local{" "}
              {SITE.service.phrase} pros who&apos;ll quote your job — free, with
              no obligation.
            </p>
            <ul
              className={`mt-6 space-y-2 ${hero ? "text-white/90" : "text-muted"}`}
            >
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
              className="group overflow-hidden rounded-xl border border-border transition hover:border-primary"
            >
              {s.image && (
                <SiteImage
                  image={s.image}
                  sizes="(max-width: 640px) 100vw, 320px"
                  className="h-40 w-full object-cover"
                />
              )}
              <div className="p-5">
                <h3 className="font-semibold text-foreground">{s.name}</h3>
                <p className="mt-2 text-sm text-muted">{s.blurb}</p>
              </div>
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
