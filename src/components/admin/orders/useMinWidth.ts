"use client";

import { useCallback, useSyncExternalStore } from "react";

// True while the window is at least `px` wide. The orders table drops its
// secondary columns by width steps the kit's Column.hideBelow does not
// offer (1440, 1536, 1680): a column left out of the array entirely keeps
// the head and the rows aligned. The server and the first client render
// say false, so wide screens add the columns right after hydration.
export function useMinWidth(px: number): boolean {
  const query = `(min-width: ${px}px)`;
  const subscribe = useCallback(
    (listener: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
