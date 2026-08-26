import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import { SITE } from "@/site.config";
import { rootMetadata } from "@/lib/seo";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { LocalBusinessSchema } from "@/components/seo";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

/**
 * Heading face for the "bold" variant only. `preload: false` because the
 * other variant never references it — leaving preload on would make every
 * "clean" site pay for a font it does not render.
 */
const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  preload: false,
});

export const metadata = rootMetadata();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const variant = SITE.theme.variant ?? "bold";

  return (
    <html
      lang="en-AU"
      data-variant={variant}
      className={`${inter.variable} ${
        variant === "bold" ? oswald.variable : ""
      }`}
      style={
        {
          "--primary": SITE.theme.primary,
          "--accent": SITE.theme.accent,
        } as React.CSSProperties
      }
    >
      <body>
        <LocalBusinessSchema />
        <Navbar />
        {/*
          <main> is deliberately unconstrained. Each section sets its own
          full-bleed background and wraps its content in .container, which is
          the only way a tinted or inverted band can reach the viewport edge.
          Pages that are plain prose wrap themselves in .container instead.
        */}
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
