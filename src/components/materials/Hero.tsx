"use client";

import Link from "next/link";
import { ArrowBack, FilterIcon, MagnifierIcon } from "@/components/catalog/icons";

// Page head of the «Матеріали» pages — Figma 4634:63600 (landing) and
// 4634:64900 (category): 72 px under the header the Back-button crumb
// («Головна» + 18/22 SemiBold #d2d2d2 slashes), 48 to the H1, an
// optional 16/24 #777779 tagline 16 px under it; the search row
// (4634:64314) follows 80 px later: the 495-px «Пошук» field and the
// 52-px black filter button at the far edge, 64 px above the content.

export type Crumb = { href?: string; label: string };

function Slash() {
  return (
    <span className="text-[18px] font-semibold leading-[22px] tracking-[0.18px] text-stroke-subtle">
      /
    </span>
  );
}

export function MaterialsHero({
  crumbs,
  title,
  tagline,
  query,
  onQuery,
  onOpenFilters,
  filtersOpen,
  filtersCount,
}: {
  crumbs: Crumb[];
  title: string;
  tagline?: string;
  query: string;
  onQuery: (value: string) => void;
  onOpenFilters: () => void;
  filtersOpen: boolean;
  filtersCount: number;
}) {
  return (
    <>
      <section className="flex flex-col gap-8 pt-12 lg:gap-12 lg:pt-[72px]">
        <nav aria-label="Навігація" className="flex flex-wrap items-center gap-4">
          <Link href="/" className="group flex items-center gap-4">
            <span className="flex size-[40px] shrink-0 items-center justify-center rounded-[26px] border border-neutral-900 text-neutral-900 transition-colors duration-300 group-hover:border-brand group-hover:bg-brand group-hover:text-white">
              <ArrowBack className="w-[20px]" />
            </span>
            <span className="text-[16px] font-semibold leading-[22px] tracking-[0.16px] text-neutral-800 transition-colors duration-300 group-hover:text-brand lg:text-[18px] lg:tracking-[0.18px]">
              Головна
            </span>
          </Link>
          {crumbs.map((crumb, i) => {
            const current = i === crumbs.length - 1;
            return (
              <span key={crumb.label} className="contents">
                <Slash />
                {current || !crumb.href ? (
                  <span
                    className={`text-button-md ${current ? "text-brand" : "text-neutral-700"}`}
                    aria-current={current ? "page" : undefined}
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="cursor-pointer text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>

        <div className="flex flex-col gap-3 lg:gap-4">
          <h1 className="text-h1 text-neutral-900">{title}</h1>
          {tagline && <p className="text-body-sm text-neutral-500">{tagline}</p>}
        </div>
      </section>

      {/* Search row: the field spans 495 px at the 1710 canvas, the
          filter button sits at the right gutter; both centred in the
          52-px row. */}
      <div className="mt-10 flex items-center justify-between gap-4 lg:mt-20">
        <div className="relative w-full lg:w-[495px]">
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Пошук"
            aria-label={`Пошук: ${title}`}
            className="h-[46px] w-full rounded-[50px] border border-stroke-default bg-white pl-4 pr-12 text-[16px] leading-6 text-neutral-900 outline-none transition-colors duration-200 placeholder:text-neutral-500 focus:border-neutral-800 [&::-webkit-search-cancel-button]:hidden"
          />
          <MagnifierIcon className="pointer-events-none absolute right-4 top-1/2 size-6 -translate-y-1/2 text-neutral-900" />
        </div>
        <button
          type="button"
          aria-label={filtersCount ? `Фільтри, обрано ${filtersCount}` : "Фільтри"}
          aria-expanded={filtersOpen}
          aria-haspopup="dialog"
          onClick={onOpenFilters}
          className="relative flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[26px] bg-neutral-900 text-white transition-opacity duration-200 hover:opacity-85"
        >
          <FilterIcon className="size-6" />
          {filtersCount > 0 && (
            <span
              aria-hidden
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[12px] font-semibold leading-none text-white"
            >
              {filtersCount}
            </span>
          )}
        </button>
      </div>
    </>
  );
}
