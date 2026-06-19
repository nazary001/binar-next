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
//      it reserves rises with it; we interpolate the button's *vertical*
//      transform from the corner to the slot's live centre so it glides into
//      place, scroll-linked. Horizontally it never moves — it stays pinned at
//      its corner offset from the right edge (the slot sits further in, inside
//      the 1440 container padding, and flying left to meet it reads wrong).
//      Once fully docked it tracks the slot's height exactly (so it reads as
//      part of the footer) and the ring switches to plain white — the on-spec
//      look against the dark footer.
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
  // Last applied local-px translate. Lets recalcHome() recover the resting
  // corner centre (curCentre - appliedTranslate*zoom) without clearing the
  // transform first (which would flicker), so a resize mid-glide re-anchors
  // cleanly.
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

    // Scroll-INVARIANT geometry, cached so the per-frame path stays cheap.
    // The resting corner centre and the page zoom only change on resize (the
    // button is position:fixed; zoom is calc(100vw/1440px)), so reading them
    // every scroll frame was pure waste: a getComputedStyle(zoom) style flush
    // (always 1 on mobile, where zoom is off) plus a second
    // getBoundingClientRect on the button. We measure them once here and on
    // resize instead, leaving ONE slot rect read per frame (the slot is the
    // only thing that genuinely moves with scroll).
    let homeCy = 0;
    let zoom = 1;

    const recalcHome = () => {
      zoom = readZoom();
      // Recover the resting corner centre without clearing the transform
      // (which would flicker): current visual centre minus the translate we
      // applied (tyLocal is pre-zoom px, so x zoom to get visual px). Valid
      // mid-glide, so a resize part-way through the flight re-anchors cleanly.
      const w = btn.getBoundingClientRect();
      homeCy = w.top + w.height / 2 - tyRef.current * zoom;
    };

    const measure = () => {
      const vh = window.innerHeight;
      const scrolledEnough = window.scrollY > vh * 0.75;

      let t = 0;
      let slotCy = 0;
      let haveSlot = false;
      if (slot) {
        const s = slot.getBoundingClientRect();
        // 0 while the slot sits low in / below the viewport, ramping to 1 as
        // it rises into the upper-middle band - that span is the fly-in zone.
        const startTop = vh * 0.92;
        const endTop = vh * 0.42;
        t = clamp((startTop - s.top) / (startTop - endTop), 0, 1);
        slotCy = s.top + s.height / 2;
        haveSlot = true;
      }

      const nextVisible = scrolledEnough || t > 0;
      if (nextVisible !== lastVisible) {
        lastVisible = nextVisible;
        setVisible(nextVisible);
      }

      // Reduced motion: no glide - a single snap into the slot half-way
      // through the fly-in zone, otherwise the corner.
      const e = reducedRef.current ? (t >= 0.5 ? 1 : 0) : easeInOut(t);

      const nextDocked = haveSlot && e >= 0.999;
      if (nextDocked !== lastDocked) {
        lastDocked = nextDocked;
        setDocked(nextDocked);
      }

      let tyLocal = 0;
      if (haveSlot && e > 0) {
        tyLocal = ((slotCy - homeCy) * e) / zoom;
      }

      if (tyLocal !== tyRef.current) {
        tyRef.current = tyLocal;
        // 2D translate (not translate3d): a 3D transform / its own composite
        // layer would break the ring's mix-blend against the page.
        const tf = `translate(0px, ${tyLocal}px)`;
        ring.style.transform = tf;
        btn.style.transform = tf;
      }
    };

    // Per-frame driver. The page (and the footer slot) is scrolled by the
    // COMPOSITOR, which keeps painting smoothly on mobile even when `scroll`
    // events fire late or unevenly during momentum. Sampling once per scroll
    // EVENT therefore made the arrow update in chunky steps and visibly lag
    // the footer near the dock. Instead we self-perpetuate a rAF while the
    // page is moving and sample every FRAME, so the arrow tracks the slot at
    // the display refresh rate. The loop parks itself a few idle frames after
    // the scroll settles, so an idle page costs nothing.
    let lastSampledY = Number.NaN;
    let idleFrames = 0;

    const frame = () => {
      rafRef.current = null;
      const y = window.scrollY;
      if (y === lastSampledY) {
        idleFrames += 1;
      } else {
        idleFrames = 0;
        lastSampledY = y;
      }
      measure();
      // Keep ticking while the scroll is live; a few extra frames let any
      // momentum / settle land before we park.
      if (idleFrames < 3) loop();
    };

    const loop = () => {
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(frame);
    };

    const onResize = () => {
      recalcHome();
      lastSampledY = Number.NaN;
      idleFrames = 0;
      loop();
    };

    recalcHome();
    loop();
    window.addEventListener("scroll", loop, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", loop);
      window.removeEventListener("resize", onResize);
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
        className={`${LAYER_BOX} flex items-center justify-center pointer-events-none will-change-transform ${fade} ${vis}`}
      >
        <ScrollToTopButton showRing={false} className="pointer-events-auto" />
      </div>
    </>
  );
}
