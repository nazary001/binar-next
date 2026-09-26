"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  CATEGORIES,
  DIRECTIONS,
  FILES,
  filesCount,
  matchesFilters,
  matchesQuery,
  type Direction,
  type MaterialsFilters,
} from "./data";
import { MaterialsFiltersDrawer } from "./FiltersDrawer";
import { MaterialsHero } from "./Hero";
import { FolderIcon } from "./icons";

// «Матеріали» landing — Figma 4634:63597: the head block with its
// tagline, the search row, then the category cards in four columns
// (363.5 x 162 at 1710, 32-px gutters both ways, 80 px above the
// footer). A card (4634:64377) is a #f8f8f8 r24 tile padded 24: the
// 48-px folder, then 16 px lower the Title/Small ExtraBold name over
// the «9 файлів» count in 16/24 #777779. The landing's filter sheet
// (4635:32986) offers the directions only; a direction narrows every
// count to the files tagged with it, the search matches category and
// file names.
export function MaterialsHome() {
  const [query, setQuery] = useState("");
  const [directions, setDirections] = useState<Direction[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const filters: MaterialsFilters = useMemo(() => ({ directions, types: [] }), [directions]);

  const cards = useMemo(
    () =>
      CATEGORIES.map((category) => {
        const files = FILES.filter(
          (f) => f.category === category.slug && matchesFilters(f, filters),
        );
        const byName = matchesQuery(category.title, query);
        const matching = byName ? files : files.filter((f) => matchesQuery(f.name, query));
        return { category, count: matching.length };
      }).filter((c) => c.count > 0),
    [filters, query],
  );

  const toggle = (_key: string, value: string) => {
    const dir = value as Direction;
    setDirections((list) =>
      list.includes(dir) ? list.filter((d) => d !== dir) : [...list, dir],
    );
  };

  return (
    <div className="px-6 pb-[60px] sm:px-10 lg-shop-pad-x lg:pb-20">
      <MaterialsHero
        crumbs={[{ label: "Матеріали" }]}
        title="Матеріали"
        tagline="Усі необхідні матеріали в одному місці: переглядайте каталоги, технічні карти та інші файли."
        query={query}
        onQuery={setQuery}
        onOpenFilters={() => setDrawerOpen(true)}
        filtersOpen={drawerOpen}
        filtersCount={directions.length}
      />

      <section aria-label="Категорії матеріалів" className="mt-10 lg:mt-16">
        {cards.length === 0 ? (
          <p className="text-body-md text-neutral-500">
            За вашим запитом нічого не знайдено.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {cards.map(({ category, count }) => (
              <li key={category.slug}>
                <Link
                  href={`/materials/${category.slug}`}
                  className="group flex h-full flex-col gap-4 rounded-3xl bg-bg-subtle p-6"
                >
                  <FolderIcon className="size-12 shrink-0 text-neutral-900" />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[18px] font-extrabold leading-6 tracking-[-0.36px] text-neutral-900 transition-colors duration-200 group-hover:text-brand">
                      {category.title}
                    </span>
                    <span className="text-body-sm text-neutral-500">{filesCount(count)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <MaterialsFiltersDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        groups={[
          {
            key: "directions",
            title: "Напрямки",
            options: DIRECTIONS.map((d) => ({ value: d, label: d })),
          },
        ]}
        active={{ directions }}
        onToggle={toggle}
      />
    </div>
  );
}
