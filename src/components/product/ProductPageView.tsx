"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { BackCrumb, Slash } from "@/components/ui/Breadcrumb";
import { FIGMA_TEXT_BOX } from "@/components/catalog/textBox";
import {
  directionCatalogHref,
  type CatalogDirection,
  type Product,
  type SubcategoryCard,
} from "@/components/catalog/data";
import { BoughtTogether } from "./BoughtTogether";
import { ProductGridSection } from "./ProductGridSection";
import { ProductView } from "./ProductView";
import type { ProductDetails } from "./data";

// The product page in its two skins. PublicView is the markup the
// server route always rendered (Figma «PDP B2C» 4329:51336); the
// PlatformView (Figma «PDP B2B» 4329:56628) takes over inside the
// platform shell once a partner is signed in: a 176-px title block
// (crumb «До каталогу / напрям / категорія / товар», H2-size title),
// the product block on the 40 / 32 gutters (627 photo + 827 info, 32
// above, 64 below), then the dark «Купують разом» band and the white
// «З цієї серії» grid overlapping it by 72 - or, for a «Під замовлення»
// product, the single «Схожі товари в наявності» row (4329:57767).
type Props = {
  dir: CatalogDirection;
  card: SubcategoryCard;
  product: Product;
  details: ProductDetails;
};

const crumb =
  "cursor-pointer text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand";
// Each separator is glued to the crumb that follows it in a nowrap pair,
// so when the breadcrumb wraps on narrow viewports a "/" never strands
// alone at a line edge.
const pair = "inline-flex items-start gap-4";

function PublicView({ dir, card, product, details }: Props) {
  return (
    <>
      <div className="px-6 sm:px-10 lg-shop-pad-x">
        <section className="flex flex-col gap-8 pt-12 lg:gap-12 lg:pt-[72px]">
          {/* Breadcrumb (4329:51342): the shared Back-button recipe, the
              neutral intermediate crumbs and the orange current product.
              The direction (4329:51347 «Усе для готелів») is a plain text
              layer in the master, not a «Text button» like its
              neighbours, so it renders as text without a link. */}
          <nav aria-label="Навігація" className="flex flex-wrap items-center gap-4">
            <BackCrumb href="/" label="Головна" />
            <span className={pair}>
              <Slash />
              <Link href="/catalog" className={crumb} style={FIGMA_TEXT_BOX}>
                Каталог
              </Link>
            </span>
            <span className={pair}>
              <Slash />
              <span className="text-button-md text-neutral-700" style={FIGMA_TEXT_BOX}>{dir.title}</span>
            </span>
            <span className={pair}>
              <Slash />
              <Link href={`/catalog/${dir.slug}/${card.slug}`} className={crumb} style={FIGMA_TEXT_BOX}>
                {card.label}
              </Link>
            </span>
            <span className={pair}>
              <Slash />
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

function PlatformView({ dir, card, product, details }: Props) {
  const preorder = Boolean(product.preorder) || !product.available;
  return (
    <div className="flex flex-col">
      <section className="flex flex-col gap-6 px-6 py-6 lg:py-8 lg:pl-10 lg:pr-8">
        {/* Crumb (4329:56638): «До каталогу» back button, the direction
            and the category as neutral crumbs, the product in orange. */}
        <nav aria-label="Навігація" className="flex flex-wrap items-center gap-4">
          <BackCrumb href="/catalog" label="До каталогу" />
          <span className={pair}>
            <Slash />
            <Link href={directionCatalogHref(dir)} className={crumb} style={FIGMA_TEXT_BOX}>
              {dir.title}
            </Link>
          </span>
          <span className={pair}>
            <Slash />
            <Link href={`/catalog/${dir.slug}/${card.slug}`} className={crumb} style={FIGMA_TEXT_BOX}>
              {card.label}
            </Link>
          </span>
          <span className={pair}>
            <Slash />
            <span className="text-button-md text-brand" aria-current="page">
              {product.title}
            </span>
          </span>
        </nav>
        <h1 className="text-[32px] font-bold leading-9 tracking-[-0.64px] text-neutral-900 lg:text-[44px] lg:leading-[48px] lg:tracking-[-0.88px]">
          {product.title}
        </h1>
      </section>

      <section className="px-6 pt-6 lg:pl-10 lg:pr-8 lg:pt-8">
        <ProductView product={product} details={details} mode="b2b" />
      </section>

      {preorder ? (
        <ProductGridSection
          id="similar"
          title="Схожі товари в наявності"
          cta={{ label: "Переглянути всі", href: `/catalog/${dir.slug}/${card.slug}` }}
          products={details.similar}
          mode="b2b"
          headGap="lg"
        />
      ) : (
        <>
          <BoughtTogether items={details.boughtTogether} mode="b2b" />
          <ProductGridSection
            id="series"
            title="З цієї серії"
            cta={{ label: "Перейти в каталог", href: directionCatalogHref(dir) }}
            products={details.series}
            mode="b2b"
            card="b2c"
            className="relative -mt-[52px] rounded-t-[32px] bg-white sm:-mt-[72px] sm:rounded-t-[48px] lg:rounded-t-[68px]"
          />
        </>
      )}
    </div>
  );
}

export function ProductPageView(props: Props) {
  const { user } = useAuth();
  return user?.type === "b2b" ? <PlatformView {...props} /> : <PublicView {...props} />;
}
