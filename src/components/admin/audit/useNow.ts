"use client";

import { useSyncExternalStore } from "react";

// A clock for relative times ("5 хв тому") that ticks every 30 s, shared by
// every component that shows one. Read through useSyncExternalStore, so no
// component calls Date.now() while rendering; the server (and the first
// client render while hydrating) sees 0, which callers treat as "unknown".

const TICK_MS = 30_000;

let now = 0;
let timer: number | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    now = Date.now();
    timer = window.setInterval(() => {
      now = Date.now();
      for (const notify of [...listeners]) notify();
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.clearInterval(timer);
  };
}

export function useNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => 0,
  );
}
