import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: false,

  images: {
    // Next's image optimiser needs a running optimisation service. On
    // Cloudflare Workers that means the paid Cloudflare Images product, so we
    // opt out and ship images that are already the right size and format.
    // Files in public/ are served straight from Cloudflare's asset store
    // (see wrangler.jsonc `assets`) — edge-cached, no Worker CPU, no cost.
    // The trade-off is real: an unoptimised 4000px JPEG dropped into public/
    // WILL tank Core Web Vitals, because nothing downstream will rescue it.
    // public/images/README.md documents the pre-compression rules.
    unoptimized: true,
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  // Note: apex→www is handled in middleware.ts, NOT by a Cloudflare Redirect
  // Rule. Attach BOTH www and the apex as Custom Domains on the Worker and the
  // middleware 301s the apex, preserving path and query. This is deliberate:
  // it needs no dashboard step and no Rules scope on CF_API_TOKEN, and it
  // ships with the code so every site in the network behaves identically.
  // Canonical URLs always use the www host — see lib/seo.ts.
};

export default nextConfig;
