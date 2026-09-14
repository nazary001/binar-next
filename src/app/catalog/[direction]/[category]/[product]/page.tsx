import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowBack } from "@/components/catalog/icons";
import {
  CATALOG_DIRECTIONS,
  directionCatalogHref,
  findCategory,
  productHref,
  type Product,
} from "@/components/catalog/data";
import { ALL_PRODUCTS, findProduct, getProductDetails } from "@/components/product/data";
import { BoughtTogether } from "@/components/product/BoughtTogether";
import { ProductGridSection } from "@/components/product/ProductGridSection";
import { ProductView } from "@/components/product/ProductView";

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
// own 80.
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
  const crumb =
    "cursor-pointer text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand";
  // Each separator is glued to the crumb that follows it in a nowrap pair, so
  // when the breadcrumb wraps on narrow viewports a "/" never strands alone at
  // a line edge. The 16-px gaps match the standalone-slash spacing exactly, so
  // the desktop row is unchanged.
  const slash = (
    <span
      aria-hidden
      className="text-[18px] font-semibold leading-[22px] text-stroke-subtle"
    >
      /
    </span>
  );
  // The slash and its crumb are separate flex children, so the slash stays
  // glued to the crumb's first line while a long crumb may still wrap
  // inside the pair on narrow phones (no nowrap: at 360 px the category
  // name is wider than the viewport).
  const pair = "inline-flex items-start gap-4";

  return (
    <>
      <div className="px-6 sm:px-10 lg-shop-pad-x">
        <section className="flex flex-col gap-8 pt-12 lg:gap-12 lg:pt-[72px]">
          {/* Breadcrumb (4329:51342): the shared Back-button recipe, three
              neutral intermediate crumbs and the orange current product. */}
          <nav aria-label="Навігація" className="flex flex-wrap items-center gap-4">
            <Link href="/" className="group flex items-center gap-4">
              <span className="flex size-[40px] shrink-0 items-center justify-center rounded-[26px] border border-neutral-900 text-neutral-900 transition-colors duration-300 group-hover:border-brand group-hover:bg-brand group-hover:text-white">
                <ArrowBack className="w-[20px]" />
              </span>
              <span className="text-[16px] font-semibold leading-[22px] tracking-[0.16px] text-neutral-800 transition-colors duration-300 group-hover:text-brand lg:text-[18px] lg:tracking-[0.18px]">
                Головна
              </span>
            </Link>
            <span className={pair}>
              {slash}
              <Link href="/catalog" className={crumb}>
                Каталог
              </Link>
            </span>
            <span className={pair}>
              {slash}
              <Link href={directionCatalogHref(dir)} className={crumb}>
                {dir.title}
              </Link>
            </span>
            <span className={pair}>
              {slash}
              <Link href={`/catalog/${dir.slug}/${card.slug}`} className={crumb}>
                {card.label}
              </Link>
            </span>
            <span className={pair}>
              {slash}
              <span className="text-button-md text-brand" aria-current="page">
                {product.title}
              </span>
            </span>
          </nav>

          <h1 className="text-h1 text-neutral-900">{product.title}</h1>
        </section>

        <div className="mt-12 lg:mt-20">
          <ProductView product={product} details={details} />
        </div>
      </div>

      {product.available ? (
        <>
          <BoughtTogether items={details.boughtTogether} />
          <ProductGridSection
            id="series"
            title="З цієї серії"
            cta={{ label: "Перейти в каталог", href: directionCatalogHref(dir) }}
            products={details.series}
            className="relative -mt-[52px] rounded-t-[32px] bg-white sm:-mt-[72px] sm:rounded-t-[48px] lg:rounded-t-[68px]"
          />
        </>
      ) : (
        <ProductGridSection
          id="similar"
          title="Схожі товари в наявності"
          cta={{ label: "Переглянути всі", href: `/catalog/${dir.slug}/${card.slug}` }}
          products={details.similar}
        />
      )}
    </>
  );
}
