import Link from "next/link";
import { SITE } from "@/site.config";
import { getAllFaqPages } from "@/lib/faq-pages";
import { pageMetadata } from "@/lib/seo";
import { BreadcrumbSchema } from "@/components/seo";

export const metadata = pageMetadata({
  title: `${SITE.service.name} Questions Answered — ${SITE.location.city}`,
  description: `Straight answers to common ${SITE.service.phrase} questions from ${SITE.location.city} residents — costs, emergencies, and what to do first.`,
  path: "/faq",
});

export default function FaqIndexPage() {
  return (
    <div className="container">
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "FAQ", path: "/faq" },
        ]}
      />
      <section className="py-12">
        <h1 className="h1">
          {SITE.service.name} questions, answered
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Practical answers for {SITE.location.city} residents.
        </p>
        <ul className="mt-8 space-y-3">
          {getAllFaqPages().map((f) => (
            <li key={f.slug}>
              <Link
                href={`/faq/${f.slug}`}
                className="block rounded-xl border border-border p-5 font-semibold text-foreground transition hover:border-primary"
              >
                {f.question}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
