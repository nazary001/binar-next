"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { BackCrumb, ShopCrumbs, Slash } from "@/components/ui/Breadcrumb";
import { CABINET_TITLE } from "@/components/platform/ui/CabinetPageHead";
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
import { SplitTitle } from "./phoneParts";
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

const COPY = {
  sku: "Артикул:",
  trail: "Навігація",
} as const;

// Section titles: phones mix the Light and Bold runs of the masters' H2
// (system 3.1.1); from 640 the plain desktop string.
const TITLE_SERIES = <SplitTitle light="З цієї " bold="серії" />;
const TITLE_SIMILAR = <SplitTitle light="в наявності" bold="Схожі товари " lightFirst={false} />;

// The page-end marker the phone buy bar observes (it steps aside 100 px
// before it, so the last CTA and the footer are never covered).
function PageEnd() {
  return <div data-pdp-end aria-hidden className="lg:hidden" />;
}

// Phones: the SKU caption 16 under the H1 (Body Small #777779), in every
// state (the desktop keeps it inside the description panel).
function SkuCaption({ sku }: { sku: string }) {
  return (
    <p className="whitespace-nowrap text-body-sm text-neutral-500 lg:hidden">
      {COPY.sku} {sku}
    </p>
  );
}

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
        {/* Phones (pdp 2.2, T1): one back crumb to the category, 48, the
            H1 (balanced), 16, the SKU caption; 48 to the photo. */}
        <section className="flex flex-col gap-12 pt-12 lg:gap-12 lg:pt-[72px]">
          {/* Breadcrumb (4329:51342): the shared Back-button recipe, the
              neutral intermediate crumbs and the orange current product.
              The direction (4329:51347 «Усе для готелів») is a plain text
              layer in the master, not a «Text button» like its
              neighbours, so it renders as text without a link. */}
          <ShopCrumbs back={{ href: `/catalog/${dir.slug}/${card.slug}`, label: card.label }} label={COPY.trail}>
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
          </ShopCrumbs>

          <div className="flex flex-col gap-4">
            <h1 className="text-h1 text-neutral-900 max-lg:text-balance">{product.title}</h1>
            <SkuCaption sku={details.sku} />
          </div>
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
            title={TITLE_SERIES}
            cta={{ label: "Перейти в каталог", href: directionCatalogHref(dir) }}
            products={details.series}
            className={
              details.boughtTogether.length > 0
                ? "relative -mt-[72px] rounded-t-[32px] bg-white sm:-mt-[72px] sm:rounded-t-[48px] lg:rounded-t-[68px]"
                : ""
            }
          />
        </>
      ) : (
        <ProductGridSection
          id="similar"
          title={TITLE_SIMILAR}
          cta={{ label: "Переглянути всі", href: `/catalog/${dir.slug}/${card.slug}` }}
          products={details.similar}
        />
      )}
      <PageEnd />
    </>
  );
}

function PlatformView({ dir, card, product, details }: Props) {
  const preorder = Boolean(product.preorder) || !product.available;
  return (
    <div className="flex flex-col">
      <section className="flex flex-col gap-6 px-6 py-6 lg:py-8 lg:pl-10 lg:pr-8 max-lg:gap-12 max-lg:pb-0 max-lg:pt-12">
        {/* Crumb (4329:56638): «До каталогу» back button, the direction
            and the category as neutral crumbs, the product in orange. */}
        <ShopCrumbs back={{ href: `/catalog/${dir.slug}/${card.slug}`, label: card.label }} label={COPY.trail}>
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
        </ShopCrumbs>
        {/* CABINET_TITLE: 30/36 Bold on phones (D9 cabinet titles), the
            44/48 -0.88 desktop title from 640 (system C-27). */}
        <div className="flex flex-col gap-4">
          <h1 className={`${CABINET_TITLE} max-lg:text-balance`}>{product.title}</h1>
          <SkuCaption sku={details.sku} />
        </div>
      </section>

      <section className="px-6 pt-6 lg:pl-10 lg:pr-8 lg:pt-8 max-lg:pt-12">
        <ProductView product={product} details={details} mode="b2b" />
      </section>

      {preorder ? (
        <ProductGridSection
          id="similar"
          title={TITLE_SIMILAR}
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
            title={TITLE_SERIES}
            cta={{ label: "Перейти в каталог", href: directionCatalogHref(dir) }}
            products={details.series}
            mode="b2b"
            card="b2c"
            className={
              details.boughtTogether.length > 0
                ? "relative -mt-[72px] rounded-t-[32px] bg-white sm:-mt-[72px] sm:rounded-t-[48px] lg:rounded-t-[68px]"
                : ""
            }
          />
        </>
      )}
      <PageEnd />
    </div>
  );
}

export function ProductPageView(props: Props) {
  const { user } = useAuth();
  return user?.type === "b2b" ? <PlatformView {...props} /> : <PublicView {...props} />;
}
