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
      className={
        compact
          ? "rounded-lg border border-primary px-4 py-2 font-semibold text-primary hover:bg-primary hover:text-white"
          : "inline-block rounded-lg bg-accent px-6 py-3 text-lg font-bold text-white shadow hover:opacity-90"
      }
    >
      {compact ? `Call ${SITE.phoneDisplay}` : `📞 Call Now — ${SITE.phoneDisplay}`}
    </a>
  );
}
