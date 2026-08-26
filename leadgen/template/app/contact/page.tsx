import { SITE } from "@/site.config";
import { pageMetadata } from "@/lib/seo";
import { QuoteForm } from "@/components/quote-form";
import { BreadcrumbSchema } from "@/components/seo";

export const metadata = pageMetadata({
  title: `Get Free ${SITE.service.name} Quotes — ${SITE.location.city}`,
  description: `Request free ${SITE.service.phrase} quotes in ${SITE.location.city}. Describe the job and local pros will contact you — no obligation.`,
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
      <section className="mx-auto max-w-xl py-12">
        <h1 className="h1">Get free quotes</h1>
        <p className="mt-3 text-muted">
          Tell us about the job and local {SITE.service.phrase} pros in{" "}
          {SITE.location.city} will be in touch.
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
