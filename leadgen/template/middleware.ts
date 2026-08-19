import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Canonical-host redirect. Sends the bare apex (and any non-www host) to the
 * www host with a 301, so www is the single canonical origin — see lib/seo.ts.
 * Preview hosts (*.workers.dev) and local dev are left untouched.
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const bare = host.split(":")[0];
  if (
    bare &&
    !bare.startsWith("www.") &&
    !bare.endsWith("workers.dev") &&
    bare !== "localhost" &&
    bare !== "127.0.0.1"
  ) {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    url.host = "www." + host;
    return NextResponse.redirect(url, 301);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next internals / static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
