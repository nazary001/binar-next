"use client";

import Link from "next/link";
import { FilterIcon, MagnifierIcon } from "@/components/catalog/icons";
import { BackCrumb, Slash } from "@/components/ui/Breadcrumb";
import { FIGMA_TEXT_BOX } from "@/components/catalog/textBox";

// Page head of the «Матеріали» pages — Figma 4634:63600 (landing) and
// 4634:64900 (category): 72 px under the header the Back-button crumb
// («Головна» + 18/22 SemiBold #d2d2d2 slashes), 48 to the H1, an
// optional 16/24 #777779 tagline 16 px under it; the search row
// (4634:64314) follows 80 px later: the 495-px «Пошук» field and the
// 52-px black filter button at the far edge, 64 px above the content.

export type Crumb = { href?: string; label: string };

// «Search» (3677:40518): the 46-px r50 pill with a 1-px #8e8e8f stroke,
// «Пошук» in 16/24 #777779 and the 24-px #4a4a4c magnifier (the master's
// icon-search-24 fill) 16 px from the right edge; 495 px wide on desktop. The public pages fill it white; the
// partner pages leave it transparent over the #f5f5f5 cabinet panel
// (the B2B frames 4396:11396 / 4378:62920 draw it without a fill).
export function MaterialsSearchField({
  value,
  onChange,
  label,
  surface = "white",
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  surface?: "white" | "none";
}) {
  return (
    <div className="relative w-full lg:w-[495px]">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Пошук"
        aria-label={label}
        className={`h-[46px] w-full rounded-[50px] border border-stroke-default ${surface === "white" ? "bg-white" : "bg-transparent"} pl-4 pr-12 text-[16px] leading-6 text-neutral-900 outline-none transition-colors duration-200 placeholder:text-neutral-500 focus:border-neutral-800 [&::-webkit-search-cancel-button]:hidden`}
      />
      <MagnifierIcon className="pointer-events-none absolute right-4 top-1/2 size-6 -translate-y-1/2 text-neutral-700" />
    </div>
  );
}

// «Icon button» (3677:39698): the 52-px black r26 filter button; the
// orange count badge shows how many filters are on.
export function MaterialsFiltersButton({
  count,
  expanded,
  onClick,
}: {
  count: number;
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={count ? `Фільтри, обрано ${count}` : "Фільтри"}
      aria-expanded={expanded}
      aria-haspopup="dialog"
      onClick={onClick}
      className="relative flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[26px] bg-neutral-900 text-white transition-opacity duration-200 hover:opacity-85"
    >
      <FilterIcon className="size-6" />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[12px] font-semibold leading-none text-white"
        >
          {count}
        </span>
      )}
    </button>
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
          <BackCrumb href="/" label="Головна" />
          {crumbs.map((crumb, i) => {
            const current = i === crumbs.length - 1;
            return (
              <span key={crumb.label} className="contents">
                <Slash />
                {current || !crumb.href ? (
                  <span
                    style={FIGMA_TEXT_BOX}
                    className={`text-button-md ${current ? "text-brand" : "text-neutral-700"}`}
                    aria-current={current ? "page" : undefined}
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    style={FIGMA_TEXT_BOX}
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
        <MaterialsSearchField value={query} onChange={onQuery} label={`Пошук: ${title}`} />
        <MaterialsFiltersButton
          count={filtersCount}
          expanded={filtersOpen}
          onClick={onOpenFilters}
        />
      </div>
    </>
  );
}
