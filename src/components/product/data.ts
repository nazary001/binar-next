// Product-page types. The content itself (description, characteristics,
// scent, galleries, related products) is stored per product in MongoDB
// (`products.details`, seeded from src/server/seed/data/catalog.ts) and
// reaches the page as props: src/server/repos/catalog.ts getProductPage.
// Figma "PDP B2C" section (4329:51336).
import type { Product } from "@/components/catalog/data";

// Synchronous lookup of a public product by id (the browser registry,
// catalog/registry.ts, primed by the root layout).
export { findProduct } from "@/components/catalog/registry";

export type SpecRow = { label: string; value: string };

export type ProductDetails = {
  sku: string;
  description: string;
  benefits: string[];
  // «Характеристики» tab — label / value rows.
  characteristics: SpecRow[];
  // «Доставка та оплата» tab — two tables.
  payment: SpecRow[];
  delivery: SpecRow[];
  // «Піраміда запаху» tab.
  scent: { intro: string; top: string; middle: string; base: string };
  // Hero gallery: one image = the single 627-px photo (4329:51358);
  // several = the main 627×413 photo over a row of three thumbnails
  // («Галерея», 4329:51496).
  images: string[];
  // The same for the signed-in partner skin (ProductView mode="b2b"):
  // differs only where the masters draw the product differently there.
  platformImages: string[];
  boughtTogether: { product: Product; benefits: string[] }[];
  series: Product[];
  similar: Product[];
};
