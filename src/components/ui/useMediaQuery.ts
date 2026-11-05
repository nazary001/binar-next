"use client";

import { useCallback, useSyncExternalStore } from "react";

// The desktop canvas starts at 640 (globals.css: --breakpoint-sm/md/lg all
// flip there), so the JS split uses the very query the CSS `lg:` uses: a
// fractional 639.5-px window cannot fall between the two.
export const DESKTOP_QUERY = "(min-width: 640px)";

// matchMedia as an external store. `serverValue` is what the server render
// and the hydration pass see; the client switches to the real value in the
// re-render right after hydration (useSyncExternalStore semantics), so the
// first paint always matches the server HTML.
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    [query],
  );
  const read = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, read, () => serverValue);
}

// True below 640 px (the phone layouts). False on the server and during
// hydration: the server always renders the desktop branch, phone-only
// trees appear in the post-hydration render.
export function usePhone(): boolean {
  return !useMediaQuery(DESKTOP_QUERY, true);
}
