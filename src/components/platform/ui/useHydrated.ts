"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// False while React hydrates the server HTML (and on the server), true on
// every client render after that. Built on useSyncExternalStore like the
// cart / auth stores, so it flips in the same post-hydration re-render in
// which those stores switch from their server snapshot to localStorage.
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
