import type { MetadataRoute } from "next";
import { CATALOG_DIRECTIONS, productHref } from "@/components/catalog/data";
import { ALL_PRODUCTS } from "@/components/product/data";
import { CATEGORIES as MATERIAL_CATEGORIES } from "@/components/materials/data";

const SITE_URL = "https://binar-2000.com";

export default function sitemap(): MetadataRoute.Sitemap {
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
  // Product pages (/catalog/<direction>/<category>/<id>).
  const productPages: MetadataRoute.Sitemap = ALL_PRODUCTS.map((p) => ({
    url: `${SITE_URL}${productHref(p)}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  // Materials library (/materials/<category>).
  const materialPages: MetadataRoute.Sitemap = MATERIAL_CATEGORIES.map((c) => ({
    url: `${SITE_URL}/materials/${c.slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
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
  ];
}
