import { SITE } from "@/site.config";
import { pageMetadata } from "@/lib/seo";
import { QuoteForm } from "@/components/quote-form";
import { BreadcrumbSchema } from "@/components/seo";

export const metadata = pageMetadata({
  title: `Get Free ${SITE.service.name} Quotes — ${SITE.location.city}`,
  description: `Request a free ${SITE.service.phrase} quote in ${SITE.location.city}. Tell us about the job and we'll be in touch — no obligation.`,
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div className="container">
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ]}
      />
      <section id="quote" className="mx-auto max-w-xl py-12">
        <h1 className="h1">Request a free quote</h1>
        <p className="mt-3 text-muted">
          Tell us what you need done in {SITE.location.city}. We&apos;ll be in touch to discuss the job and your quote.
        </p>
        <div className="mt-8 rounded-xl border border-border bg-white p-6 shadow-sm">
          <QuoteForm sourcePage="/contact" />
        </div>
        <p className="mt-6 text-sm text-muted">
          Prefer email? Reach us at{" "}
          <a href={`mailto:${SITE.email}`} className="text-primary underline">
            {SITE.email}
          </a>
          {SITE.phoneDisplay ? ` or call ${SITE.phoneDisplay}` : ""}.
        </p>
      </section>
    </div>
  );
}
