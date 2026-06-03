"use client";
import { useEffect, useRef, useState } from "react";
import { RingText, ScrollToTopButton } from "./ScrollToTopButton";

// One single "scroll to top" arrow that travels. Replaces the old pair
// (a corner FAB + a separate static button baked into the footer).
//
//   1. Near the top of the page it is hidden.
//   2. Once you scroll past ~3/4 of a viewport it appears, fixed, in the
//      bottom-right corner — the spinning "ВГОРУ" ring text auto-inverts
//      against whatever is behind it (black over light, light over dark).
//   3. As the footer scrolls up, the empty [data-scrollup-slot] placeholder
//      it reserves rises with it; we interpolate the button's transform from
//      the corner to the slot's *live* centre so it glides into place,
//      scroll-linked. Once fully docked it tracks the slot exactly (so it
//      reads as part of the footer) and the ring switches to plain white —
//      the on-spec look against the dark footer.
//
// Everything is a pure function of scroll position, so scrolling back up
// reverses the flight smoothly.
//
// TWO LAYERS, not one: `mix-blend-mode: difference` only reaches the page
// backdrop when it sits on a `position: fixed` element directly — nesting it
// inside another fixed/transformed wrapper isolates the blend so it only mixes
// against the button's own pixels. So the ring is its own fixed layer (blended)
// and the orange circle + arrow are a second fixed layer (un-blended, so the
// brand circle keeps its colour). Both share the exact same box, anchor and
// per-frame transform, so they stay perfectly concentric as they fly.

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

// Cubic ease-in-out — slow start, slow finish; reads as a premium glide.
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Desktop applies `html { zoom: calc(100vw / 1440px) }`, so getBoundingClientRect
// returns zoom-scaled (visual) coordinates while a CSS `transform` translate is
// in pre-zoom local px. Dividing the measured visual delta by the zoom keeps the
// button landing pixel-exact on the slot at every viewport width.
const readZoom = () => {
  const z = parseFloat(getComputedStyle(document.documentElement).zoom);
  return z && isFinite(z) ? z : 1;
};

// Same size + corner anchor for both layers so they stay concentric and dock
// onto the footer slot (which reserves the identical 88/110/130 footprint).
const LAYER_BOX =
  "fixed bottom-5 right-5 z-40 size-[88px] sm:bottom-8 sm:right-8 sm:size-[110px] lg:size-[130px]";

export function ScrollUpDock() {
  const ringRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLDivElement>(null);
  // Last applied local-px translate — lets us recover the resting corner
  // centre each frame (curCentre - appliedTranslate*zoom) without clearing
  // the transform first (which would cause a reflow flicker).
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const reducedRef = useRef(false);

  const [visible, setVisible] = useState(false);
  const [docked, setDocked] = useState(false);
  const [reduced, setReduced] = useState(false);

  // Track prefers-reduced-motion. Mirrored into a ref so the rAF loop reads
  // the current value without re-subscribing.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reducedRef.current = mq.matches;
      setReduced(mq.matches);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const ring = ringRef.current;
    const btn = btnRef.current;
    if (!ring || !btn) return;
    const slot = document.querySelector<HTMLElement>("[data-scrollup-slot]");

    let lastVisible: boolean | null = null;
    let lastDocked: boolean | null = null;

    const measure = () => {
      rafRef.current = null;
      const vh = window.innerHeight;
      const scrolledEnough = window.scrollY > vh * 0.75;

      let t = 0;
      let slotCx = 0;
      let slotCy = 0;
      let haveSlot = false;
      if (slot) {
        const s = slot.getBoundingClientRect();
        // 0 while the slot sits low in / below the viewport, ramping to 1 as
        // it rises into the upper-middle band — that span is the fly-in zone.
        const startTop = vh * 0.92;
        const endTop = vh * 0.42;
        t = clamp((startTop - s.top) / (startTop - endTop), 0, 1);
        slotCx = s.left + s.width / 2;
        slotCy = s.top + s.height / 2;
        haveSlot = true;
      }

      const nextVisible = scrolledEnough || t > 0;
      if (nextVisible !== lastVisible) {
        lastVisible = nextVisible;
        setVisible(nextVisible);
      }

      // Reduced motion: no glide — a single snap into the slot half-way through
      // the fly-in zone, otherwise the corner.
      const e = reducedRef.current ? (t >= 0.5 ? 1 : 0) : easeInOut(t);

      const nextDocked = haveSlot && e >= 0.999;
      if (nextDocked !== lastDocked) {
        lastDocked = nextDocked;
        setDocked(nextDocked);
      }

      let txLocal = 0;
      let tyLocal = 0;
      if (haveSlot && e > 0) {
        const z = readZoom();
        // btn shares the ring's box + transform, so either measures the home.
        const w = btn.getBoundingClientRect();
        const curCx = w.left + w.width / 2;
        const curCy = w.top + w.height / 2;
        const homeCx = curCx - txRef.current * z;
        const homeCy = curCy - tyRef.current * z;
        txLocal = ((slotCx - homeCx) * e) / z;
        tyLocal = ((slotCy - homeCy) * e) / z;
      }

      if (txLocal !== txRef.current || tyLocal !== tyRef.current) {
        txRef.current = txLocal;
        tyRef.current = tyLocal;
        // 2D translate (not translate3d): a 3D transform / its own composite
        // layer would break the ring's mix-blend against the page.
        const tf = `translate(${txLocal}px, ${tyLocal}px)`;
        ring.style.transform = tf;
        btn.style.transform = tf;
      }
    };

    const schedule = () => {
      if (rafRef.current == null)
        rafRef.current = requestAnimationFrame(measure);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Only opacity transitions — the flight transform is set imperatively each
  // frame and must NOT be eased by CSS or it would lag the scroll.
  const fade = reduced ? "" : "transition-opacity duration-300 ease-out";
  const vis = visible ? "opacity-100" : "pointer-events-none opacity-0";

  return (
    <>
      {/* Ring layer — `mix-blend-difference` inverts the white "ВГОРУ" text
          against the page while floating; dropped once docked so the text is
          plain white over the dark footer. Its own fixed element (see file
          note) and never interactive. */}
      <div
        ref={ringRef}
        aria-hidden
        className={`${LAYER_BOX} pointer-events-none ${fade} ${vis} ${
          docked ? "" : "mix-blend-difference"
        }`}
      >
        <RingText />
      </div>

      {/* Button layer — orange circle + arrow, clickable. The 88/110/130 box
          is `pointer-events-none` so only the inner circle catches clicks; a
          full-box hit area floating in the corner would otherwise swallow
          clicks on content beneath it. `inert` pulls it from the a11y tree
          while hidden. */}
      <div
        ref={btnRef}
        inert={!visible}
        className={`${LAYER_BOX} flex items-center justify-center pointer-events-none ${fade} ${vis}`}
      >
        <ScrollToTopButton showRing={false} className="pointer-events-auto" />
      </div>
    </>
  );
}
