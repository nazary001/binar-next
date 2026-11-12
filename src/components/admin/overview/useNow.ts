"use client";

import { useSyncExternalStore } from "react";

// A clock for the relative times of the overview ("5 хв тому"), ticking
// every 30 s. Read through useSyncExternalStore, so nothing calls
// Date.now() while rendering; the server and the hydrating render see 0,
// which the screen treats as "unknown" and shows the full date instead.

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
