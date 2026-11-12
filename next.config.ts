import type { NextConfig } from "next";

// Sent with every answer of the site (pages, files, API):
// - a file is only ever treated as the type it is served with;
// - a link that leaves the site tells the other side the origin only;
// - no page, and nothing embedded in one, may ask for the device features
//   the site does not use;
// - only the site itself may show its pages in a frame (clickjacking).
//
// A Content-Security-Policy is NOT in these lists: a header set here
// replaces the one a route sets itself, and a file of the media library
// answers with its own sandboxing policy (src/server/media/store.ts) that
// must reach the browser. The policies below are therefore given to pages
// only, never to /api.
const SITE_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(), bluetooth=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), hid=(), magnetometer=(), microphone=(), midi=(), payment=(), serial=(), usb=()",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];
const SITE_PAGE_POLICY = [{ key: "Content-Security-Policy", value: "frame-ancestors 'self'" }];

// The staff area (/admin) and its API must never be indexed, framed or
// leak its URLs through the Referer header. Pages there are dynamic, so
// Next already answers them with no-store. These rules come after the
// general one and repeat its keys with stricter values (the later rule
// wins). The pages of the panel get their full Content-Security-Policy,
// with a per-request nonce, from src/proxy.ts; ADMIN_PAGE_POLICY is the
// fallback if the proxy ever does not run.
const ADMIN_HEADERS = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
];
const ADMIN_PAGE_POLICY = [{ key: "Content-Security-Policy", value: "frame-ancestors 'none'" }];

const nextConfig: NextConfig = {
  // No "X-Powered-By: Next.js": the answer does not name what serves it.
  poweredByHeader: false,
  // The site and the staff area are two documents (two root layouts), so
  // the page of an unknown address is a file of its own:
  // src/app/global-not-found.tsx. Next still calls the convention
  // experimental; without the flag an unknown address gets Next's bare
  // built-in page, with no header or footer of the site around it.
  experimental: { globalNotFound: true },
  // Next.js 16 cross-origin protection: dev mode blocks/limits requests
  // from non-localhost origins by default, which can break HMR and asset
  // delivery when previewing on a phone via the LAN IP. Whitelist the
  // current dev machine's LAN address so the phone gets the full dev
  // experience (HMR socket, static chunks, fast refresh).
  allowedDevOrigins: ["192.168.31.8"],
  async headers() {
    return [
      { source: "/:path*", headers: SITE_HEADERS },
      // Every address except /api/...: the pages.
      { source: "/((?!api/).*)", headers: SITE_PAGE_POLICY },
      { source: "/admin", headers: [...ADMIN_HEADERS, ...ADMIN_PAGE_POLICY] },
      { source: "/admin/:path*", headers: [...ADMIN_HEADERS, ...ADMIN_PAGE_POLICY] },
      { source: "/api/admin/:path*", headers: ADMIN_HEADERS },
      // The machine-to-machine exchange API (BAS and other systems).
      { source: "/api/integrations/:path*", headers: ADMIN_HEADERS },
    ];
  },
};

export default nextConfig;
