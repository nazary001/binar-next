import { NextResponse, type NextRequest } from "next/server";

// The Content-Security-Policy of the staff area (/admin and everything
// under it; the matcher below keeps this file away from every other
// address). The panel is its own document (a separate root
// layout), so entering it is always a full page load that carries this
// policy.
//
// Each answer gets a fresh nonce. Only scripts that carry it may run, plus
// the scripts those load ('strict-dynamic'); Next reads the nonce from the
// request header set here and puts it on its own script tags while it
// renders, which is why the panel is rendered per request
// (src/app/admin/layout.tsx). So an injected inline script, an inline event
// handler or a script from another origin is refused, the page can send
// data only to this site, cannot be framed and cannot post a form
// elsewhere.
//
// What stays open, and why:
// - styles keep 'unsafe-inline': React writes style="" attributes into the
//   server HTML and the mail preview is an inline-styled document; a style
//   cannot run code;
// - pictures may come from any https address: a product photo or a blog
//   cover may point at one (the panel shows what the site shows);
// - blob: for pictures, frames and media: previews of files picked in the
//   browser before they are uploaded.
//
// The public site is static, so no per-request nonce is possible there; it
// gets the general headers of next.config.ts.
const DEV = process.env.NODE_ENV !== "production";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = [
    "default-src 'self'",
    // 'self' only matters to browsers that do not know 'strict-dynamic'.
    // React needs eval in development (it rebuilds server stacks with it).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${DEV ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    // The hot-reload socket of the dev server.
    `connect-src 'self'${DEV ? " ws: wss:" : ""}`,
    "media-src 'self' blob:",
    "frame-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  const headers = new Headers(request.headers);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
