"use client";

import { useCallback, useMemo, useState } from "react";
import type { AppliedChip } from "@/components/ui/AppliedChips";
import {
  DIRECTIONS,
  FILE_TYPE_LABELS,
  toggleValue,
  type Direction,
  type FileType,
  type MaterialFile,
  type MaterialsFilters,
} from "./data";

// Page state of the four materials views (public / partner x landing /
// folder): the search query, the checked directions and types, the open
// filters sheet and the file in the preview. One implementation instead of
// four copies of the same useState block.
//
// DECISIONS round 2 (O-13): NO URL parameters are written - the materials
// spec's `?q / dir / type / file` mirror (2.10) is not built; the file keeps
// the name the build plan gave it. State lives in the component and resets
// on navigation, exactly as on desktop today.
export type MaterialsFilterKey = "directions" | "types";

export function useMaterialsState() {
  const [query, setQuery] = useState("");
  const [directions, setDirections] = useState<Direction[]>([]);
  const [types, setTypes] = useState<FileType[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [preview, setPreview] = useState<MaterialFile | null>(null);

  const toggle = useCallback((key: string, value: string) => {
    if (key === "directions") setDirections((list) => toggleValue(list, value as Direction));
    else setTypes((list) => toggleValue(list, value as FileType));
  }, []);
  const resetFilters = useCallback(() => {
    setDirections([]);
    setTypes([]);
  }, []);
  const resetAll = useCallback(() => {
    setQuery("");
    setDirections([]);
    setTypes([]);
  }, []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openPreview = useCallback((file: MaterialFile) => setPreview(file), []);
  const closePreview = useCallback(() => setPreview(null), []);

  const filters: MaterialsFilters = useMemo(() => ({ directions, types }), [directions, types]);

  // Applied-filter chips (phone): directions first in DIRECTIONS order,
  // then the types in FILE_TYPE_LABELS order (materials spec 2.4).
  const chips: AppliedChip[] = useMemo(
    () => [
      ...DIRECTIONS.filter((d) => directions.includes(d)).map((d) => ({
        key: `directions-${d}`,
        label: d,
        onRemove: () => toggle("directions", d),
      })),
      ...FILE_TYPE_LABELS.filter((t) => types.includes(t.value)).map((t) => ({
        key: `types-${t.value}`,
        label: t.label,
        onRemove: () => toggle("types", t.value),
      })),
    ],
    [directions, types, toggle],
  );

  return {
    query,
    setQuery,
    directions,
    types,
    filters,
    filtersCount: directions.length + types.length,
    chips,
    toggle,
    resetFilters,
    resetAll,
    drawerOpen,
    openDrawer,
    closeDrawer,
    preview,
    openPreview,
    closePreview,
  };
}
