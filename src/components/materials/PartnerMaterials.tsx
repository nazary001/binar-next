"use client";

import { useCallback, useMemo, useState } from "react";
import { CabinetPage, CabinetPageHead } from "@/components/platform/ui";
import {
  categoryCards,
  folderFiles,
  toggleValue,
  type Direction,
  type FileType,
  type MaterialCategory,
  type MaterialFile,
  type MaterialsFilters,
} from "./data";
import { FileCard } from "./FileCard";
import { DIRECTIONS_GROUP, MaterialsFiltersDrawer, TYPES_GROUP } from "./FiltersDrawer";
import { FolderCard } from "./FolderCard";
import { MaterialsFiltersButton, MaterialsSearchField } from "./Hero";
import { PreviewPanel } from "./PreviewPanel";

// «Матеріали B2B» (Figma section 4593:59619) - the partner skin of the
// materials library, rendered for a signed-in B2B account inside the
// platform shell (B2B header, 104-px side rail, legal bar). Frames:
// root 4396:11383, folder «Каталоги» 4377:61576, preview 4825:60565,
// filter sheets 4378:63140 / 4396:11930 (= the public sheets).
//
// Content panel (4396:11388 / 4377:61581) = the shared CabinetPage
// surface (#f5f5f5, rounded-tl-48, pb-32, 1606 wide next to the rail,
// filling down to the legal bar). Every block sits on the 40 / 32
// gutters of the «B2B Platform» grid (content x 144, width 1534 at 1710):
//   head      CabinetPageHead, py-32: root = H2 44/48 + 8 + 14/24 #777779
//             subtitle (144 tall); folder = Back 181x40, 24, H2 (176),
//             plus the optional folder note 8 under the H2 (4825:60574,
//             208);
//   toolbar   pb-32: the 495 transparent «Пошук» pill centred in the
//             52-px row, the black filter button at the right edge;
//   content   root = folder cards 365.5 x 162 in four columns, 24 both
//             ways (the master's 8th card is an opacity-0 filler, i.e.
//             only the four-column track); folder = white file cards
//             495.33 x 82 in three columns, 24 both ways.

const GUTTERS = "px-6 lg:pl-10 lg:pr-8";

const ROOT_TAGLINE =
  "Усі необхідні матеріали в одному місці: переглядайте каталоги, технічні карти та інші файли.";

// Tooltip of the partner padlock (no B2B master draws one; same chip as
// the visitor's «Завантажити після авторизації.»).
const PARTNER_LOCK_HINT = "Файл доступний за запитом.";

function Toolbar({
  label,
  query,
  onQuery,
  filtersCount,
  filtersOpen,
  onOpenFilters,
}: {
  label: string;
  query: string;
  onQuery: (value: string) => void;
  filtersCount: number;
  filtersOpen: boolean;
  onOpenFilters: () => void;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 pb-6 lg:pb-8 ${GUTTERS}`}>
      <MaterialsSearchField value={query} onChange={onQuery} label={label} surface="none" />
      <MaterialsFiltersButton count={filtersCount} expanded={filtersOpen} onClick={onOpenFilters} />
    </div>
  );
}

function Empty() {
  return <p className="text-body-sm text-neutral-500">За вашим запитом нічого не знайдено.</p>;
}

// Root «Матеріали» (4396:11383): title + subtitle, toolbar, folder cards
// (FolderCard surface="white" = component 4396:11870). The sheet offers
// the directions only (4378:63140).
export function PartnerMaterialsHome() {
  const [query, setQuery] = useState("");
  const [directions, setDirections] = useState<Direction[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const filters: MaterialsFilters = useMemo(() => ({ directions, types: [] }), [directions]);
  const cards = useMemo(() => categoryCards(filters, query), [filters, query]);

  return (
    <CabinetPage>
      <CabinetPageHead title="Матеріали" subtitle={ROOT_TAGLINE} />

      <Toolbar
        label="Пошук: Матеріали"
        query={query}
        onQuery={setQuery}
        filtersCount={directions.length}
        filtersOpen={drawerOpen}
        onOpenFilters={() => setDrawerOpen(true)}
      />

      <section aria-label="Категорії матеріалів" className={GUTTERS}>
        {cards.length === 0 ? (
          <Empty />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {cards.map(({ category, count }) => (
              <li key={category.slug}>
                <FolderCard category={category} count={count} surface="white" />
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
        onToggle={(_key, value) => setDirections((list) => toggleValue(list, value as Direction))}
      />
    </CabinetPage>
  );
}

// A partner folder (4377:61576): Back «До матеріалів» + H2 (no crumb
// trail), toolbar, white file cards (4378:63098; download=false = the
// padlock for files outside the partner's agreement), both filter
// groups (4396:11930) and the preview sheet (4825:60620 = the public
// 1103-px panel; its «коментар» is the file description).
export function PartnerMaterialsCategory({ category }: { category: MaterialCategory }) {
  const [query, setQuery] = useState("");
  const [directions, setDirections] = useState<Direction[]>([]);
  const [types, setTypes] = useState<FileType[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [preview, setPreview] = useState<MaterialFile | null>(null);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closePreview = useCallback(() => setPreview(null), []);

  const filters: MaterialsFilters = useMemo(() => ({ directions, types }), [directions, types]);
  const files = useMemo(
    () => folderFiles(category.slug, filters, query),
    [category.slug, filters, query],
  );

  const toggle = (key: string, value: string) => {
    if (key === "directions") setDirections((list) => toggleValue(list, value as Direction));
    else setTypes((list) => toggleValue(list, value as FileType));
  };

  return (
    <CabinetPage>
      {/* «Back button» 4395:5727 (181 x 40) + H2, no crumb trail. */}
      <CabinetPageHead
        title={category.title}
        subtitle={category.tagline}
        back={{ label: "До матеріалів", href: "/materials" }}
      />

      <Toolbar
        label={`Пошук: ${category.title}`}
        query={query}
        onQuery={setQuery}
        filtersCount={directions.length + types.length}
        filtersOpen={drawerOpen}
        onOpenFilters={() => setDrawerOpen(true)}
      />

      <section aria-label={`Файли: ${category.title}`} className={GUTTERS}>
        {files.length === 0 ? (
          <Empty />
        ) : (
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
            {files.map((file) => (
              <li key={file.id}>
                <FileCard
                  file={file}
                  canDownload={!file.partnerLocked}
                  onOpen={setPreview}
                  lockedHint={PARTNER_LOCK_HINT}
                  surface="white"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <MaterialsFiltersDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        groups={[DIRECTIONS_GROUP, TYPES_GROUP]}
        active={{ directions, types }}
        onToggle={toggle}
      />

      <PreviewPanel
        file={preview}
        onClose={closePreview}
        canDownload={!preview?.partnerLocked}
        lockedHint={PARTNER_LOCK_HINT}
      />
    </CabinetPage>
  );
}
