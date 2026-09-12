"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE } from "@/site.config";
import { telHref } from "@/components/call-button";

/**
 * `hasPosts` / `hasFaqPages` arrive as props rather than being read here,
 * because this is a client component: importing lib/posts would ship every
 * guide's full body text in the client bundle, growing with each cron-added
 * post. The server layout already has the data for free.
 */
const LINKS = [
  { href: "/services", label: "Services" },
  { href: "/areas", label: "Areas" },
  { href: "/gallery", label: "Gallery" },
  { href: "/blog", label: "Guides" },
  { href: "/faq", label: "FAQ" },
];

/**
 * Sticky header with a real mobile menu.
 *
 * The previous version put four links, a call button and a CTA in a single
 * flex row with no breakpoint handling, which crushed below ~640px — on
 * traffic that is overwhelmingly mobile. Everything except the brand and the
 * two conversion actions now collapses behind a toggle.
 */
export function Navbar({
  hasPosts = true,
  hasFaqPages = true,
}: {
  hasPosts?: boolean;
  hasFaqPages?: boolean;
}) {
  const quoteHref = usePathname() === "/" ? "#quote" : "/contact#quote";
  const [open, setOpen] = useState(false);
  const links = LINKS.filter(
    (l) =>
      (l.href !== "/blog" || hasPosts) &&
      (l.href !== "/faq" || hasFaqPages) &&
      /* /gallery 404s without images. Read straight from SITE rather than a
         prop — it is a static config value, not file-system data, so it costs
         nothing in the client bundle. */
      (l.href !== "/gallery" || !!SITE.images?.gallery?.length)
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/85 backdrop-blur">
      <nav className="container flex items-center justify-between gap-2 py-3 sm:gap-4">
        {/* min-w-0 + a fluid size so a long brand wraps to at most two lines.
            "Ballarat Restumping Kings" at the old fixed 0.95rem broke to three
            lines at 360px and tripled the height of the sticky header, on the
            width most of this traffic arrives at. Brand names in this network
            run long by design (city + service + suffix), so the header has to
            absorb them rather than assume a short one — clamp scales down to
            the narrowest phones and stops at the desktop size. */}
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 font-extrabold tracking-tight text-foreground"
          onClick={() => setOpen(false)}
        >
          {SITE.homepage?.style === "grounded" ? (
            <svg aria-hidden="true" viewBox="0 0 36 36" className="h-9 w-9 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
              <path d="M5 15 18 5l13 10M9 15v9h18v-9M6 24h24M10 25v6m8-6v6m8-6v6M5 32h26" />
            </svg>
          ) : <span aria-hidden className="h-6 w-1.5 shrink-0 rounded-full bg-accent" />}
          <span className="text-[clamp(0.72rem,3vw,1rem)] leading-tight">
            {SITE.brandName}
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-6 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted transition hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          {SITE.phoneDisplay && (
            <a href={telHref()} className="btn btn--ghost text-sm">
              {SITE.phoneDisplay}
            </a>
          )}
          <Link href={quoteHref} className="btn btn--accent text-sm">
            Get a Quote
          </Link>
        </div>

        {/* Mobile: keep the single highest-value action visible at all times,
            and put navigation behind the toggle. */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link href={quoteHref} className="btn btn--accent px-3 py-2 text-sm">
            Get a Quote
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="btn btn--ghost px-3 py-2"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden
            >
              {open ? (
                <>
                  <path d="M5 5l10 10" />
                  <path d="M15 5L5 15" />
                </>
              ) : (
                <>
                  <path d="M3 6h14" />
                  <path d="M3 10h14" />
                  <path d="M3 14h14" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-nav" className="border-t border-border bg-white lg:hidden">
          <div className="container grid gap-1 py-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 font-medium text-foreground hover:bg-surface"
              >
                {l.label}
              </Link>
            ))}
            {SITE.phoneDisplay && (
              <a
                href={telHref()}
                className="btn btn--ghost mt-2 justify-center"
                onClick={() => setOpen(false)}
              >
                Call {SITE.phoneDisplay}
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
