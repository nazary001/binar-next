import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CatalogClient } from "@/components/catalog/CatalogClient";
import { CategoryBanners } from "@/components/catalog/CategoryBanners";
import { ArrowBack } from "@/components/catalog/icons";

export const metadata: Metadata = {
  title: "Каталог",
  description:
    "Каталог товарів Binar 2000: усе для готелів, засоби індивідуального захисту, засоби та інвентар для прибирання. B2B-постачання з кастомізацією під бренд.",
  alternates: {
    canonical: "/catalog",
  },
};

// Figma «Каталог :: картки товарів :: фільтри не застосовані»
// (3603:11640): breadcrumb + H1, three category banners, the search /
// view-controls block and the product grid with pagination. The
// vertical rhythm follows the master: 72 header→breadcrumb, 48 to the
// H1, 80 to the banners, 148 to the search block, grid rows on an
// 80-px cadence.
export default function CatalogPage() {
  return (
    <div className="lg-pad-x px-6 sm:px-10">
      <section className="flex flex-col gap-8 pt-12 lg:gap-12 lg:pt-[72px]">
        {/* Breadcrumb — the same Back-button recipe as the blog article
            hero (shared Figma component 2670:6334). */}
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
          <span className="text-button-md text-brand">Каталог</span>
        </div>

        <h1 className="text-h1 text-neutral-900">Каталог</h1>
      </section>

      <section className="mt-12 lg:mt-20">
        <CategoryBanners />
      </section>

      <section className="mt-[60px] lg:mt-[148px]">
        {/* CatalogClient reads the ?sub/?brand filters via
            useSearchParams, which requires a Suspense boundary. */}
        <Suspense>
          <CatalogClient />
        </Suspense>
      </section>
    </div>
  );
}
