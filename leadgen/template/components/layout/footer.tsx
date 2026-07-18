import Link from "next/link";
import { SITE, CORE_PHRASE } from "@/site.config";
import { getAllAreas } from "@/lib/locations";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-slate-50">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-semibold text-foreground">{SITE.brandName}</p>
          <p className="mt-2 text-sm text-muted">
            Free quote-matching service for {SITE.service.phrase} in{" "}
            {SITE.location.city}, {SITE.location.stateAbbr}. We connect you with
            local pros — we don&apos;t perform the work ourselves.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Service areas</p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {getAllAreas().map((a) => (
              <li key={a.slug}>
                <Link href={`/areas/${a.slug}`} className="hover:text-foreground">
                  {SITE.service.name} {a.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Site</p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            <li>
              <Link href="/faq" className="hover:text-foreground">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-foreground">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-foreground">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} {SITE.brandName} — {CORE_PHRASE} quotes
      </div>
    </footer>
  );
}
