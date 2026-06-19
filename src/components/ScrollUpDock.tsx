"use client";
import { useEffect, useRef, useState } from "react";
import { RingText, ScrollToTopButton } from "./ScrollToTopButton";

// One single "scroll to top" arrow, in two modes.
//
//   DESKTOP (mouse, >= 1024px) - it TRAVELS. Near the top it is hidden; once you
//   scroll down it appears, fixed, in the bottom-right corner, then as the
//   footer scrolls up it glides vertically into the footer's
//   [data-scrollup-slot] placeholder, scroll-linked. The glide is a pure
//   function of scroll position, recomputed every animation frame in JS. See
//   DockFlight.
//
//   TOUCH / MOBILE - that JS-per-frame flight CANNOT stay in sync with the
//   browser's compositor-driven touch scrolling: during a finger drag the
//   main-thread scroll/viewport values lag what is actually painted, so the
//   arrow lands in the wrong place mid-drag and only snaps right when the finger
//   lifts. So on touch we DROP the flight: a fixed corner FAB that only ever
//   changes OPACITY (immune to that desync) hands off to a STATIC ring rendered
//   in the footer slot (FooterScrollUpSlot), which scrolls in natively with the
//   footer. No fixed element is positioned from scroll, so nothing can desync.
//   See CornerFab + FooterScrollUpSlot.
//
// TWO LAYERS, not one (both the flight and the FAB): `mix-blend-mode: difference`
// only reaches the page backdrop on a `position: fixed` element directly -
// nesting it inside another fixed/transformed wrapper isolates the blend. So the
// spinning "ВГОРУ" ring is its own fixed layer (blended, inverts against the
// page) and the orange circle + arrow are a second fixed layer (un-blended, so
// the brand circle keeps its colour). Both share the exact same box so they stay
// concentric.

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

// Cubic ease-in-out - slow start, slow finish; reads as a premium glide.
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

// Same size + corner anchor for both fixed layers so they stay concentric and
// dock onto the footer slot (which reserves the identical 88/110/130 footprint).
const LAYER_BOX =
  "fixed bottom-5 right-5 z-40 size-[88px] sm:bottom-8 sm:right-8 sm:size-[110px] lg:size-[130px]";

// prefers-reduced-motion, tracked live and mirrored into a ref by callers that
// need it inside a rAF loop without re-subscribing.
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

