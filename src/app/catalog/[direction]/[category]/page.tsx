/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogClient } from "@/components/catalog/CatalogClient";
import { ArrowBack } from "@/components/catalog/icons";
import {
  CATALOG_DIRECTIONS,
  directionCatalogHref,
  findCategory,
} from "@/components/catalog/data";

export function generateStaticParams() {
  return CATALOG_DIRECTIONS.flatMap((d) =>
    d.carousel.map((c) => ({ direction: d.slug, category: c.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ direction: string; category: string }>;
}): Promise<Metadata> {
  const { direction, category } = await params;
  const dir = CATALOG_DIRECTIONS.find((d) => d.slug === direction);
  const card = dir && findCategory(dir, category);
  if (!dir || !card) return {};
  return {
    title: `${card.label} — ${dir.title}`,
    description: `${card.label} у каталозі Binar 2000 (${dir.title.toLowerCase()}). B2B-постачання з кастомізацією під бренд.`,
    alternates: {
      canonical: `/catalog/${dir.slug}/${card.slug}`,
    },
  };
}

// Figma «Категорія» (3685:48403): the subcategory landing inside a
// direction — a four-level breadcrumb (Головна / Каталог / <напрям> /
// <категорія>), the subcategory H1, a full-content-width 640-px
// rounded hero photo (the subcategory's own image band-cropped), then
// the product listing pinned to this subcategory 148 px below.
export default async function CatalogCategoryPage({
  params,
}: {
  params: Promise<{ direction: string; category: string }>;
}) {
  const { direction, category } = await params;
  const dir = CATALOG_DIRECTIONS.find((d) => d.slug === direction);
  const card = dir ? findCategory(dir, category) : undefined;
  if (!dir || !card) notFound();

  return (
    <div className="lg-pad-x px-6 sm:px-10">
      <section className="flex flex-col gap-8 pt-12 lg:gap-12 lg:pt-[72px]">
        {/* Breadcrumb (Figma 3936:42928): Каталог and the direction are
            neutral intermediate crumbs, the subcategory is the orange
            current one. */}
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className="group flex items-center gap-4">
            <span className="flex size-[40px] shrink-0 items-center justify-center rounded-[26px] border border-neutral-900 text-neutral-900 transition-colors duration-300 group-hover:border-brand group-hover:bg-brand group-hover:text-white">
              <ArrowBack className="w-[20px]" />
            </span>
            <span className="text-[16px] font-semibold leading-[22px] tracking-[0.16px] text-neutral-800 transition-colors duration-300 group-hover:text-brand lg:text-[18px] lg:tracking-[0.18px]">
              Головна
            </span>
          </Link>
          <span className="text-[18px] font-semibold leading-[22px] text-stroke-subtle">
            /
          </span>
          <Link
            href="/catalog"
            className="cursor-pointer text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
          >
            Каталог
          </Link>
          <span className="text-[18px] font-semibold leading-[22px] text-stroke-subtle">
            /
          </span>
          <Link
            href={directionCatalogHref(dir)}
            className="cursor-pointer text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
          >
            {dir.title}
          </Link>
          <span className="text-[18px] font-semibold leading-[22px] text-stroke-subtle">
            /
          </span>
          <span className="text-button-md text-brand">{card.label}</span>
        </div>

        <h1 className="text-h1 text-neutral-900">{card.label}</h1>
      </section>

      {/* Category hero — Figma Rectangle 116 (3685:49121): the
          content-width 640-px rounded-40 photo. The master band-crops
          the subcategory's own carousel photo to the wide box;
          object-cover reproduces that framing at the site's 1180-px
          content width. */}
      <section className="mt-12 lg:mt-20">
        <div className="relative h-[240px] w-full overflow-clip rounded-[32px] sm:h-[320px] lg:h-[640px] lg:rounded-[40px]">
          {card.bg && (
            <span
              aria-hidden
              className="absolute inset-0"
              style={{ background: card.bg }}
            />
          )}
          <img
            src={card.image}
            alt={card.label}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
        </div>
      </section>

      <section className="mt-[60px] lg:mt-[148px]">
        {/* CatalogClient reads the ?brand filter via useSearchParams,
            which requires a Suspense boundary. */}
        <Suspense>
          <CatalogClient direction={dir} fixedSubcategory={card.label} />
        </Suspense>
      </section>
    </div>
  );
}
