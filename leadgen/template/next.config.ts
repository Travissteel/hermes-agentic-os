import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: false,

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

  // Note: apex→www redirect is a per-zone Cloudflare Redirect Rule (set when
  // the custom domain is attached — see LAUNCH-CHECKLIST.md). Canonical URLs
  // always use the www host — see lib/seo.ts.
};

export default nextConfig;
