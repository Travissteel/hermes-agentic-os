import { SITE } from "@/site.config";

/** tel: href from the display phone (SOP: click-to-call for urgent mobile users). */
export function telHref(): string {
  return `tel:${SITE.phoneDisplay.replace(/[^+\d]/g, "")}`;
}

/**
 * Prominent click-to-call button. Renders nothing until the site has a
 * phone number (e.g. a CallRail tracking number added at rent time).
 */
export function CallButton({ compact = false }: { compact?: boolean }) {
  if (!SITE.phoneDisplay) return null;
  return (
    <a
      href={telHref()}
      className={compact ? "btn btn--ghost text-sm" : "btn btn--accent btn--lg"}
    >
      {!compact && (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
        </svg>
      )}
      {compact ? `Call ${SITE.phoneDisplay}` : `Call ${SITE.phoneDisplay}`}
    </a>
  );
}
