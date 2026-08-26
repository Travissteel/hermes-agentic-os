import Link from "next/link";
import { SITE, CORE_PHRASE } from "@/site.config";
import { getAllAreas } from "@/lib/locations";
import { CallButton } from "@/components/call-button";

const SITE_LINKS = [
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function Footer() {
  return (
    <footer className="band--dark">
      <div className="container grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <p className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-white">
            <span aria-hidden className="h-6 w-1.5 rounded-full bg-accent" />
            {SITE.brandName}
          </p>
          <p className="mt-3 max-w-sm leading-relaxed text-muted">
            Free quote-matching service for {SITE.service.phrase} in{" "}
            {SITE.location.city}, {SITE.location.stateAbbr}. We connect you with
            local pros — we don&apos;t perform the work ourselves.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/contact" className="btn btn--accent">
              Get free quotes
            </Link>
            <CallButton compact />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
            Service areas
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {getAllAreas().map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/areas/${a.slug}`}
                  className="transition hover:text-white"
                >
                  {SITE.service.name} {a.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
            Site
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {SITE_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container py-5 text-center text-xs text-muted">
          © {new Date().getFullYear()} {SITE.brandName} — {CORE_PHRASE} quotes
        </div>
      </div>
    </footer>
  );
}
