import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllPosts, getPostBySlug } from "@/lib/posts";
import { absoluteUrl, pageMetadata } from "@/lib/seo";
import { SITE } from "@/site.config";
import { BreadcrumbSchema, FAQSchema } from "@/components/seo";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return pageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
    author: { "@type": "Organization", name: SITE.brandName },
    publisher: { "@type": "Organization", name: SITE.brandName },
  };

  return (
    <div className="container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {post.faqs && <FAQSchema faqs={post.faqs} />}
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ]}
      />
      <article className="mx-auto max-w-3xl py-12">
        <h1 className="h2">
          {post.title}
        </h1>
        <p className="mt-2 text-sm text-muted">{post.publishedAt}</p>
        <p className="mt-4 text-lg text-muted">{post.description}</p>
        {post.sections.map((s) => (
          <section key={s.heading} className="mt-8">
            <h2 className="text-xl font-semibold text-foreground">{s.heading}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="mt-3 leading-relaxed text-muted">
                {p}
              </p>
            ))}
          </section>
        ))}
        {post.faqs && post.faqs.length > 0 && (
          <section className="mt-10 border-t border-border pt-8">
            <h2 className="text-xl font-semibold text-foreground">FAQs</h2>
            {post.faqs.map((f) => (
              <div key={f.question} className="mt-4">
                <h3 className="font-semibold text-foreground">{f.question}</h3>
                <p className="mt-1 text-muted">{f.answer}</p>
              </div>
            ))}
          </section>
        )}
        <div className="mt-10 rounded-xl border border-border bg-slate-50 p-6 text-center">
          <p className="font-semibold text-foreground">
            Need {SITE.service.phrase} in {SITE.location.city}?
          </p>
          <Link
            href="/contact"
            className="mt-3 inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-white hover:opacity-90"
          >
            Get Free Quotes
          </Link>
        </div>
      </article>
    </div>
  );
}
