import { ImageResponse } from "next/og";
import { SITE, CORE_PHRASE } from "@/site.config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${CORE_PHRASE} — free quotes`;

/**
 * Generated OG image so every site ships with a real, branded social image
 * (the BSF missing-og-asset lesson) without needing static PNG assets.
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: `linear-gradient(135deg, ${SITE.theme.primary} 0%, #0f172a 100%)`,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>
          {SITE.service.name}
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>
          {SITE.location.city}
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 32,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          {`Free quotes from local pros — ${SITE.brandName}`}
        </div>
      </div>
    ),
    size
  );
}
