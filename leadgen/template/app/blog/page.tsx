import Link from "next/link";
import { SITE } from "@/site.config";
import { getAllPosts } from "@/lib/posts";
import { pageMetadata } from "@/lib/seo";
import { BreadcrumbSchema } from "@/components/seo";

export const metadata = pageMetadata({
  title: `${SITE.service.name} Guides & Advice — ${SITE.location.city}`,
  description: `Local guides on ${SITE.service.phrase} costs, common problems, and choosing the right pro in ${SITE.location.city}.`,
  path: "/blog",
});

export default function BlogIndexPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/blog" },
        ]}
      />
      <section className="py-12">
        <h1 className="text-3xl font-bold text-foreground">Guides &amp; advice</h1>
        <div className="mt-8 space-y-4">
          {getAllPosts().map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="block rounded-xl border border-border p-6 transition hover:border-primary"
            >
              <h2 className="text-lg font-semibold text-foreground">{p.title}</h2>
              <p className="mt-2 text-sm text-muted">{p.description}</p>
              <p className="mt-2 text-xs text-muted">{p.publishedAt}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
