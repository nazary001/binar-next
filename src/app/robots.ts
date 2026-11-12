import type { MetadataRoute } from "next";

const SITE_URL = "https://binar-2000.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The staff area also answers every request with
        // "X-Robots-Tag: noindex" (next.config.ts).
        disallow: ["/api/", "/admin"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
