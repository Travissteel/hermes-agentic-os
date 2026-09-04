import { SITE } from "@/site.config";
import { telHref } from "@/components/call-button";

/**
 * Thin bar above the header. Renders nothing without `announcement` in the
 * config, and the phone half drops out on sites that have no number yet.
 */
export function AnnouncementBar() {
  if (!SITE.announcement) return null;

  return (
    <div className="announce-bar">
      <div className="container">
        <p>
          {SITE.announcement}
          {SITE.phoneDisplay && (
            <>
              {" "}
              <a href={telHref()} className="font-semibold underline">
                {SITE.phoneDisplay}
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
