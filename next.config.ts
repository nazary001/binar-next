import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16 cross-origin protection: dev mode blocks/limits requests
  // from non-localhost origins by default, which can break HMR and asset
  // delivery when previewing on a phone via the LAN IP. Whitelist the
  // current dev machine's LAN address so the phone gets the full dev
  // experience (HMR socket, static chunks, fast refresh).
  allowedDevOrigins: ["192.168.31.8"],
};

export default nextConfig;
