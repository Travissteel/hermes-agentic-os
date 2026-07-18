import Link from "next/link";
import { SITE } from "@/site.config";
import { CallButton } from "@/components/call-button";

export function Navbar() {
  return (
    <header className="border-b border-border bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-bold text-foreground">
          {SITE.brandName}
        </Link>
        <div className="flex items-center gap-4 text-sm text-muted">
          <Link href="/services" className="hover:text-foreground">
            Services
          </Link>
          <Link href="/areas" className="hover:text-foreground">
            Areas
          </Link>
          <Link href="/blog" className="hover:text-foreground">
            Guides
          </Link>
          <Link href="/faq" className="hover:text-foreground">
            FAQ
          </Link>
          <CallButton compact />
          <Link
            href="/contact"
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:opacity-90"
          >
            Get Quotes
          </Link>
        </div>
      </nav>
    </header>
  );
}
