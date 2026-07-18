import { ImageResponse } from "next/og";
import { SITE } from "@/site.config";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Generated favicon: first letter of the service on the brand colour. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: SITE.theme.primary,
          color: "#ffffff",
          fontSize: 40,
          fontWeight: 700,
          borderRadius: 12,
          fontFamily: "sans-serif",
        }}
      >
        {SITE.service.name.charAt(0)}
      </div>
    ),
    size
  );
}
