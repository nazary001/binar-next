import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogClient } from "@/components/catalog/CatalogClient";
import { SubcategoryCarousel } from "@/components/catalog/SubcategoryCarousel";
import { ArrowBack } from "@/components/catalog/icons";
import { CATALOG_DIRECTIONS } from "@/components/catalog/data";

export function generateStaticParams() {
  return CATALOG_DIRECTIONS.map((d) => ({ direction: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ direction: string }>;
}): Promise<Metadata> {
  const { direction } = await params;
  const dir = CATALOG_DIRECTIONS.find((d) => d.slug === direction);
  if (!dir) return {};
  return {
    title: `${dir.title} — Каталог`,
    description: `Каталог товарів Binar 2000: ${dir.title.toLowerCase()}. B2B-постачання з кастомізацією під бренд.`,
    alternates: {
      canonical: `/catalog/${dir.slug}`,
    },
  };
}

// Figma «Напрям» (3682:46834): the catalog listing scoped to one
// direction — a three-level breadcrumb (Головна / Каталог / <напрям>),
// the direction H1, the subcategory carousel with side pagers (48 px
// under the H1 block), then the familiar search / controls / grid
// stack 148 px below the carousel.
export default async function CatalogDirectionPage({
  params,
}: {
  params: Promise<{ direction: string }>;
}) {
  const { direction } = await params;
  const dir = CATALOG_DIRECTIONS.find((d) => d.slug === direction);
  if (!dir) notFound();

  return (
    <div className="lg-pad-x px-6 sm:px-10">
      <section className="flex flex-col gap-8 pt-12 lg:gap-12 lg:pt-[72px]">
        {/* Breadcrumb — Back-button recipe shared with /catalog and the
            blog article hero; «Каталог» is an intermediate crumb
            (#4a4a4c, hover → brand), the direction name is the orange
            current crumb (Figma 3682:47573). */}
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
          <span className="text-button-md text-brand">{dir.title}</span>
        </div>

        <h1 className="text-h1 text-neutral-900">{dir.title}</h1>
      </section>

      <section className="mt-8 lg:mt-12">
        <SubcategoryCarousel direction={dir} />
      </section>

      <section className="mt-[60px] lg:mt-[148px]">
        {/* CatalogClient reads the ?sub/?brand filters via
            useSearchParams, which requires a Suspense boundary. */}
        <Suspense>
          <CatalogClient direction={dir} />
        </Suspense>
      </section>
    </div>
  );
}
