import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CATALOG_DIRECTIONS,
  findCategory,
  productHref,
  type Product,
} from "@/components/catalog/data";
import { ProductPageView } from "@/components/product/ProductPageView";
import { getProductPage, getProductSeo, listProductPaths } from "@/server/repos/catalog";

// A product has exactly one canonical path (productHref); any other
// direction/category pair in the URL is a 404, not a duplicate page.
function belongsHere(product: Product, direction: string, category: string) {
  return productHref(product) === `/catalog/${direction}/${category}/${product.id}`;
}

// Every product's canonical path, from the database (products are read
// through the cached catalog snapshot, src/server/repos/catalog.ts).
export async function generateStaticParams() {
  return listProductPaths();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ direction: string; category: string; product: string }>;
}): Promise<Metadata> {
  const { direction, category, product: productId } = await params;
  const dir = CATALOG_DIRECTIONS.find((d) => d.slug === direction);
  const card = dir && findCategory(dir, category);
  const page = await getProductPage(productId);
  const product = page?.product;
  if (!dir || !card || !page || !product || !belongsHere(product, dir.slug, card.slug)) {
    return {};
  }
  // The SEO tab of the product editor may set either text; an empty one
  // keeps what the page composes itself. The root layout's title template
  // applies to both.
  const seo = await getProductSeo(product.id);
  return {
    title: seo?.title ?? `${product.title} — ${card.label}`,
    description:
      seo?.description ??
      `${product.title} (${product.volume}, ${product.brand}) у каталозі Binar 2000: ${card.label.toLowerCase()}. B2B-постачання з кастомізацією під бренд.`,
    alternates: {
      canonical: `/catalog/${dir.slug}/${card.slug}/${product.id}`,
    },
    // A product hidden in the panel keeps its page for a direct link but
    // stays out of search engines (and of the sitemap); its links to
    // listed products may still be followed.
    ...(page.listed ? {} : { robots: { index: false, follow: true } }),
  };
}

// Figma «Сторінка товару» (PDP B2C section 4329:51336, the 1710-px shop
// frames): a five-level breadcrumb (Головна / Каталог / <напрям> /
// <категорія> / <товар>), the product H1, the photo + info block with
// the description / characteristics / scent / delivery tabs, then the
// dark «Купують разом» band and the white «З цієї серії» grid that
// overlaps it. The out-of-stock master (4329:51763) drops both of
// those for a single «Схожі товари в наявності» row.
//
// Vertical rhythm from the master: 72 header→breadcrumb, 48 to the H1,
// 80 to the product block, 80 under it; every band then opens with its
// own 80. Signed-in partners get the «PDP B2B» skin (4329:56628) instead
// - see ProductPageView.
export default async function ProductPage({
  params,
}: {
  params: Promise<{ direction: string; category: string; product: string }>;
}) {
  const { direction, category, product: productId } = await params;
  const dir = CATALOG_DIRECTIONS.find((d) => d.slug === direction);
  const card = dir ? findCategory(dir, category) : undefined;
  const page = await getProductPage(productId);
  if (!dir || !card || !page || !belongsHere(page.product, dir.slug, card.slug)) {
    notFound();
  }

  const { product, details } = page;

  return <ProductPageView dir={dir} card={card} product={product} details={details} />;
}
