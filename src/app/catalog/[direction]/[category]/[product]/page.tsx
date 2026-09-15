import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CATALOG_DIRECTIONS,
  findCategory,
  productHref,
  type Product,
} from "@/components/catalog/data";
import { ALL_PRODUCTS, findProduct, getProductDetails } from "@/components/product/data";
import { ProductPageView } from "@/components/product/ProductPageView";

// A product has exactly one canonical path (productHref); any other
// direction/category pair in the URL is a 404, not a duplicate page.
function belongsHere(product: Product, direction: string, category: string) {
  return productHref(product) === `/catalog/${direction}/${category}/${product.id}`;
}

export function generateStaticParams() {
  return ALL_PRODUCTS.map((p) => {
    const [, , direction, category, product] = productHref(p).split("/");
    return { direction, category, product };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ direction: string; category: string; product: string }>;
}): Promise<Metadata> {
  const { direction, category, product: productId } = await params;
  const dir = CATALOG_DIRECTIONS.find((d) => d.slug === direction);
  const card = dir && findCategory(dir, category);
  const product = findProduct(productId);
  if (!dir || !card || !product || !belongsHere(product, dir.slug, card.slug)) {
    return {};
  }
  return {
    title: `${product.title} — ${card.label}`,
    description: `${product.title} (${product.volume}, ${product.brand}) у каталозі Binar 2000: ${card.label.toLowerCase()}. B2B-постачання з кастомізацією під бренд.`,
    alternates: {
      canonical: `/catalog/${dir.slug}/${card.slug}/${product.id}`,
    },
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
  const product = findProduct(productId);
  if (!dir || !card || !product || !belongsHere(product, dir.slug, card.slug)) {
    notFound();
  }

  const details = getProductDetails(product);

  return <ProductPageView dir={dir} card={card} product={product} details={details} />;
}
