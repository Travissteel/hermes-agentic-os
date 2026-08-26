import { SITE, CORE_PHRASE } from "@/site.config";
import { pageMetadata } from "@/lib/seo";
import { AnswerBlock } from "@/components/answer-block";
import { BreadcrumbSchema } from "@/components/seo";

export const metadata = pageMetadata({
  title: `About ${SITE.brandName}`,
  description: `What ${SITE.brandName} is, how the free ${SITE.service.phrase} quote-matching service works, and how we make money.`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="container">
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ]}
      />
      <section className="mx-auto max-w-3xl py-12">
        <h1 className="h1">
          About {SITE.brandName}
        </h1>
        <div className="mt-8 space-y-5">
          <AnswerBlock
            question={`What is ${SITE.brandName}?`}
            answer={`${SITE.brandName} is a free quote-matching service for ${SITE.service.phrase} in ${SITE.location.city}, ${SITE.location.state}. We don't perform the work ourselves — we take your job details and pass them to licensed local professionals who contact you directly with quotes.`}
          />
          <AnswerBlock
            question="How does the service work?"
            answer={`You describe your job through the quote form, we match it with local ${SITE.service.phrase} professionals who service your suburb, and they contact you with quotes. You choose who to hire — or nobody. Using the service is free and carries no obligation.`}
          />
          <AnswerBlock
            question="How do we make money?"
            answer={`Local businesses pay us a referral or advertising fee to receive job leads. This never changes the price you pay, and it is how we keep ${CORE_PHRASE.toLowerCase()} quotes free for residents.`}
          />
          <AnswerBlock
            question="Who actually does the work?"
            answer={`All work is carried out by the independent local professionals who quote your job — always ask to sight their licence and insurance before work begins, as you would with any tradesperson.`}
          />
        </div>
        <p className="mt-8 text-sm text-muted">
          Questions? Email{" "}
          <a href={`mailto:${SITE.email}`} className="text-primary underline">
            {SITE.email}
          </a>
          .
        </p>
      </section>
    </div>
  );
}
