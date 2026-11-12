"use client";

import { useEffect, useSyncExternalStore, type RefObject } from "react";

// The bars stuck to the bottom of the window (FormActions sticky, BulkBar)
// and the toast stack that must not cover them. A bar registers itself
// while it is on the page; the toast host asks how far to lift the stack
// so it sits above whatever bar is on screen under it.
//
//   const bar = useRef<HTMLDivElement>(null);
//   useStickyBar(bar, sticky);                 // in the bar
//   const lift = useStickyBarLift(active);     // in the toast host: px to raise the stack
//
// The lift is measured, not guessed: the part of a registered bar that is
// on screen and under the stack's column (the right 380 px from 640, the
// whole width on phones), plus an 8-px gap. It follows scrolling, resizing
// and the bar's own size changes (a status line that wraps), and is 0 when
// no bar is in the way, so a page without one never moves its toasts.

const bars = new Set<HTMLElement>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of [...listeners]) listener();
}

// Measure again (the toast stack grew or shrank).
export function remeasureStickyBars(): void {
  emit();
}

export function useStickyBar(ref: RefObject<HTMLElement | null>, active = true): void {
  useEffect(() => {
    const node = ref.current;
    if (!active || !node) return;
    bars.add(node);
    emit();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => emit());
    observer?.observe(node);
    return () => {
      observer?.disconnect();
      bars.delete(node);
      emit();
    };
  }, [ref, active]);
}

// Where the toast column stands, as ToastHost lays it out.
const STACK_WIDTH = 380;
const STACK_INSET = 24;
const STACK_BOTTOM_WIDE = 24;
const STACK_PAD_PHONE = 16;
// A one-line toast with its 8-px top padding.
const ONE_TOAST = 64;
const PHONE = 640;
const GAP = 8;

function measure(): number {
  if (typeof window === "undefined" || bars.size === 0) return 0;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const phone = width < PHONE;
  const columnLeft = phone ? 0 : width - STACK_INSET - STACK_WIDTH;
  const columnRight = phone ? width : width - STACK_INSET;
  // Where the lowest toast ends: 24 px above the window's edge from 640 px;
  // on a phone the stack sits on the edge with 16 px of padding inside.
  const bottom = phone ? STACK_PAD_PHONE : STACK_BOTTOM_WIDE;
  // How tall the stack is (offsetHeight ignores the lift's translate); one
  // toast before the host has painted.
  const host = document.querySelector<HTMLElement>("[data-admin-toasts]");
  const stack = Math.max(ONE_TOAST, (host?.offsetHeight ?? 0) - (phone ? STACK_PAD_PHONE : 0));
  const stackTop = height - bottom - stack;
  let lift = 0;
  for (const bar of bars) {
    if (!bar.isConnected) continue;
    const rect = bar.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.bottom <= 0 || rect.top >= height) continue;
    if (rect.right <= columnLeft || rect.left >= columnRight) continue;
    // A bar higher up the page than the resting stack is not in its way.
    if (rect.bottom + GAP <= stackTop) continue;
    lift = Math.max(lift, Math.ceil(height - rect.top + GAP - bottom));
  }
  return Math.max(0, lift);
}

// Bars coming and going, their size, the page scrolling or the window
// resizing: anything that can move a bar under the stack.
function subscribeLift(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("scroll", listener, { passive: true, capture: true });
  window.addEventListener("resize", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("scroll", listener, { capture: true });
    window.removeEventListener("resize", listener);
  };
}

const quiet = () => () => {};

// The number of px the toast stack is raised by. `active`: the host shows
// toasts (no listener and no measuring while there are none). A store, so
// the first render that shows a toast is already measured: the toast
// never paints over a bar first and jumps up after. The snapshot is a
// number, so an unchanged layout gives the same snapshot and no render.
export function useStickyBarLift(active: boolean): number {
  return useSyncExternalStore(
    active ? subscribeLift : quiet,
    () => (active ? measure() : 0),
    () => 0,
  );
}
