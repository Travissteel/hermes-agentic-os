import Link from "next/link";
import { SITE, CORE_PHRASE } from "@/site.config";
import { getAllAreas } from "@/lib/locations";
import { pageMetadata } from "@/lib/seo";
import { QuoteForm } from "@/components/quote-form";
import { AnswerBlock } from "@/components/answer-block";
import { CallButton } from "@/components/call-button";
import { SiteImage } from "@/components/site-image";
import { CardMedia } from "@/components/card-media";
import { FAQSchema, ServiceSchema } from "@/components/seo";

export const metadata = pageMetadata({
  title: `${CORE_PHRASE} — Free Quotes From Local Pros`,
  description: `Need ${SITE.service.phrase} in ${SITE.location.city}? Tell us the job and get quotes from local professionals. Free, fast, no obligation.`,
  path: "/",
});

/**
 * What happens after someone submits.
 *
 * Written in the active, first-person voice a local service site uses, and
 * framed as a benefit rather than a disclaimer — a headline that opens by
 * explaining what the brand *isn't* costs form fills for no gain. The fact
 * that this is a matching service and not the trade is disclosed properly
 * in the footer, /about, /terms and the FAQ, which is where it belongs and
 * where it is actually read.
 *
 * What it must never do is claim credentials this brand does not hold —
 * licences, insurance, years in business, testimonials. Those are the
 * renter's to bring once the site is let.
 */
const STEPS = [
  {
    title: "Tell us the job",
    body: `Describe what you need done and where in ${SITE.location.city} you are. Takes about a minute.`,
  },
  {
    title: "We match you locally",
    body: `Your job goes to ${SITE.service.phrase} professionals working in your area — and nowhere else.`,
  },
  {
    title: "Compare and choose",
    body: "They contact you with quotes. Compare them, ask questions, and pick the one you want.",
  },
];

