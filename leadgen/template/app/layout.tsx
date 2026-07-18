import { Inter } from "next/font/google";
import "./globals.css";
import { SITE } from "@/site.config";
import { rootMetadata } from "@/lib/seo";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { LocalBusinessSchema } from "@/components/seo";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = rootMetadata();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en-AU"
      className={inter.variable}
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
        <main className="mx-auto max-w-5xl px-4">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
