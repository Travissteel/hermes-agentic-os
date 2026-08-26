"use client";

import { useState } from "react";
import Link from "next/link";
import { SITE } from "@/site.config";
import { telHref } from "@/components/call-button";

const LINKS = [
  { href: "/services", label: "Services" },
  { href: "/areas", label: "Areas" },
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
export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/85 backdrop-blur">
      <nav className="container flex items-center justify-between gap-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-extrabold tracking-tight text-foreground"
          onClick={() => setOpen(false)}
        >
          <span
            aria-hidden
            className="h-6 w-1.5 shrink-0 rounded-full bg-accent"
          />
          <span className="text-[0.95rem] leading-tight sm:text-base">
            {SITE.brandName}
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-6 lg:flex">
          {LINKS.map((l) => (
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
          <Link href="/contact" className="btn btn--accent text-sm">
            Get Quotes
          </Link>
        </div>

        {/* Mobile: keep the single highest-value action visible at all times,
            and put navigation behind the toggle. */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link href="/contact" className="btn btn--accent px-3 py-2 text-sm">
            Get Quotes
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
            {LINKS.map((l) => (
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
