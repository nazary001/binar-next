"use client";

import { useEffect, useLayoutEffect, type RefObject } from "react";

// Positions a floating layer (a menu, a listbox, a popover, a tooltip)
// next to its anchor. The layer is `position: fixed`, so it is never
// clipped by a card, a table or a modal it opens from, and it follows the
// anchor while the page or any container scrolls.
//
//   const anchor = useRef<HTMLButtonElement>(null);
//   const layer = useRef<HTMLDivElement>(null);
//   useFloating(open, anchor, layer, { placement: "bottom-start", matchWidth: true });
//   ...
//   {open && createPortal(<div ref={layer} className="fixed ...">...</div>, document.body)}
//
// The position is written straight to the element's style (no state), so
// it never causes a render and never trips the "no setState in an effect"
// rule. The layer flips above the anchor when there is no room below and
// is kept inside the window; `max-height` is set to the room that is left,
// so a long list scrolls inside the layer (give it `overflow-y: auto`).

export type Placement = "bottom-start" | "bottom-end" | "bottom" | "top-start" | "top-end" | "top" | "right-start" | "left-start";

export type FloatingOptions = {
  placement?: Placement;
  // Gap between the anchor and the layer, px.
  offset?: number;
  // The layer is at least as wide as the anchor (select menus).
  matchWidth?: boolean;
  // Distance kept from the window edges, px.
  margin?: number;
};

function place(anchor: HTMLElement, layer: HTMLElement, options: FloatingOptions): void {
  const { placement = "bottom-start", offset = 6, matchWidth = false, margin = 8 } = options;
  const a = anchor.getBoundingClientRect();
  const viewportW = document.documentElement.clientWidth;
  const viewportH = window.innerHeight;

  if (matchWidth) layer.style.minWidth = `${Math.round(a.width)}px`;
  // Measure with no height limit, then decide the side.
  layer.style.maxHeight = "";
  const width = layer.offsetWidth;
  const height = layer.offsetHeight;

  const side = placement.startsWith("top") ? "top" : placement.startsWith("bottom") ? "bottom" : placement.startsWith("right") ? "right" : "left";
  let top: number;
  let left: number;
  let room: number;

  if (side === "top" || side === "bottom") {
    const below = viewportH - a.bottom - offset - margin;
    const above = a.top - offset - margin;
    const useBottom = side === "bottom" ? below >= Math.min(height, 240) || below >= above : !(above >= Math.min(height, 240) || above >= below);
    room = Math.max(120, useBottom ? below : above);
    const shown = Math.min(height, room);
    top = useBottom ? a.bottom + offset : a.top - offset - shown;
    if (placement.endsWith("end")) left = a.right - width;
    else if (placement.endsWith("start")) left = a.left;
    else left = a.left + a.width / 2 - width / 2;
  } else {
    room = viewportH - margin * 2;
    top = a.top;
    left = side === "right" ? a.right + offset : a.left - offset - width;
    if (left + width > viewportW - margin) left = a.left - offset - width;
    if (left < margin) left = a.right + offset;
    top = Math.min(top, viewportH - margin - Math.min(height, room));
  }

  left = Math.max(margin, Math.min(left, viewportW - margin - width));
  top = Math.max(margin, top);
  layer.style.top = `${Math.round(top)}px`;
  layer.style.left = `${Math.round(left)}px`;
  layer.style.maxHeight = `${Math.round(room)}px`;
}

export function useFloating(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  layerRef: RefObject<HTMLElement | null>,
  options: FloatingOptions = {},
): void {
  const { placement, offset, matchWidth, margin } = options;

  // Before the first paint of the layer, so it never flashes at 0,0.
  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    const layer = layerRef.current;
    if (anchor && layer) place(anchor, layer, { placement, offset, matchWidth, margin });
  });

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const anchor = anchorRef.current;
        const layer = layerRef.current;
        if (anchor && layer) place(anchor, layer, { placement, offset, matchWidth, margin });
      });
    };
    // Capture: scrolling of any ancestor moves the anchor.
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, anchorRef, layerRef, placement, offset, matchWidth, margin]);
}

// Closes a layer on a pointer press outside of it (and outside its anchor)
// and on Escape. `refs` are the elements that count as "inside".
export function useDismiss(open: boolean, refs: RefObject<HTMLElement | null>[], close: () => void): void {
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && refs.some((ref) => ref.current?.contains(target))) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    };
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey);
    };
    // `refs` is a fresh array on every render; its members are stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, close]);
}
