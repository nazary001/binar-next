"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { BackCrumb, Slash } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import { CatalogClient } from "./CatalogClient";
import { CategoryBanners } from "./CategoryBanners";
import { SubcategoryCarousel } from "./SubcategoryCarousel";
import { FIGMA_TEXT_BOX } from "./textBox";
import {
  directionCatalogHref,
  type CatalogDirection,
  type SubcategoryCard,
} from "./data";

// The three catalog pages in their two skins. The public (B2C) markup
// is the one the server pages always rendered; the B2B skin (Figma
// «Каталог :: B2B» 4329:56124 - «Напрям» 4329:56219 is the reference
// frame) takes over inside the platform shell once a partner is signed
// in: content blocks with their own 32-px vertical rhythm on the
// 40 / 32 side gutters of the 12-column «B2B Platform» grid, the «До
// каталогу» back crumb, the H2 title with its tagline, the «Мій
// асортимент» link and the B2B listing.
type PageKind =
  | { kind: "root" }
  | { kind: "direction"; dir: CatalogDirection }
  | { kind: "category"; dir: CatalogDirection; card: SubcategoryCard };

// Every crumb piece takes its whole-pixel Figma box (FIGMA_TEXT_BOX), so
// the 16-px gaps put each «/» and label on the Figma x (B2C 226 / 250 /
// 329 / 353 / 488 / 512, B2B 325 / 349 / 484 / 508).
function Crumb({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={FIGMA_TEXT_BOX}
      className="cursor-pointer text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
    >
      {label}
    </Link>
  );
}

function Current({ label }: { label: string }) {
  return (
    <span style={FIGMA_TEXT_BOX} className="text-button-md text-brand">
      {label}
    </span>
  );
}

// A crumb that is not a link: the B2C «Категорія» frame (4329:39413)
// draws the direction as a plain text layer (the other crumbs are Text
// button instances), in the Text button's 16/22 Medium #4a4a4c.
function PlainCrumb({ label }: { label: string }) {
  return (
    <span style={FIGMA_TEXT_BOX} className="text-button-md text-neutral-700">
      {label}
    </span>
  );
}

// The shared Back button and «/» wrapped in their whole-pixel Figma
// boxes (130 / 165 and 8 wide).
function Back({ href, label }: { href: string; label: string }) {
  return (
    <span style={FIGMA_TEXT_BOX} className="flex shrink-0">
      <BackCrumb href={href} label={label} />
    </span>
  );
}

function CrumbSlash() {
  return (
    <span style={FIGMA_TEXT_BOX} className="flex shrink-0">
      <Slash />
    </span>
  );
}

// «Категорія» hero (Rectangle 116: B2C 4329:39421 1550 x 640, B2B
// 4329:56334 1534 x 640, r40). The category's dedicated photo when it
// has one, else its carousel photo (the full-size file) as a centred
// cover.
function CategoryHero({ card }: { card: SubcategoryCard }) {
  const image = card.hero?.image ?? card.fullImage;
  return (
    <div className="relative h-[240px] w-full overflow-clip rounded-[32px] sm:h-[320px] lg:h-[640px] lg:rounded-[40px]">
      {!card.hero && card.bg && <span aria-hidden className="absolute inset-0" style={{ background: card.bg }} />}
      <img
        src={image}
        alt={card.label}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 size-full object-cover"
        style={card.hero?.position ? { objectPosition: card.hero.position } : undefined}
      />
    </div>
  );
}

// ---------------------------------------------------------------- B2C

