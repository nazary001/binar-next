"use client";

import { useMemo, type ReactNode } from "react";
import { CabinetPage, CabinetPageHead } from "@/components/platform/ui";
import { AppliedChips } from "@/components/ui/AppliedChips";
import { FilterButton } from "@/components/ui/FilterButton";
import { SearchField } from "@/components/ui/SearchField";
import {
  categoriesCount,
  categoryCards,
  filesCount,
  folderFiles,
  type MaterialCategory,
} from "./data";
import { FileCard } from "./FileCard";
import { DIRECTIONS_GROUP, MaterialsFiltersDrawer, TYPES_GROUP } from "./FiltersDrawer";
import { FolderCard } from "./FolderCard";
import { MATERIALS_SEARCH_WIDTH } from "./Hero";
import { MaterialsEmpty, MaterialsFileList } from "./phoneParts";
import { PreviewPanel } from "./PreviewPanel";
import { useMaterialsState } from "./useMaterialsUrlState";

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
// Phones (template T2, D1): the cabinet head on the #f5f5f5 slab, the
// search row (transparent pill + 8 + disc) with the applied chips 16
// under it, 24 to the content: white r32 folder row cards 24 apart, or
// ONE white r32 panel of file rows between 1-px #d2d2d2 lines; the empty
// result is a white r32 panel too; 48 to the legal bar (slab pb).

const GUTTERS = "px-6 lg:pl-10 lg:pr-8";

const COPY = {
  title: "Матеріали",
  tagline:
    "Усі необхідні матеріали в одному місці: переглядайте каталоги, технічні карти та інші файли.",
  // Tooltip / caption of the partner padlock (no B2B master draws one;
  // same chip as the visitor's «Завантажити після авторизації.»).
  lockHint: "Файл доступний за запитом.",
  back: "До матеріалів",
  search: (title: string) => `Пошук: ${title}`,
  section: "Категорії матеріалів",
  files: (title: string) => `Файли: ${title}`,
  empty: "За вашим запитом нічого не знайдено.",
  foundCategories: (n: number) => `Знайдено ${categoriesCount(n)}`,
  foundFiles: (n: number) => `Знайдено ${filesCount(n)}`,
} as const;

// Partner file panel: three columns of white cards from 640; phones draw
// one white r32 panel (px 24, py 8) of open rows between 1-px lines.
const PARTNER_FILES =
  "grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6 max-lg:gap-0 max-lg:divide-y max-lg:divide-stroke-subtle max-lg:rounded-[32px] max-lg:bg-white max-lg:px-6 max-lg:py-2";

function Toolbar({
  label,
  query,
  onQuery,
  filtersCount,
  filtersOpen,
  onOpenFilters,
  below,
}: {
  label: string;
  query: string;
  onQuery: (value: string) => void;
  filtersCount: number;
  filtersOpen: boolean;
  onOpenFilters: () => void;
  below?: ReactNode;
}) {
  return (
    <div className={`pb-6 lg:pb-8 ${GUTTERS}`}>
      <div className="flex items-center justify-between gap-2 lg:gap-4">
        <SearchField
          value={query}
          onChange={onQuery}
          label={label}
          surface="none"
          className={MATERIALS_SEARCH_WIDTH}
        />
        <FilterButton count={filtersCount} expanded={filtersOpen} onClick={onOpenFilters} badgeDesktop />
      </div>
      {below}
    </div>
  );
}

function Empty({ onReset }: { onReset: () => void }) {
  return (
    <>
      <p className="text-body-sm text-neutral-500 max-lg:hidden">{COPY.empty}</p>
      <MaterialsEmpty onReset={onReset} surface="panel" />
    </>
  );
}

// Root «Матеріали» (4396:11383): title + subtitle, toolbar, folder cards
// (FolderCard surface="white" = component 4396:11870). The sheet offers
// the directions only (4378:63140).
export function PartnerMaterialsHome() {
  const s = useMaterialsState();
  const cards = useMemo(() => categoryCards(s.filters, s.query), [s.filters, s.query]);

  return (
    <CabinetPage>
      <CabinetPageHead title={COPY.title} subtitle={COPY.tagline} />

      <Toolbar
        label={COPY.search(COPY.title)}
        query={s.query}
        onQuery={s.setQuery}
        filtersCount={s.filtersCount}
        filtersOpen={s.drawerOpen}
        onOpenFilters={s.openDrawer}
        below={<AppliedChips chips={s.chips} onReset={s.resetFilters} className="mt-4 lg:hidden" />}
      />

      <section aria-label={COPY.section} className={GUTTERS}>
        {cards.length === 0 ? (
          <Empty onReset={s.resetAll} />
        ) : (
          <ul role="list" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6 max-lg:gap-6">
            {cards.map(({ category, count }) => (
              <li key={category.slug}>
                <FolderCard category={category} count={count} surface="white" />
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
        resultLabel={COPY.foundCategories(cards.length)}
        activeCount={s.filtersCount}
        onReset={s.resetFilters}
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
  const s = useMaterialsState();
  const { openPreview, closePreview } = s;
  const files = useMemo(
    () => folderFiles(category.slug, s.filters, s.query),
    [category.slug, s.filters, s.query],
  );

  return (
    <CabinetPage>
      {/* «Back button» 4395:5727 (181 x 40) + H2, no crumb trail. */}
      <CabinetPageHead
        title={category.title}
        subtitle={category.tagline}
        back={{ label: COPY.back, href: "/materials" }}
      />

      <Toolbar
        label={COPY.search(category.title)}
        query={s.query}
        onQuery={s.setQuery}
        filtersCount={s.filtersCount}
        filtersOpen={s.drawerOpen}
        onOpenFilters={s.openDrawer}
        below={<AppliedChips chips={s.chips} onReset={s.resetFilters} className="mt-4 lg:hidden" />}
      />

      <section aria-label={COPY.files(category.title)} className={GUTTERS}>
        {files.length === 0 ? (
          <Empty onReset={s.resetAll} />
        ) : (
          <MaterialsFileList
            files={files}
            listKey={`${s.query}|${s.directions.join()}|${s.types.join()}`}
            className={PARTNER_FILES}
            renderFile={(file) => (
              <FileCard
                file={file}
                canDownload={!file.partnerLocked}
                onOpen={openPreview}
                lockedHint={COPY.lockHint}
                surface="white"
              />
            )}
          />
        )}
      </section>

      <MaterialsFiltersDrawer
        open={s.drawerOpen}
        onClose={s.closeDrawer}
        groups={[DIRECTIONS_GROUP, TYPES_GROUP]}
        active={{ directions: s.directions, types: s.types }}
        onToggle={s.toggle}
        resultLabel={COPY.foundFiles(files.length)}
        activeCount={s.filtersCount}
        onReset={s.resetFilters}
      />

      <PreviewPanel
        file={s.preview}
        onClose={closePreview}
        canDownload={!s.preview?.partnerLocked}
        lockedHint={COPY.lockHint}
      />
    </CabinetPage>
  );
}
