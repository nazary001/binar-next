"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppliedChips } from "@/components/ui/AppliedChips";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { categoriesCount, categoryCards, type MaterialCategory, type MaterialFile } from "./data";
import { DIRECTIONS_GROUP, MaterialsFiltersDrawer } from "./FiltersDrawer";
import { FolderCard } from "./FolderCard";
import { MaterialsHero } from "./Hero";
import { PartnerMaterialsHome } from "./PartnerMaterials";
import { MaterialsEmpty } from "./phoneParts";
import { useMaterialsState } from "./useMaterialsUrlState";

const COPY = {
  title: "Матеріали",
  tagline:
    "Усі необхідні матеріали в одному місці: переглядайте каталоги, технічні карти та інші файли.",
  section: "Категорії матеріалів",
  empty: "За вашим запитом нічого не знайдено.",
  found: "Знайдено",
} as const;

// The /materials page: a signed-in partner (B2B account) gets the
// cabinet skin of Figma «Матеріали B2B» (PartnerMaterials.tsx), every
// other visitor the public library below. The session lives in
// localStorage, so the server renders the public view and the client
// switches right after hydration (same as the catalog pages). The page
// (server) reads the library from the database and passes it in.
type LibraryProps = { categories: MaterialCategory[]; files: MaterialFile[] };

export function MaterialsHome({ categories, files }: LibraryProps) {
  const { user } = useAuth();
  return user?.type === "b2b" ? (
    <PartnerMaterialsHome categories={categories} files={files} />
  ) : (
    <PublicMaterialsHome categories={categories} files={files} />
  );
}

// «Матеріали» landing — Figma 4634:63597: the head block with its
// tagline, the search row, then the category cards in four columns
// (363.5 x 162 at 1710, 32-px gutters both ways, 80 px above the
// footer). A card is FolderCard (4634:64377). The landing's filter sheet
// (4635:32986) offers the directions only; a direction narrows every
// count to the files tagged with it, the search matches category and
// file names.
// Phones (template T1): one column of row cards 24 apart, 24 under the
// search row (or the applied chips), 60 above the footer.
function PublicMaterialsHome({ categories, files }: LibraryProps) {
  const s = useMaterialsState();
  const cards = useMemo(
    () => categoryCards(files, categories, s.filters, s.query),
    [files, categories, s.filters, s.query],
  );

  return (
    <div className="px-6 pb-[60px] sm:px-10 lg-shop-pad-x lg:pb-20">
      <MaterialsHero
        crumbs={[{ label: COPY.title }]}
        title={COPY.title}
        tagline={COPY.tagline}
        query={s.query}
        onQuery={s.setQuery}
        onOpenFilters={s.openDrawer}
        filtersOpen={s.drawerOpen}
        filtersCount={s.filtersCount}
        below={<AppliedChips chips={s.chips} onReset={s.resetFilters} className="mt-4 lg:hidden" />}
      />

      <section aria-label={COPY.section} className="mt-6 lg:mt-16">
        {cards.length === 0 ? (
          <>
            <p className="text-body-md text-neutral-500 max-lg:hidden">{COPY.empty}</p>
            <MaterialsEmpty onReset={s.resetAll} />
          </>
        ) : (
          <ul role="list" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8 max-lg:gap-6">
            {cards.map(({ category, count }) => (
              <li key={category.slug}>
                <FolderCard category={category} count={count} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <MaterialsFiltersDrawer
        open={s.drawerOpen}
        onClose={s.closeDrawer}
        groups={[DIRECTIONS_GROUP]}
        active={{ directions: s.directions }}
        onToggle={s.toggle}
        resultLabel={
          <>
            {COPY.found} <RollingNumber value={cards.length} format={categoriesCount} />
          </>
        }
        activeCount={s.filtersCount}
        onReset={s.resetFilters}
      />
    </div>
  );
}