export default function HomePage() {
  const hero = SITE.images?.hero;
  const areas = getAllAreas();
  const variant = SITE.theme.variant ?? "bold";

  // Suburb count is deliberately not surfaced. "7 suburbs covered" reads as
  // a limit — as though the other suburbs are excluded — when the intent is
  // reach. Name the city and let "& surrounds" carry the rest.
  const chips = [
    "Free — no obligation",
    `${SITE.location.city} & surrounding suburbs`,
    "Compare before you commit",
  ];

  const headline = (
    <>
      {SITE.service.name} in{" "}
      <span className="text-accent">{SITE.location.city}</span>
    </>
  );

  const lede = `Tell us about the job and we'll get you quotes from local ${SITE.service.phrase} pros — free, fast, and no obligation.`;

  const formCard = (
    <div className="surface-light card bg-white p-6 shadow-2xl shadow-black/20">
      <h2 className="text-lg font-bold tracking-tight text-foreground">
        Get free quotes now
      </h2>
      <p className="mt-1 text-sm text-muted">One form. No account, no spam.</p>
      <div className="mt-4">
        <QuoteForm sourcePage="/" />
      </div>
    </div>
  );

  return (
    <>
      <ServiceSchema
        serviceName={SITE.service.name}
        description={`${SITE.service.name} quote matching in ${SITE.location.city}, ${SITE.location.stateAbbr}.`}
      />
      <FAQSchema faqs={SITE.faqs} />

      {variant === "bold" ? (
        /*
          "bold": dark photographic band, copy left, form beside it. The band
          is always the site's primary colour, so the layout is identical with
          or without a photo — the image is a texture over a known-dark
          surface rather than the thing the text contrasts against. That is
          what makes white text safe over an arbitrary stock photo without a
          flat muddy scrim across the whole frame.
        */
        <section className="band--dark relative overflow-hidden">
          {hero && (
            <>
              <SiteImage
                image={hero}
                priority
                sizes="100vw"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-[var(--primary)] via-[var(--primary)]/90 to-[var(--primary)]/60
                           md:bg-gradient-to-r md:via-[var(--primary)]/85 md:to-[var(--primary)]/20"
              />
            </>
          )}
          <div className="container relative grid gap-10 py-14 md:grid-cols-[1.05fr_minmax(0,26rem)] md:items-center md:py-20">
            <div>
              <p className="eyebrow">
                Serving {SITE.location.city} &amp; surrounding suburbs
              </p>
              <h1 className="h1 mt-4 text-white">{headline}</h1>
              <p className="lede mt-5 max-w-xl">{lede}</p>
              <ul className="mt-7 flex flex-wrap gap-2">
                {chips.map((c) => (
                  <li
                    key={c}
                    className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium text-white"
                  >
                    {c}
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                <CallButton />
              </div>
            </div>
            {formCard}
          </div>
        </section>
      ) : (
        /*
          "clean": light hero, photo as a framed side panel rather than a
          background, form in a tinted band immediately below. Same content,
          a visibly different site — which is the point, since forty sites
          off one template rendering one layout is a footprint.
        */
        <>
          <section className="band">
            <div className="container grid gap-10 md:grid-cols-2 md:items-center">
              <div>
                <p className="eyebrow">
                  Serving {SITE.location.city} &amp; surrounding suburbs
                </p>
                <h1 className="h1 mt-4">{headline}</h1>
                <p className="lede mt-5 max-w-xl">{lede}</p>
                <ul className="mt-7 flex flex-wrap gap-2">
                  {chips.map((c) => (
                    <li
                      key={c}
                      className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium text-foreground"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="#quote" className="btn btn--accent btn--lg">
                    Get free quotes
                  </Link>
                  <CallButton />
                </div>
              </div>
              {hero && (
                <SiteImage
                  image={hero}
                  priority
                  sizes="(max-width: 768px) 100vw, 560px"
                  className="h-64 w-full rounded-[var(--radius-lg)] object-cover shadow-xl shadow-black/10 md:h-[26rem]"
                />
              )}
            </div>
          </section>
          <section id="quote" className="band band--tint scroll-mt-20">
            <div className="container max-w-2xl">{formCard}</div>
          </section>
        </>
      )}

      {/* Facts strip — citable, entity-consistent (GEO). */}
      <section className="border-y border-border bg-surface">
        <div className="container grid gap-6 py-7 sm:grid-cols-3">
          {SITE.facts.map((f) => (
            <div key={f.label} className="sm:text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-ink">
                {f.label}
              </p>
              <p className="mt-1.5 font-semibold text-foreground">{f.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="band">
        <div className="container">
          <p className="eyebrow">How it works</p>
          <h2 className="h2 mt-4 max-w-2xl">Get quotes in three simple steps</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="card p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-bold text-on-accent">
                  {i + 1}
                </span>
                <h3 className="h3 mt-4">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sub-services. Flex rather than a fixed column count: these lists run
          to five items, which orphaned a 3+2 row under sm:grid-cols-3. */}
      <section className="band band--tint">
        <div className="container">
          <p className="eyebrow">Our services</p>
          <h2 className="h2 mt-4">
            {SITE.service.name} services in {SITE.location.city}
          </h2>
          <div className="mt-10 flex flex-wrap gap-6">
            {SITE.subServices.map((s) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="card card--hover group flex min-w-0 flex-1 basis-72 flex-col overflow-hidden"
              >
                <CardMedia
                  image={s.image}
                  sizes="(max-width: 640px) 100vw, 380px"
                />
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="h3">{s.name}</h3>
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
        </div>
      </section>

      {/* Answer blocks (GEO) — kept expanded and in the DOM, never collapsed
          behind an accordion: these exist to be lifted verbatim by AI search. */}
      <section className="band">
        <div className="container">
          <p className="eyebrow">Common questions</p>
          <h2 className="h2 mt-4">
            {SITE.service.name} in {SITE.location.city}, answered
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {SITE.faqs.map((f) => (
              <AnswerBlock
                key={f.question}
                question={f.question}
                answer={f.answer}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Areas */}
      <section className="band band--tint">
        <div className="container">
          <p className="eyebrow">Where we cover</p>
          <h2 className="h2 mt-4">Areas we cover</h2>
          <p className="lede mt-3 max-w-2xl">
            {SITE.brandName} connects residents across {SITE.location.city} and
            the surrounding suburbs with local pros.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            {areas.map((a) => (
              <Link
                key={a.slug}
                href={`/areas/${a.slug}`}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted transition hover:border-primary hover:text-foreground"
              >
                {a.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="band--dark">
        <div className="container flex flex-col items-start gap-6 py-14 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="h2 text-white">Ready to get quotes for your job?</h2>
            <p className="lede mt-2">
              Free, no obligation, and you choose one or none.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="btn btn--accent btn--lg">
              Get free quotes
            </Link>
            <CallButton />
          </div>
        </div>
      </section>
    </>
  );
}
