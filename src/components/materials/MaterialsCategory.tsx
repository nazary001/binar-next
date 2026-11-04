"use client";

import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
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
import { MaterialsHero } from "./Hero";
import { PartnerMaterialsCategory } from "./PartnerMaterials";
import { PreviewPanel } from "./PreviewPanel";

// /materials/<category>: the partner folder (Figma «Матеріали B2B»
// 4377:61576) for a signed-in B2B account, the public page otherwise.
export function MaterialsCategory({ category }: { category: MaterialCategory }) {
  const { user } = useAuth();
  return user?.type === "b2b" ? (
    <PartnerMaterialsCategory category={category} />
  ) : (
    <PublicMaterialsCategory category={category} />
  );
}

// A materials category — Figma 4634:64897 («Каталоги»): the three-level
// crumb and H1, the search row, then the file rows in three columns
// (495.33 x 82 at 1710, 32-px gutters, 80 px above the footer). The
// filter sheet (4635:33009) narrows by direction and document type; a
// row opens the preview panel (4825:61120); the padlock of a file that
// needs an account carries the «Завантажити після авторизації» tooltip
// (4634:65705) and opens the sign-in drawer.
function PublicMaterialsCategory({ category }: { category: MaterialCategory }) {
  const { user, openAuth } = useAuth();
  const [query, setQuery] = useState("");
  const [directions, setDirections] = useState<Direction[]>([]);
  const [types, setTypes] = useState<FileType[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [preview, setPreview] = useState<MaterialFile | null>(null);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closePreview = useCallback(() => setPreview(null), []);
  const openAuthDrawer = useCallback(() => openAuth(), [openAuth]);

  const filters: MaterialsFilters = useMemo(() => ({ directions, types }), [directions, types]);
  const files = useMemo(
    () => folderFiles(category.slug, filters, query),
    [category.slug, filters, query],
  );

  const toggle = (key: string, value: string) => {
    if (key === "directions") setDirections((list) => toggleValue(list, value as Direction));
    else setTypes((list) => toggleValue(list, value as FileType));
  };

  const canDownload = (file: MaterialFile) => !file.locked || user !== null;

  return (
    <div className="px-6 pb-[60px] sm:px-10 lg-shop-pad-x lg:pb-20">
      <MaterialsHero
        crumbs={[{ href: "/materials", label: "Матеріали" }, { label: category.title }]}
        title={category.title}
        query={query}
        onQuery={setQuery}
        onOpenFilters={() => setDrawerOpen(true)}
        filtersOpen={drawerOpen}
        filtersCount={directions.length + types.length}
      />

      <section aria-label={`Файли: ${category.title}`} className="mt-10 lg:mt-16">
        {files.length === 0 ? (
          <p className="text-body-md text-neutral-500">
            За вашим запитом нічого не знайдено.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8">
            {files.map((file) => (
              <li key={file.id}>
                <FileCard
                  file={file}
                  canDownload={canDownload(file)}
                  onOpen={setPreview}
                  onLocked={openAuthDrawer}
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
        canDownload={preview ? canDownload(preview) : true}
        onLocked={openAuthDrawer}
      />
    </div>
  );
}
