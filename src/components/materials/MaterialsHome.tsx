"use client";

import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  categoryCards,
  toggleValue,
  type Direction,
  type MaterialsFilters,
} from "./data";
import { DIRECTIONS_GROUP, MaterialsFiltersDrawer } from "./FiltersDrawer";
import { FolderCard } from "./FolderCard";
import { MaterialsHero } from "./Hero";
import { PartnerMaterialsHome } from "./PartnerMaterials";

// The /materials page: a signed-in partner (B2B account) gets the
// cabinet skin of Figma «Матеріали B2B» (PartnerMaterials.tsx), every
// other visitor the public library below. The session lives in
// localStorage, so the server renders the public view and the client
// switches right after hydration (same as the catalog pages).
export function MaterialsHome() {
  const { user } = useAuth();
  return user?.type === "b2b" ? <PartnerMaterialsHome /> : <PublicMaterialsHome />;
}

// «Матеріали» landing — Figma 4634:63597: the head block with its
// tagline, the search row, then the category cards in four columns
// (363.5 x 162 at 1710, 32-px gutters both ways, 80 px above the
// footer). A card is FolderCard (4634:64377). The landing's filter sheet
// (4635:32986) offers the directions only; a direction narrows every
// count to the files tagged with it, the search matches category and
// file names.
function PublicMaterialsHome() {
  const [query, setQuery] = useState("");
  const [directions, setDirections] = useState<Direction[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const filters: MaterialsFilters = useMemo(() => ({ directions, types: [] }), [directions]);

  const cards = useMemo(() => categoryCards(filters, query), [filters, query]);

  const toggle = (_key: string, value: string) => {
    setDirections((list) => toggleValue(list, value as Direction));
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
                <FolderCard category={category} count={count} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <MaterialsFiltersDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        groups={[DIRECTIONS_GROUP]}
        active={{ directions }}
        onToggle={toggle}
      />
    </div>
  );
}
