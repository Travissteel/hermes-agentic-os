import Link from "next/link";
import { SITE } from "@/site.config";
import { QuoteForm } from "@/components/quote-form";
import { SiteImage } from "@/components/site-image";

/** Config-owned copy keeps a site's identity intact during template sync. */
export function BrandedHero() {
  const brand = SITE.homepage;
  if (!brand) return null;
  return (
    <section className={`home-hero brand-hero brand-hero--${brand.style}`}>
      <div className="container brand-hero-grid">
        <div className="brand-hero-copy">
          <p className="eyebrow">{SITE.service.name} &amp; reblocking · {SITE.location.city}</p>
          <h1>{brand.headline}</h1>
          <p className="brand-hero-tagline">{SITE.tagline}</p>
          <p className="brand-hero-intro">{brand.introduction}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link href="#quote" className="btn btn--primary">Tell us what you&apos;ve noticed <span aria-hidden>↗</span></Link>
            <Link href="#services" className="brand-secondary-link">Explore the services</Link>
          </div>
          <p className="mt-3 text-sm text-muted">Free quote · No obligation to proceed</p>
          {!!brand.quickLinks?.length && <nav aria-label="Plan your project" className="brand-quick-links">{brand.quickLinks.map(link => <Link key={link.href} href={link.href}>{link.label} <span aria-hidden>→</span></Link>)}</nav>}
          {SITE.images?.hero && <figure className="brand-hero-image">
            <SiteImage image={SITE.images.hero} priority sizes="(max-width: 767px) 100vw, 600px" className="h-full w-full object-cover" />
            <figcaption>From the ground up.</figcaption>
          </figure>}
        </div>
        <div id="quote" className="brand-quote surface-light">
          <p className="brand-quote-kicker">Start with a conversation</p>
          <h2 className="mt-2 text-2xl font-bold">Let&apos;s talk about your home</h2>
          <p className="mt-2 text-sm text-muted">You don&apos;t need to know the cause. Tell us what you&apos;ve noticed and where the property is.</p>
          <div className="mt-5"><QuoteForm sourcePage="/" /></div>
        </div>
      </div>
      <div className="brand-assurances"><div className="container">
        <span><b>01</b> Inspect before recommending</span>
        <span><b>02</b> A clear scope of work</span>
        <span><b>03</b> Your decision to proceed</span>
      </div></div>
    </section>
  );
}
