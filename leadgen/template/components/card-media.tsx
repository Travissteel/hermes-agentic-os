import { SiteImage } from "@/components/site-image";
import type { SiteImage as SiteImageData } from "@/site.config";

/**
 * The media band at the top of a sub-service card.
 *
 * Sites rarely have a photo for every sub-service — the network runs five or
 * so per site and stock that satisfies the "objects and places, never people
 * presented as ours" rule is scarce. Rendering nothing for the ones without
 * left ragged rows of half-height cards next to full ones.
 *
 * So the band is always there. Without a photo it falls back to a wash of
 * the site's own two theme colours, which reads as a deliberate surface
 * rather than a missing asset — and costs no bytes.
 */
export function CardMedia({
  image,
  sizes,
}: {
  image?: SiteImageData;
  sizes: string;
}) {
  if (image) {
    return (
      <SiteImage
        image={image}
        sizes={sizes}
        className="h-44 w-full object-cover"
      />
    );
  }

  // Flat colour read as a failed image load once a card grew wide, so the
  // fallback carries a faint diagonal hatch in the site's own accent. It is
  // pure CSS — no request, no layout shift.
  return (
    <div
      aria-hidden
      className="card-media-fallback h-44 w-full bg-gradient-to-br from-primary/12 via-surface to-accent/25"
    />
  );
}
