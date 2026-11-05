"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BackCrumb, ShopCrumbs, Slash } from "@/components/ui/Breadcrumb";
import { FilterButton } from "@/components/ui/FilterButton";
import { SearchField } from "@/components/ui/SearchField";
import { FIGMA_TEXT_BOX } from "@/components/catalog/textBox";

// Page head of the «Матеріали» pages — Figma 4634:63600 (landing) and
// 4634:64900 (category): 72 px under the header the Back-button crumb
// («Головна» + 18/22 SemiBold #d2d2d2 slashes), 48 to the H1, an
// optional 16/24 #777779 tagline 16 px under it; the search row
// (4634:64314) follows 80 px later: the 495-px «Пошук» field and the
// 52-px black filter button at the far edge, 64 px above the content.
// Phones (< 640, materials spec 2.2 / 2.3, template T1): 48 under the bar
// the one-line back crumb to the parent (ShopCrumbs), 48 to the H1 40/42,
// 16 to the 14/20 tagline, 48 to the search row (pill + 8 + 52 disc), the
// applied-filter chips 16 under it (`below`).

const COPY = {
  home: "Головна",
  search: (title: string) => `Пошук: ${title}`,
} as const;

export type Crumb = { href?: string; label: string };

// Search row field width: phones fill the row next to the disc (282 at
// 390); from 640 the master's 495 px, as before.
export const MATERIALS_SEARCH_WIDTH = "w-full min-w-0 lg:w-[495px] lg:min-w-auto";

export function MaterialsHero({
  crumbs,
  title,
  tagline,
  query,
  onQuery,
  onOpenFilters,
  filtersOpen,
  filtersCount,
  below,
}: {
  crumbs: Crumb[];
  title: string;
  tagline?: string;
  query: string;
  onQuery: (value: string) => void;
  onOpenFilters: () => void;
  filtersOpen: boolean;
  filtersCount: number;
  // Phone-only block under the search row (the applied-filter chips).
  below?: ReactNode;
}) {
  // Phones show one crumb: the parent (the last crumb with a link, else
  // the home page); never "/ current" - the H1 repeats it (TR-05, A19).
  const parent = [...crumbs].reverse().find((c) => c.href);
  const back = { href: parent?.href ?? "/", label: parent?.label ?? COPY.home };
  return (
    <>
      <section className="flex flex-col gap-12 pt-12 lg:pt-[72px]">
        <ShopCrumbs back={back}>
          <BackCrumb href="/" label={COPY.home} />
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
        </ShopCrumbs>

        <div className="flex flex-col gap-4">
          <h1 className="text-h1 text-neutral-900 max-lg:text-balance">{title}</h1>
          {tagline && <p className="text-body-sm text-neutral-500">{tagline}</p>}
        </div>
      </section>

      {/* Search row: the field spans 495 px at the 1710 canvas, the
          filter button sits at the right gutter; both centred in the
          52-px row. Phones: 48 under the head, 8 between pill and disc. */}
      <div className="mt-12 flex items-center justify-between gap-2 lg:mt-20 lg:gap-4">
        <SearchField
          value={query}
          onChange={onQuery}
          label={COPY.search(title)}
          className={MATERIALS_SEARCH_WIDTH}
        />
        <FilterButton count={filtersCount} expanded={filtersOpen} onClick={onOpenFilters} badgeDesktop />
      </div>
      {below}
    </>
  );
}
