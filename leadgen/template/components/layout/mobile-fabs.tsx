import Link from "next/link";
import { SITE } from "@/site.config";
import { telHref } from "@/components/call-button";
import { Icon } from "@/components/icons";

/**
 * Sticky call + quote buttons, phone widths only (see `.fabs` in globals.css).
 *
 * The quote button is a plain link to /contact rather than a modal. A dialog
 * would need a client component and its hydration cost on every page, to save
 * one navigation on a site whose whole job is getting the form filled — and
 * the anchor works with JS disabled and is crawlable.
 */
export function MobileFabs() {
  return (
    <div className="fabs">
      {SITE.phoneDisplay && (
        <a
          href={telHref()}
          aria-label={`Call ${SITE.phoneDisplay}`}
          className="fab bg-primary text-white"
        >
          <Icon name="phone" className="h-6 w-6" />
        </a>
      )}
      <Link
        href="/contact"
        aria-label="Get a free quote"
        className="fab bg-accent text-on-accent"
      >
        <Icon name="clipboard" className="h-6 w-6" />
      </Link>
    </div>
  );
}
