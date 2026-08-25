import Image from "next/image";
import type { SiteImage as SiteImageData } from "@/site.config";

/**
 * Renders an image from public/images.
 *
 * Images are unoptimised at build time (see next.config.ts) because Next's
 * optimiser needs the paid Cloudflare Images product on Workers. That makes
 * the intrinsic width/height in the config load-bearing: they are the only
 * thing reserving space before the file arrives, and without them every image
 * on the page causes a layout shift as it loads.
 *
 * Returns null when there is no image, so every call site can render this
 * unconditionally and a site with no imagery simply collapses back to text.
 */
export function SiteImage({
  image,
  className = "",
  sizes,
  priority = false,
}: {
  image?: SiteImageData;
  className?: string;
  /** Tells the browser the rendered width so it doesn't over-fetch. */
  sizes?: string;
  /**
   * Set only on the hero. `priority` preloads the file and disables lazy
   * loading — correct for the LCP element, actively harmful anywhere else,
   * because it makes below-the-fold images compete with the copy for
   * bandwidth on the mobile connections most of this traffic arrives on.
   */
  priority?: boolean;
}) {
  if (!image) return null;

  return (
    <Image
      src={`/images/${image.src}`}
      alt={image.alt}
      width={image.width}
      height={image.height}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      className={className}
    />
  );
}
