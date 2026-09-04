import { SITE } from "@/site.config";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Terms of Use",
  description: `Terms of use for the ${SITE.brandName} website.`,
  path: "/terms",
});

export default function TermsPage() {
  return (
    <div className="container">
      <section className="mx-auto max-w-3xl py-12">
      <h1 className="text-3xl font-bold text-foreground">Terms of Use</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-muted">
        <p>
          These terms cover your use of the {SITE.brandName} website. They are
          not the contract for any work — the scope, price and conditions for a
          job are set out in the written quote you receive and agree to.
        </p>
        <p>
          <strong className="text-foreground">Quotes and estimates.</strong>{" "}
          Prices, timeframes and availability described on this site are
          general guidance only. A binding figure for your property comes from
          a written quote following an assessment of the actual site
          conditions, and may change if conditions differ from those visible at
          the time of quoting.
        </p>
        <p>
          <strong className="text-foreground">Subcontracting.</strong> Some
          work may be carried out by qualified subcontractors engaged by us.
          Your agreement remains with {SITE.brandName}.
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
