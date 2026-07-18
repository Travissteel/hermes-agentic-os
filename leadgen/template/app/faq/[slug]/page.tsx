import { notFound } from "next/navigation";
import Link from "next/link";
import { SITE } from "@/site.config";
import { getAllFaqPages, getFaqPageBySlug } from "@/lib/faq-pages";
import { pageMetadata } from "@/lib/seo";
import { BreadcrumbSchema, FAQSchema } from "@/components/seo";
import { CallButton } from "@/components/call-button";

export function generateStaticParams() {
  return getAllFaqPages().map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getFaqPageBySlug(slug);
  if (!page) return {};
  return pageMetadata({
    title: page.question,
    description: page.answer.split(". ")[0] + ".",
    path: `/faq/${page.slug}`,
  });
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getFaqPageBySlug(slug);
  if (!page) notFound();

  return (
    <>
      <FAQSchema faqs={[{ question: page.question, answer: page.answer }]} />
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "FAQ", path: "/faq" },
          { name: page.question, path: `/faq/${page.slug}` },
        ]}
      />
      <article className="mx-auto max-w-3xl py-12">
        <h1 className="text-3xl font-bold leading-tight text-foreground">
          {page.question}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted">{page.answer}</p>

        {/* Authority funnel: internal links to money pages (SOP step 5) */}
        <div className="mt-10 rounded-xl border border-border bg-slate-50 p-6">
          <p className="font-semibold text-foreground">
            Need it sorted in {SITE.location.city}?
          </p>
          <ul className="mt-3 space-y-2">
            {page.linksTo.map((l) => (
              <li key={l.path}>
                <Link href={l.path} className="text-primary underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href="/contact"
              className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-white hover:opacity-90"
            >
              Get Free Quotes
            </Link>
            <CallButton compact />
          </div>
        </div>
      </article>
    </>
  );
}