function PublicView({ page }: { page: PageKind }) {
  const dir = page.kind === "root" ? undefined : page.dir;
  const card = page.kind === "category" ? page.card : undefined;
  const title = page.kind === "root" ? "Каталог" : page.kind === "direction" ? page.dir.title : page.card.label;

  return (
    <div className="px-6 sm:px-10 lg-shop-pad-x">
      <section className="flex flex-col gap-8 pt-12 lg:gap-12 lg:pt-[72px]">
        <div className="flex flex-wrap items-center gap-4">
          <Back href="/" label="Головна" />
          <CrumbSlash />
          {page.kind === "root" ? <Current label="Каталог" /> : <Crumb href="/catalog" label="Каталог" />}
          {dir && (
            <>
              <CrumbSlash />
              {card ? <PlainCrumb label={dir.title} /> : <Current label={dir.title} />}
            </>
          )}
          {card && (
            <>
              <CrumbSlash />
              <Current label={card.label} />
            </>
          )}
        </div>
        <h1 className="text-h1 text-neutral-900">{title}</h1>
      </section>

      {page.kind === "root" && (
        <section className="mt-12 lg:mt-20">
          <CategoryBanners />
        </section>
      )}
      {page.kind === "direction" && (
        <section className="mt-8 lg:mt-12">
          <SubcategoryCarousel direction={page.dir} />
        </section>
      )}
      {page.kind === "category" && (
        <section className="mt-12 lg:mt-20">
          <CategoryHero card={page.card} />
        </section>
      )}

      <section className="mt-[60px] lg:mt-[148px]">
        <Suspense>
          <CatalogClient direction={dir} fixedSubcategory={card?.label} />
        </Suspense>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- B2B

function PlatformTitle({
  crumb,
  title,
  tagline,
}: {
  crumb: ReactNode | null;
  title: string;
  tagline?: string;
}) {
  return (
    <section className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-center lg:gap-[10px] lg:py-8 lg:pl-10 lg:pr-8">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {crumb && <div className="flex flex-wrap items-center gap-4">{crumb}</div>}
        <div className="flex flex-col gap-2">
          <h1 className="text-[32px] font-bold leading-9 tracking-[-0.64px] text-neutral-900 lg:text-[44px] lg:leading-[48px] lg:tracking-[-0.88px]">
            {title}
          </h1>
          {tagline && <p className="text-[14px] leading-6 text-neutral-500">{tagline}</p>}
        </div>
      </div>
      {/* «Мій асортимент» (4329:56235) opens the assortment page
          (Figma 4209:74148). */}
      <Button href="/assortment" size="responsive" className="shrink-0">
        Мій асортимент
      </Button>
    </section>
  );
}

function PlatformView({ page }: { page: PageKind }) {
  const dir = page.kind === "root" ? undefined : page.dir;
  const card = page.kind === "category" ? page.card : undefined;

  // Crumbs per frame: the root («Каталог :: картки товарів» 4329:56125)
  // has none (144-px title block), the direction (4329:56219) goes
  // «До каталогу / <напрям>», the category (4329:56314) «До каталогу /
  // <напрям> / <категорія>».
  const crumb =
    page.kind === "root" ? null : page.kind === "direction" ? (
      <>
        <Back href="/catalog" label="До каталогу" />
        <CrumbSlash />
        <Current label={page.dir.title} />
      </>
    ) : (
      <>
        <Back href="/catalog" label="До каталогу" />
        <CrumbSlash />
        <Crumb href={directionCatalogHref(page.dir)} label={page.dir.title} />
        <CrumbSlash />
        <Current label={page.card.label} />
      </>
    );

  const title = page.kind === "root" ? "Каталог" : page.kind === "direction" ? page.dir.title : page.card.label;
  const tagline =
    page.kind === "root"
      ? "Усі напрями, ціни вашого договору та швидке замовлення"
      : page.kind === "direction"
        ? page.dir.tagline
        : page.dir.title;

  return (
    <div className="flex flex-col">
      <PlatformTitle crumb={crumb} title={title} tagline={tagline} />

      {page.kind === "root" && (
        <section className="px-6 py-6 lg:py-8 lg:pl-10 lg:pr-8">
          <CategoryBanners gap="b2b" />
        </section>
      )}
      {page.kind === "direction" && (
        <section className="px-6 py-6 lg:px-2 lg:py-8">
          <SubcategoryCarousel direction={page.dir} pagers="inline" />
        </section>
      )}
      {page.kind === "category" && (
        <section className="px-6 py-6 lg:py-8 lg:pl-10 lg:pr-8">
          {/* «Категорія» 4329:56334: the 1534 x 640 rounded-40 hero. */}
          <CategoryHero card={page.card} />
        </section>
      )}

      <section className="px-6 py-6 lg:py-8 lg:pl-10 lg:pr-8">
        <Suspense>
          <CatalogClient direction={dir} fixedSubcategory={card?.label} mode="b2b" />
        </Suspense>
      </section>
    </div>
  );
}

export function CatalogPageView({ page }: { page: PageKind }) {
  const { user } = useAuth();
  return user?.type === "b2b" ? <PlatformView page={page} /> : <PublicView page={page} />;
}
