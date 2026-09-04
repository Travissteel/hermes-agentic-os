import { Inter, Oswald, Poppins } from "next/font/google";
import "./globals.css";
import { SITE } from "@/site.config";
import { rootMetadata } from "@/lib/seo";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { MobileFabs } from "@/components/layout/mobile-fabs";
import { LocalBusinessSchema } from "@/components/seo";
import { getAllPosts } from "@/lib/posts";
import { getAllFaqPages } from "@/lib/faq-pages";

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

/** Heading face for the "trade" variant only — same preload reasoning. */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-trade",
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
      className={`${inter.variable} ${variant === "bold" ? oswald.variable : ""} ${
        variant === "trade" ? poppins.variable : ""
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
        {/*
          A hub with no children is an empty page, and linking one sitewide is
          how Google finds it whether or not it is in the sitemap. Both links
          return automatically on the first post / FAQ page.
        */}
        <AnnouncementBar />
        <Navbar
          hasPosts={getAllPosts().length > 0}
          hasFaqPages={getAllFaqPages().length > 0}
        />
        {/*
          <main> is deliberately unconstrained. Each section sets its own
          full-bleed background and wraps its content in .container, which is
          the only way a tinted or inverted band can reach the viewport edge.
          Pages that are plain prose wrap themselves in .container instead.
        */}
        <main>{children}</main>
        <Footer />
        <MobileFabs />
      </body>
    </html>
  );
}
