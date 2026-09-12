import Link from "next/link";
import { SITE, CORE_PHRASE } from "@/site.config";
import { getAllAreas } from "@/lib/locations";
import { getAllFaqPages } from "@/lib/faq-pages";
import { pageMetadata } from "@/lib/seo";
import { QuoteForm } from "@/components/quote-form";
import { CallButton } from "@/components/call-button";
import { SiteImage } from "@/components/site-image";
import { FAQSchema, ServiceSchema } from "@/components/seo";

export const metadata = pageMetadata({
  title: `${CORE_PHRASE}, ${SITE.location.state} | ${SITE.brandName}`,
  description: `Need ${SITE.service.phrase} in ${SITE.location.city}? ${SITE.brandName} assesses the job, explains your options and provides a clear quote. Free quotes, no obligation.`,
  path: "/",
});

const STEPS = [
  { title: "Tell us what you need", body: "Let us know the job, your suburb and the best number to reach you." },
  { title: "We assess and quote", body: "We discuss the work, explain your options and give you a clear scope." },
  { title: "Agree the next step", body: "You know the plan before work starts. No obligation to go ahead." },
];

export default function HomePage() {
  const hero = SITE.images?.hero;
  const dark = (SITE.theme.variant ?? "bold") !== "clean";
  const areas = getAllAreas();
  const hasFaqPages = getAllFaqPages().length > 0;
  const values = [...(SITE.differentiators ?? []), ...(SITE.promises ?? [])];
  const process = SITE.process?.length ? SITE.process : STEPS;

  return (
    <>
      <ServiceSchema serviceName={SITE.service.name} description={`${SITE.service.name} services in ${SITE.location.city}, ${SITE.location.stateAbbr}.`} />
      <FAQSchema faqs={SITE.faqs} />
      <section className={`home-hero relative overflow-hidden ${dark ? "bg-[#171717]" : "bg-surface"}`}>
        {dark && hero && <SiteImage image={hero} priority sizes="100vw" className="absolute inset-0 h-full w-full object-cover" />}
        {dark && <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/40" />}
        <div className={`container relative grid items-center gap-8 py-8 md:grid-cols-[1.05fr_minmax(0,26rem)] md:gap-14 md:py-14 ${dark ? "on-dark" : ""}`}>
          <div>
            <p className="eyebrow">{SITE.location.city} &amp; surrounding areas</p>
            <h1 className={`h1 mt-3 ${dark ? "text-white" : ""}`}>
              {SITE.service.name} in <span className={dark ? "text-accent" : "text-accent-ink"}>{SITE.location.city}</span>
            </h1>
            {SITE.tagline && <p className={`mt-3 font-semibold ${dark ? "text-accent" : "text-accent-ink"}`}>{SITE.tagline}</p>}
            <p className="lede mt-4 max-w-xl">Tell us what you need done. We&apos;ll assess the job, explain your options and provide a clear quote.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="#quote" className="btn btn--accent">Request a free quote</Link>
              <CallButton />
            </div>
            <p className="mt-3 text-sm">No obligation · Clear scope before work starts</p>
            <nav aria-label="Explore our services" className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold">
              {SITE.subServices.slice(0, 3).map((s) => <Link key={s.slug} href={`/services/${s.slug}`} className="underline underline-offset-4">{s.name} <span aria-hidden>→</span></Link>)}
            </nav>
            {!dark && hero && <SiteImage image={hero} priority sizes="(max-width: 768px) 100vw, 560px" className="mt-6 h-36 w-full rounded-xl object-cover md:h-48" />}
          </div>
          <div id="quote" className="surface-light card bg-white p-5 shadow-xl md:p-6">
            <h2 className="text-xl font-bold text-foreground">Get a free quote</h2>
            <p className="mt-1 text-sm text-muted">A few details are all we need to get started.</p>
            <div className="mt-5"><QuoteForm sourcePage="/" /></div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="container grid gap-5 py-6 sm:grid-cols-3">
          {SITE.facts.map((f) => <div key={f.label}><p className="text-xs font-semibold uppercase tracking-wide text-accent-ink">{f.label}</p><p className="mt-1 text-sm font-medium">{f.value}</p></div>)}
        </div>
      </section>

      <section id="services" className="home-section">
        <div className="container">
          <p className="eyebrow">What we do</p>
          <h2 className="h2 mt-2">{SITE.service.name} services in {SITE.location.city}</h2>
          {/* SITE_SERVICE_INTRO: preserve site-owned contextual service links here. */}
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {SITE.subServices.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`} className="card card--hover flex items-start gap-4 p-5">
                {s.image && <SiteImage image={s.image} sizes="80px" className="home-service-image shrink-0" />}
                <div className="min-w-0"><h3 className="text-lg font-bold leading-snug">{s.name}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{s.blurb}</p><span className="mt-3 inline-block text-sm font-semibold text-accent-ink">View service →</span></div>
              </Link>
            ))}
          </div>
          <Link href="/services" className="mt-5 inline-block font-semibold text-accent-ink underline underline-offset-4">View all {SITE.service.phrase} services</Link>
        </div>
      </section>

      <section className="home-section bg-surface">
        <div className="container">
          <p className="eyebrow">Getting started</p><h2 className="h2 mt-2">From your first enquiry to the finished job</h2>
          <ol className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {process.map((step, i) => <li key={step.title}><span className="text-sm font-bold text-accent-ink">0{i + 1}</span><h3 className="mt-2 text-lg font-bold">{step.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p></li>)}
          </ol>
          <Link href="#quote" className="btn btn--primary mt-6">Tell us about your job</Link>
        </div>
      </section>

      {(SITE.about?.body?.length || values.length > 0 || SITE.stats?.length) && (
        <section className="home-section"><div className="container grid gap-8 md:grid-cols-2">
          <div><p className="eyebrow">About our work</p><h2 className="h2 mt-2">{SITE.about?.heading ?? `Your ${SITE.location.city} ${SITE.service.phrase} questions, answered`}</h2>
            {SITE.about?.body?.[0] && <p className="mt-4 leading-relaxed text-muted">{SITE.about.body[0]}</p>}
            {!!SITE.about?.body?.slice(1).length && <details className="home-details mt-5"><summary>More about how we work</summary><div className="prose-block">{SITE.about.body.slice(1).map((text,i)=><p key={i}>{text}</p>)}</div></details>}
            <Link href="/about" className="mt-4 inline-block font-semibold text-accent-ink underline">More about us</Link>
            {!!SITE.stats?.length && <dl className="mt-5 grid grid-cols-2 gap-4">{SITE.stats.map((s)=><div key={s.label}><dt className="text-xs text-muted">{s.label}</dt><dd className="mt-1 font-semibold">{s.value}</dd></div>)}</dl>}
          </div>
          <div className="space-y-3">{values.map((v,i)=><details key={`${v.title}-${i}`} className="home-details"><summary>{v.title}</summary><p className="leading-relaxed text-muted">{v.body}</p></details>)}</div>
        </div></section>
      )}

      {!!SITE.images?.gallery?.length && <section className="home-section bg-surface"><div className="container"><h2 className="h2">A closer look at the work</h2><div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">{SITE.images.gallery.slice(0,4).map((img)=><figure key={img.src}><SiteImage image={img} sizes="(max-width: 768px) 50vw, 280px" className="aspect-square w-full rounded-lg object-cover"/><figcaption className="mt-2 text-xs text-muted">{img.caption}</figcaption></figure>)}</div><Link href="/gallery" className="mt-4 inline-block font-semibold text-accent-ink underline">View the full gallery</Link></div></section>}

      <section className="home-section"><div className="container max-w-4xl"><p className="eyebrow">Planning your job</p><h2 className="h2 mt-2">Common {SITE.service.phrase} questions</h2><div className="mt-5 space-y-3">{SITE.faqs.map((f,i)=><details key={f.question} className="home-details" open={i===0}><summary>{f.question}</summary><p className="leading-relaxed text-muted">{f.answer}</p></details>)}</div>{hasFaqPages && <Link href="/faq" className="mt-4 inline-block font-semibold text-accent-ink underline">Read all {SITE.location.city} {SITE.service.phrase} FAQs</Link>}</div></section>

      <section className="home-section bg-surface"><div className="container"><p className="eyebrow">Where we work</p><h2 className="h2 mt-2">{SITE.location.city} &amp; surrounding communities</h2><div className="mt-5 flex flex-wrap gap-2">{areas.map((a)=><Link key={a.slug} href={`/areas/${a.slug}`} className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium">{a.name}</Link>)}</div><Link href="/areas" className="mt-4 inline-block font-semibold text-accent-ink underline">See all {SITE.location.city} service areas</Link>
        {!!SITE.localArea?.body?.length && <details className="home-details mt-5"><summary>{SITE.localArea.heading}</summary><p className="text-muted">{SITE.localArea.intro}</p><div className="prose-block text-muted">{SITE.localArea.body.map((text,i)=><p key={i}>{text}</p>)}</div></details>}
      </div></section>

      {!!SITE.longform?.length && <section className="home-section"><div className="container max-w-4xl"><h2 className="h2">Before work begins</h2><div className="mt-5 space-y-3">{SITE.longform.map((s)=><details key={s.id} id={s.id} className="home-details"><summary>{s.heading}</summary>{s.intro && <p className="text-muted">{s.intro}</p>}{s.image && <SiteImage image={s.image} sizes="(max-width: 768px) 100vw, 600px" className="my-4 max-h-64 w-full rounded-lg object-cover"/>}<div className="prose-block text-muted">{s.body.map((text,i)=><p key={i}>{text}</p>)}</div></details>)}</div></div></section>}

      <section className="band--dark"><div className="container flex flex-col items-start justify-between gap-5 py-10 md:flex-row md:items-center"><div><h2 className="h2 text-white">Let&apos;s talk about your job</h2><p className="mt-2 text-sm">Clear advice. A written scope. No obligation.</p></div><Link href="#quote" className="btn btn--accent">Request a free quote</Link></div></section>
    </>
  );
}
