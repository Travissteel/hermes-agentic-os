import { SITE } from "@/site.config";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Terms of Use",
  description: `Terms of use for the ${SITE.brandName} quote-matching service.`,
  path: "/terms",
});

export default function TermsPage() {
  return (
    <div className="container">
      <section className="mx-auto max-w-3xl py-12">
      <h1 className="text-3xl font-bold text-foreground">Terms of Use</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-muted">
        <p>
          {SITE.brandName} is a referral and quote-matching service. We do not
          perform {SITE.service.phrase} work ourselves, and we are not a party
          to any agreement you enter with a professional we refer you to.
        </p>
        <p>
          <strong className="text-foreground">No guarantee.</strong> We take
          reasonable steps to refer genuine local professionals, but we make no
          warranty about their availability, pricing, licensing, or workmanship.
          Always verify licence and insurance details directly with any
          tradesperson before engaging them.
        </p>
        <p>
          <strong className="text-foreground">Referral fees.</strong> We may
          receive a fee from professionals for leads or advertising. This does
          not affect the price you are quoted.
        </p>
        <p>
          <strong className="text-foreground">Content.</strong> Guides and
          articles on this site are general information for{" "}
          {SITE.location.state} residents, not professional advice for your
          specific situation.
        </p>
        <p>
          Questions about these terms:{" "}
          <a href={`mailto:${SITE.email}`} className="text-primary underline">
            {SITE.email}
          </a>
          .
        </p>
      </div>
    </section>
    </div>
  );
}
