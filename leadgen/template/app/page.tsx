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
import {
  AboutBlock,
  Differentiators,
  GallerySection,
  LocalAreaSection,
  LongformSections,
  ProcessSteps,
  Promises,
  SectionHead,
  StatsStrip,
} from "@/components/sections";

export const metadata = pageMetadata({
  title: `${CORE_PHRASE}, ${SITE.location.state} | ${SITE.brandName}`,
  description: `Need ${SITE.service.phrase} in ${SITE.location.city}? ${SITE.brandName} assesses the job, explains your options and provides a clear quote. Free quotes, no obligation.`,
  path: "/",
});

/**
 * Fallback "how we work" steps, used only when the config has no `process`.
 *
 * Operator voice (rule changed 2026-09-01): these describe how WE run the job,
 * not how a matching service passes it on. They claim no credential — every
 * line is true of any operator on day one — so a site with nothing filled in
 * still reads honestly.
 */
const STEPS: { title: string; body: string; icon: "phone" | "clipboard" | "check" }[] = [
  {
    title: "Tell us what you've noticed",
    body: `Describe the job and where in ${SITE.location.city} the property is. Takes about a minute.`,
    icon: "phone",
  },
  {
    title: "We assess and quote",
    body: "We look at the job properly, explain what we find in plain terms and put the scope in writing.",
    icon: "clipboard",
  },
  {
    title: "We do the work",
    body: "You know the plan before we start, and we talk you through anything the site turns up along the way.",
    icon: "check",
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
    "Free quotes — no obligation",
    `${SITE.location.city} & surrounding suburbs`,
    "Clear scope before we start",
  ];

  const headline = (
    <>
      {SITE.service.name} in{" "}
      <span className="text-accent">{SITE.location.city}</span>
    </>
  );

  const lede = `Practical ${SITE.service.phrase} for ${SITE.location.city} and the surrounding communities. Tell us what you've noticed and we'll give you a clear assessment and quote.`;

  const formCard = (
    <div className="surface-light card bg-white p-6 shadow-2xl shadow-black/20">
      <h2 className="text-lg font-bold tracking-tight text-foreground">
        Get a free quote
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
        description={`${SITE.service.name} services in ${SITE.location.city}, ${SITE.location.stateAbbr}.`}
      />
      <FAQSchema faqs={SITE.faqs} />

      {variant === "trade" ? (
        /*
          "trade": the photo carries the frame. The scrim is neutral black
          rather than the site's primary, which is the whole visual difference
          from "bold" — a primary-tinted band reads as a brand colour block
          with a texture in it, while a plain dark scrim reads as a photograph
          of a real job. That costs contrast safety, so the gradient is heavy
          at the bottom and left where the copy sits, and the white text is
          never over the light end of the image.
        */
        <section className="relative overflow-hidden bg-[#111]">
          {hero && (
            <SiteImage
              image={hero}
              priority
              sizes="100vw"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/40 md:bg-gradient-to-r md:from-black/90 md:via-black/70 md:to-black/25" />
          {/* .on-dark, not .band--dark — the latter paints an opaque --primary
              and would cover the photograph this variant exists to show. */}
          <div className="on-dark relative">
            <div className="container grid gap-10 py-16 md:grid-cols-[1.05fr_minmax(0,26rem)] md:items-center md:py-24">
              <div>
                <p className="eyebrow">
                  Serving {SITE.location.city} &amp; surrounding areas
                </p>
                <h1 className="h1 mt-4 text-white">{headline}</h1>
                {SITE.tagline && (
                  <p className="mt-3 text-lg font-semibold text-accent">
                    {SITE.tagline}
                  </p>
                )}
                <p className="lede mt-5 max-w-xl">{lede}</p>
                <ul className="mt-7 flex flex-wrap gap-2">
                  {chips.map((c) => (
                    <li
                      key={c}
                      className="rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white"
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
          </div>
        </section>
      ) : variant === "bold" ? (
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

      {/* Sub-services. Flex rather than a fixed column count: these lists run
          to five items, which orphaned a 3+2 row under sm:grid-cols-3.

          Promoted above the process block as of 2026-09-01: these cards are
          the internal links into the money pages, and burying them under a
          "how it works" explainer put the site's most important links below
          the second scroll. */}
      <section className="band band--tint">
        <div className="container">
          <SectionHead
            eyebrow="What we do"
            heading={`${SITE.service.name} services in ${SITE.location.city}`}
          />
          <div className="flex flex-wrap gap-6">
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
                    Learn more
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

      <StatsStrip stats={SITE.stats} />
      <Differentiators cards={SITE.differentiators} />

      {/* Site-level process. Falls back to STEPS above when the config has
          none, so this section is never empty. */}
      <ProcessSteps steps={SITE.process ?? STEPS} />

      <AboutBlock about={SITE.about} />

      {/* Answer blocks (GEO) — kept expanded and in the DOM, never collapsed
          behind an accordion: these exist to be lifted verbatim by AI search. */}
      <section className="band band--tint">
        <div className="container">
          <SectionHead
            eyebrow="Everything you need to know"
            heading={`${SITE.service.name} in ${SITE.location.city}, answered`}
          />
          <div className="grid gap-5 md:grid-cols-2">
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

      <Promises cards={SITE.promises} />
      <GallerySection items={SITE.images?.gallery} />
      <LocalAreaSection localArea={SITE.localArea} />
      <LongformSections sections={SITE.longform} />

      {/* Areas */}
      <section className="band">
        <div className="container">
          <p className="eyebrow">Where we cover</p>
          <h2 className="h2 mt-4">
            Proudly serving {SITE.location.city} &amp; surrounding communities
          </h2>
          <p className="lede mt-3 max-w-2xl">
            We work throughout {SITE.location.city} and the towns around it.
            Choose your area for local detail.
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
            <h2 className="h2 text-white">
              Get your {SITE.service.phrase} questions answered
            </h2>
            <p className="lede mt-2">
              Tell us what you&apos;ve noticed and we&apos;ll give you a clear
              assessment. Free quote, no obligation.
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
