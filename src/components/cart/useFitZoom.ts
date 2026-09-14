"use client";

import { useCallback, useSyncExternalStore } from "react";

const LG = "(min-width: 640px)"; // desktop layout starts with the scaled canvas at 640 (globals.css)

// Height-fit scale for the overlays that Figma draws to fill a 1117-px
// tall screen (cart drawer 4329:39906, stock modal 4329:40379). On a
// shorter desktop window the panel is shrunk with CSS `zoom` exactly the
// way Figma fits the frame to the screen, so the composition (2.3 cart
// rows over the summary, the whole modal without an inner scrollbar)
// stays the master's. `designHeight` is the panel's CSS height in the
// master, `reserve` the vertical space the panel cannot use (the sticky
// header for the drawer, the gutters for the modal). Never scales up,
// never applies below lg (the phone sheets have their own layout) and
// renders 1 on the server so hydration matches. `media` limits the rule
// to a breakpoint band (desktop panels by default; the phone menu passes
// its own query).
export function useFitZoom(designHeight: number, reserve: number, media: string = LG): number {
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener("resize", notify);
    const mq = window.matchMedia(media);
    mq.addEventListener("change", notify);
    return () => {
      window.removeEventListener("resize", notify);
      mq.removeEventListener("change", notify);
    };
  }, [media]);

  const read = useCallback(() => {
    if (!window.matchMedia(media).matches) return 1;
    // documentElement.clientHeight reports window px even when the html
    // element is zoomed (globals.css fits the 1440 x 1117 canvas to the
    // window), so divide by that zoom to get the layout height in the
    // panel's own px; the panel then only shrinks further when the
    // window is shorter than the canvas itself already accounts for.
    const htmlZoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const available = document.documentElement.clientHeight / htmlZoom - reserve;
    if (available <= 0 || designHeight <= 0) return 1;
    return Math.min(1, Math.round((available / designHeight) * 1000) / 1000);
  }, [designHeight, reserve, media]);

  return useSyncExternalStore(subscribe, read, () => 1);
}