// True only on a real pointer device at the desktop breakpoint - the one place
// the scroll-linked flight is safe (no touch scroll to desync against, and the
// >= 1024px zoom layout its math is tuned for). Every phone and touch tablet
// gets the stable hand-off instead. Defaults to false so SSR and the first
// client render agree on the hand-off markup; desktop upgrades to the flight
// right after mount, before anything has been scrolled into view.
function useFlightMode() {
  const [flight, setFlight] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const sync = () => setFlight(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return flight;
}

export function ScrollUpDock() {
  return useFlightMode() ? <DockFlight /> : <CornerFab />;
}

// ---------------------------------------------------------------------------
// DESKTOP flight. Two fixed layers glide from the corner into the footer slot,
// their shared vertical transform recomputed every animation frame from the
// slot's live position. Touch devices never mount this (see useFlightMode).
// ---------------------------------------------------------------------------
function DockFlight() {
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
  const reduced = usePrefersReducedMotion();
  // Mirror into a ref so the rAF loop reads the current value without
  // re-subscribing (writing a ref during render is disallowed).
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

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
    // plus a second getBoundingClientRect on the button. We measure them once
    // here and on resize instead, leaving ONE slot rect read per frame (the
    // slot is the only thing that genuinely moves with scroll).
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
    // compositor, which keeps painting smoothly even when `scroll` events fire
    // late or unevenly. Sampling once per scroll EVENT made the arrow update in
    // chunky steps and lag the footer near the dock. Instead we self-perpetuate
    // a rAF while the page is moving and sample every FRAME, parking a few idle
    // frames after the scroll settles so an idle page costs nothing.
    let lastSampledY = Number.NaN;
    let idleFrames = 0;

    const frame = () => {
      rafRef.current = null;
      const y = window.scrollY;
      if (y === lastSampledY) idleFrames += 1;
      else {
        idleFrames = 0;
        lastSampledY = y;
      }
      measure();
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
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        // Null it so a re-run of this effect (StrictMode double-invoke, or a
        // remount when the flight/hand-off mode flips) sees no pending frame
        // and reschedules. Leaving the stale id here would wedge loop()'s
        // `== null` guard and the rAF would never run again.
        rafRef.current = null;
      }
    };
  }, []);

  // Only opacity transitions - the flight transform is set imperatively each
  // frame and must NOT be eased by CSS or it would lag the scroll.
  const fade = reduced ? "" : "transition-opacity duration-300 ease-out";
  const vis = visible ? "opacity-100" : "pointer-events-none opacity-0";

  return (
    <>
      {/* Ring layer - mix-blend-difference inverts the white "ВГОРУ" text
          against the page while floating; dropped once docked so the text is
          plain white over the dark footer. */}
      <div
        ref={ringRef}
        aria-hidden
        className={`${LAYER_BOX} pointer-events-none ${fade} ${vis} ${
          docked ? "" : "mix-blend-difference"
        }`}
      >
        <RingText />
      </div>

      {/* Button layer - orange circle + arrow, clickable. The box is
          pointer-events-none so only the inner circle catches clicks; `inert`
          pulls it from the a11y tree while hidden. */}
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

// ---------------------------------------------------------------------------
// TOUCH / MOBILE hand-off. A fixed corner FAB that only ever changes OPACITY -
// never position - so it is immune to the touch-scroll desync that made the
// flight jump. It fades in once you have scrolled down and fades back out as the
// footer (and its own static ring, FooterScrollUpSlot) comes up, so the two
// never both sit on screen. Footer proximity is read with an IntersectionObserver
// (async, compositor-friendly); the scroll threshold is a passive listener that
// only toggles a boolean. Nothing here forces layout or positions on scroll.
// ---------------------------------------------------------------------------
function CornerFab() {
  const [scrolledDown, setScrolledDown] = useState(false);
  const [footerNear, setFooterNear] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    let lastDown: boolean | null = null;
    const onScroll = () => {
      const down = window.scrollY > window.innerHeight * 0.6;
      if (down !== lastDown) {
        lastDown = down;
        setScrolledDown(down);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Fade the FAB out as the footer slot approaches. The rootMargin extends
    // the viewport's bottom by half a screen, so "near" fires while the slot is
    // still ~half a viewport below the fold - the FAB has fully faded by the
    // time the footer's own static ring scrolls into view.
    const slot = document.querySelector<HTMLElement>("[data-scrollup-slot]");
    let io: IntersectionObserver | null = null;
    if (slot) {
      io = new IntersectionObserver(
        ([entry]) => setFooterNear(entry.isIntersecting),
        { rootMargin: "0px 0px 50% 0px" }
      );
      io.observe(slot);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      io?.disconnect();
    };
  }, []);

  const show = scrolledDown && !footerNear;
  const fade = reduced ? "" : "transition-opacity duration-300 ease-out";
  const vis = show ? "opacity-100" : "pointer-events-none opacity-0";

  return (
    <>
      <div
        aria-hidden
        className={`${LAYER_BOX} pointer-events-none mix-blend-difference ${fade} ${vis}`}
      >
        <RingText />
      </div>
      <div
        inert={!show}
        className={`${LAYER_BOX} flex items-center justify-center pointer-events-none ${fade} ${vis}`}
      >
        <ScrollToTopButton showRing={false} className="pointer-events-auto" />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// The footer's docking slot. On the desktop flight it stays an empty placeholder
// that just reserves the button's footprint (the travelling arrow flies in to
// fill it). On touch it instead renders the REAL ring statically, so it scrolls
// in with the footer natively (no JS, no desync) - the docked half of the
// hand-off. Either way it keeps [data-scrollup-slot] and the same box size, so
// the footer row layout is identical and CornerFab can observe it.
// ---------------------------------------------------------------------------
export function FooterScrollUpSlot() {
  const flight = useFlightMode();
  return (
    <div
      data-scrollup-slot
      aria-hidden={flight ? true : undefined}
      className="flex shrink-0 items-center justify-center size-[88px] sm:size-[110px] lg:size-[130px]"
    >
      {!flight && <ScrollToTopButton showRing />}
    </div>
  );
}
