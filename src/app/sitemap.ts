import type { MetadataRoute } from "next";
import { CATALOG_DIRECTIONS } from "@/components/catalog/data";
import { listProductPaths } from "@/server/repos/catalog";
import { getMaterialCategories } from "@/server/repos/materials";
import { getBlogPosts } from "@/server/repos/blog";

const SITE_URL = "https://binar-2000.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const categoryPages: MetadataRoute.Sitemap = CATALOG_DIRECTIONS.flatMap(
    (d) =>
      d.carousel.map((c) => ({
        url: `${SITE_URL}/catalog/${d.slug}/${c.slug}`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
  );
  // Product pages (/catalog/<direction>/<category>/<id>), from the
  // database, in catalog order.
  const productPages: MetadataRoute.Sitemap = (await listProductPaths()).map((p) => ({
    url: `${SITE_URL}/catalog/${p.direction}/${p.category}/${p.product}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  // Materials library (/materials/<category>).
  const materialPages: MetadataRoute.Sitemap = (await getMaterialCategories()).map((c) => ({
    url: `${SITE_URL}/materials/${c.slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  // Blog articles (/blog/<slug>, the same list generateStaticParams uses).
  const blogPages: MetadataRoute.Sitemap = (await getBlogPosts()).map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  // The B2B cabinet (/dashboard, /orders, /profile, /assortment) is
  // noindex and stays out of the sitemap.
  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/catalog`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/catalog/hotels`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/catalog/protect`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/catalog/cleaning`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...categoryPages,
    ...productPages,
    {
      url: `${SITE_URL}/materials`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...materialPages,
    {
      url: `${SITE_URL}/hotels`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/protect`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/cleaning`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/spivpratsya`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...blogPages,
  ];
}
