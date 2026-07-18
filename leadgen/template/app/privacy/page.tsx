import { SITE } from "@/site.config";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description: `How ${SITE.brandName} collects, uses, and shares the details you submit when requesting quotes.`,
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-3xl py-12">
      <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-muted">
        <p>
          {SITE.brandName} ({SITE.domain.replace("https://", "")}) collects the
          details you submit through our quote form — your name, phone number,
          suburb, and job description — for one purpose: connecting you with
          local {SITE.service.phrase} professionals who can quote your job.
        </p>
        <p>
          <strong className="text-foreground">What we share.</strong> Your
          details are passed only to the professionals matched to your request
          so they can contact you about your job. We do not sell your details to
          data brokers or use them for unrelated marketing.
        </p>
        <p>
          <strong className="text-foreground">Storage.</strong> Quote requests
          are delivered by email and are not stored in a database on this
          website.
        </p>
        <p>
          <strong className="text-foreground">Your rights.</strong> Under the
          Australian Privacy Principles you may request access to, correction
          of, or deletion of your personal information by emailing{" "}
          <a href={`mailto:${SITE.email}`} className="text-primary underline">
            {SITE.email}
          </a>
          .
        </p>
        <p>
          <strong className="text-foreground">Cookies &amp; analytics.</strong>{" "}
          This site does not set marketing cookies. Basic, anonymous hosting
          analytics may be collected by our hosting provider.
        </p>
      </div>
    </section>
  );
}
