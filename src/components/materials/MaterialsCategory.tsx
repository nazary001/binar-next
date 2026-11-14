"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useHydrated } from "@/components/platform/ui/useHydrated";
import { AppliedChips } from "@/components/ui/AppliedChips";
import { RollingNumber } from "@/components/ui/RollingNumber";
import {
  canDownloadMaterial,
  filesCount,
  folderFiles,
  type MaterialCategory,
  type MaterialFile,
} from "./data";
import { FileCard } from "./FileCard";
import { DIRECTIONS_GROUP, MaterialsFiltersDrawer, TYPES_GROUP } from "./FiltersDrawer";
import { MaterialsHero } from "./Hero";
import { PartnerMaterialsCategory } from "./PartnerMaterials";
import { MaterialsEmpty, MaterialsFileList } from "./phoneParts";
import { PreviewPanel } from "./PreviewPanel";
import { useMaterialsState } from "./useMaterialsUrlState";

const COPY = {
  parent: "Матеріали",
  files: (title: string) => `Файли: ${title}`,
  empty: "За вашим запитом нічого не знайдено.",
  found: "Знайдено",
} as const;

// /materials/<category>: the partner folder (Figma «Матеріали B2B»
// 4377:61576) for a signed-in B2B account, the public page otherwise.
// `files` = the folder's files, read from the database by the page.
type FolderProps = { category: MaterialCategory; files: MaterialFile[] };

export function MaterialsCategory({ category, files }: FolderProps) {
  const { user } = useAuth();
  return user?.type === "b2b" ? (
    <PartnerMaterialsCategory category={category} files={files} />
  ) : (
    <PublicMaterialsCategory category={category} files={files} />
  );
}

// Public file list: three columns of #f8f8f8 cards from 640; phones draw
// open rows between 1-px #d2d2d2 lines, framed top and bottom (TR-25,
// template T1).
const PUBLIC_FILES =
  "grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8 max-lg:gap-0 max-lg:divide-y max-lg:divide-stroke-subtle max-lg:border-y max-lg:border-stroke-subtle";

// A materials category — Figma 4634:64897 («Каталоги»): the three-level
// crumb and H1, the search row, then the file rows in three columns
// (495.33 x 82 at 1710, 32-px gutters, 80 px above the footer). The
// filter sheet (4635:33009) narrows by direction and document type; a
// row opens the preview panel (4825:61120); the padlock of a file that
// needs an account carries the «Завантажити після авторизації» tooltip
// (4634:65705) and opens the sign-in drawer.
function PublicMaterialsCategory({ category, files: folder }: FolderProps) {
  const { user, openAuth, open: authOpen } = useAuth();
  // Before hydration the auth store is the server's visitor: a signed-in
  // customer must not see the padlock flash (MAT-20).
  const hydrated = useHydrated();
  const s = useMaterialsState();
  const { openPreview, closePreview } = s;

  const files = useMemo(
    () => folderFiles(folder, category.slug, s.filters, s.query),
    [folder, category.slug, s.filters, s.query],
  );

  // The public skin is a guest's or a B2C customer's (a partner gets the
  // partner skin); the download route applies the same rule.
  const canDownload = (file: MaterialFile) => canDownloadMaterial(file, user ? user.type : null);
  // A sign-in started from a padlock stays on this folder (the visitor
  // came for that file); the header «Увійти» goes to the dashboard
  // (designer, 2026-11-13).
  const signIn = () => openAuth("auto", { stay: true });

  return (
    <div className="px-6 pb-[60px] sm:px-10 lg-shop-pad-x lg:pb-20">
      <MaterialsHero
        crumbs={[{ href: "/materials", label: COPY.parent }, { label: category.title }]}
        title={category.title}
        query={s.query}
        onQuery={s.setQuery}
        onOpenFilters={s.openDrawer}
        filtersOpen={s.drawerOpen}
        filtersCount={s.filtersCount}
        below={<AppliedChips chips={s.chips} onReset={s.resetFilters} className="mt-4 lg:hidden" />}
      />

      <section aria-label={COPY.files(category.title)} className="mt-6 lg:mt-16">
        {files.length === 0 ? (
          <>
            <p className="text-body-md text-neutral-500 max-lg:hidden">{COPY.empty}</p>
            <MaterialsEmpty onReset={s.resetAll} />
          </>
        ) : (
          <MaterialsFileList
            files={files}
            listKey={`${s.query}|${s.directions.join()}|${s.types.join()}`}
            className={PUBLIC_FILES}
            renderFile={(file) => (
              <FileCard
                file={file}
                canDownload={canDownload(file)}
                onOpen={openPreview}
                onLocked={signIn}
                pending={!hydrated && !!file.locked}
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
        resultLabel={
          <>
            {COPY.found} <RollingNumber value={files.length} format={filesCount} />
          </>
        }
        activeCount={s.filtersCount}
        onReset={s.resetFilters}
      />

      <PreviewPanel
        file={s.preview}
        onClose={closePreview}
        canDownload={s.preview ? canDownload(s.preview) : true}
        onLocked={signIn}
        coverOpen={authOpen}
      />
    </div>
  );
}
