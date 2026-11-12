import type { NextConfig } from "next";

// The staff area (/admin) and its API must never be indexed, framed or
// leak its URLs through the Referer header. Pages there are dynamic, so
// Next already answers them with no-store.
const ADMIN_HEADERS = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
];

const nextConfig: NextConfig = {
  // Next.js 16 cross-origin protection: dev mode blocks/limits requests
  // from non-localhost origins by default, which can break HMR and asset
  // delivery when previewing on a phone via the LAN IP. Whitelist the
  // current dev machine's LAN address so the phone gets the full dev
  // experience (HMR socket, static chunks, fast refresh).
  allowedDevOrigins: ["192.168.31.8"],
  async headers() {
    return [
      { source: "/admin", headers: ADMIN_HEADERS },
      { source: "/admin/:path*", headers: ADMIN_HEADERS },
      { source: "/api/admin/:path*", headers: ADMIN_HEADERS },
      // The machine-to-machine exchange API (BAS and other systems).
      { source: "/api/integrations/:path*", headers: ADMIN_HEADERS },
    ];
  },
};

export default nextConfig;
