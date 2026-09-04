import { SITE, CORE_PHRASE } from "@/site.config";
import { pageMetadata } from "@/lib/seo";
import { AnswerBlock } from "@/components/answer-block";
import { BreadcrumbSchema } from "@/components/seo";

export const metadata = pageMetadata({
  title: `About ${SITE.brandName}`,
  description: `Who we are, how we approach ${SITE.service.phrase} in ${SITE.location.city}, and what to expect from first enquiry to finished work.`,
  path: "/about",
});

/**
 * Operator-voice about page. The old version opened by explaining what the
 * brand *wasn't*, which is the single worst thing to put above the fold on a
 * page people reach when they are deciding whether to trust you.
 *
 * The answers below are true for any site in the network without needing a
 * trading history: they describe method and process, not credentials. Nothing
 * here asserts a licence, an insurance policy, a review or a job count —
 * those belong in `credentials` and only once they are real.
 */
export default function AboutPage() {
  const since = SITE.establishedYear ? ` since ${SITE.establishedYear}` : "";

  return (
    <div className="container">
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ]}
      />
      <section className="mx-auto max-w-3xl py-12">
        <h1 className="h1">About {SITE.brandName}</h1>
        {SITE.about?.body?.length ? (
          <div className="mt-8 space-y-4 leading-relaxed text-muted">
            {SITE.about.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : null}
        <div className="mt-10 space-y-5">
          <AnswerBlock
            question={`What does ${SITE.brandName} do?`}
            answer={`${SITE.brandName} handles ${SITE.service.phrase} for homes and properties across ${SITE.location.city}, ${SITE.location.state}${since}. We assess the job on site, explain what we find in plain terms, and set out a clear scope and quote before any work is agreed.`}
          />
          <AnswerBlock
            question="What happens after I get in touch?"
            answer={`You tell us what you have noticed and where the property is. We arrange a look at the job, discuss the practical options and provide a written quote covering the work involved. There is no charge for the quote and no obligation to proceed.`}
          />
          <AnswerBlock
            question="How do you price the work?"
            answer={`Pricing follows the scope — the extent of the work, access around the property, site conditions and the materials required. We would rather see the job than guess from a photo, because a number given without those details tends to change later, and that helps nobody.`}
          />
          <AnswerBlock
            question={`Which areas do you cover?`}
            answer={`We work throughout ${SITE.location.city} and the surrounding towns. If you are not sure whether your address falls inside the service area, send it through and we will tell you straight away.`}
          />
        </div>
        <p className="mt-8 text-sm text-muted">
          Questions about {CORE_PHRASE.toLowerCase()}? Email{" "}
          <a href={`mailto:${SITE.email}`} className="text-primary underline">
            {SITE.email}
          </a>
          .
        </p>
      </section>
    </div>
  );
}
