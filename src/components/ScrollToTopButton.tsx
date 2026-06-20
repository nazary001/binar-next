"use client";
/* eslint-disable @next/next/no-img-element */
import { useId } from "react";

// Figma 567:2040 — `UpAnimation / Property 1=Default`.
//   • 130×130 outer hit area (rounded-full).
//   • Centred 56-px orange circle.
//   • Centred up-arrow glyph (~17×24 at lg).
//   • "ВГОРУ · ВГОРУ · ВГОРУ · ВГОРУ ·" text wrapped around the
//     outside of the orange circle (Figma's circle-text).
//
// The Figma component is a SET named "Up Animation" (567:2041) whose
// 4 variants (Default, Variant2-4) keyframe the circular text ring at
// successive rotation angles - i.e. the ring is meant to SPIN. We
// reproduce that as one continuous clockwise rotation of the text SVG
// (`up-ring-spin` in globals.css); the orange circle + arrow are
// separate siblings and stay static. Spin is killed under
// prefers-reduced-motion.
//
// Mobile shrinks both the circle and the surrounding text radius
// proportionally so the footer's social row still fits.

type Props = {
  className?: string;
  // When false, the spinning "ВГОРУ" text ring is omitted and the hit
  // area shrinks to just the orange circle. Used by the floating FAB,
  // where the decorative ring isn't wanted (and a 130-px ghost hit area
  // floating in the corner would block clicks on content beneath it).
  showRing?: boolean;
};

// Static "ВГОРУ" circle text tuned to the Figma master (567:2040)
// at native 1:1 from the 1440-wide footer reference.
//   * Path radius 39 — baseline sits just outside the 28-radius
//     orange circle, matching the design's tight ring spacing.
//   * Path start at ~11 o'clock (-32° from top) so the first
//     "ВГОРУ" reads centred across the top of the circle, with
//     «В» at ~11 o'clock and «У» at ~1 o'clock (Figma layout).
//   * Font size 9 / weight 400 — Manrope at SemiBold on Chrome
//     renders visibly heavier and taller than the Figma mockup;
//     Regular at 9 px matches the mockup stem width and cap
//     height on Windows Chrome.
//   * textLength = 2π × 39 (the exact path circumference) so the
//     text spans the full loop with no bare arc.
//   * lengthAdjust="spacing" stretches only inter-letter gaps,
//     leaving the Manrope glyph shapes intact — matches Figma's
//     natural letterforms. (spacingAndGlyphs would distort the
//     В/Г/О/Р/У glyphs to fit, making them visibly wider than
//     the mockup.)
//   * Text repeats "ВГОРУ · " FOUR times INCLUDING a trailing
//     space at the end. The trailing " " is load-bearing: it
//     makes the gap between the last "·" and the wrap-around
//     point identical to the gap between every interior "·" and
//     its following "В". Without it the 4th dot sits flush
//     against the first "В" while the other three dots sit
//     space-pad-space-padded from their next "В", and the 4th
//     dot reads as visibly closer to its neighbour than the rest.
const PATH_RADIUS = 39;
const PATH_CIRCUMFERENCE = 2 * Math.PI * PATH_RADIUS;

// The spinning "ВГОРУ" text ring, exported on its own so ScrollUpDock can
// render it as a SEPARATE fixed layer. That separation is what lets the ring
// use `mix-blend-mode: difference` to invert against the page: the blend only
// reaches the page backdrop when it sits on a fixed element directly, not when
// it is nested inside another fixed/transformed (and therefore blend-isolating)
// wrapper. So the blend lives on ScrollUpDock's ring layer, not here; this stays
// plain white and the layer above decides whether to blend it.
// One ring SVG at a given square viewBox. The text baseline sits on a
// radius-39 circle centred in the viewBox, starting at ~11 o'clock
// (-32deg from top, the original (44.33,31.93) offset of (-20.67,-33.07)
// from the centre) and running clockwise.
function RingTextSvg({ vb, className }: { vb: number; className?: string }) {
  const pathId = useId();
  const c = vb / 2;
  const sx = (c - 20.67).toFixed(2);
  const sy = (c - 33.07).toFixed(2);
  const ox = (c + 20.67).toFixed(2);
  const oy = (c + 33.07).toFixed(2);
  return (
    <svg
      viewBox={`0 0 ${vb} ${vb}`}
      className={`up-ring-spin pointer-events-none absolute inset-0 size-full text-white ${
        className ?? ""
      }`}
      aria-hidden
    >
      <defs>
        <path
          id={pathId}
          d={`M ${sx} ${sy} A 39 39 0 1 1 ${ox} ${oy} A 39 39 0 1 1 ${sx} ${sy}`}
          fill="none"
        />
      </defs>
      <text
        className="fill-current"
        xmlSpace="preserve"
        style={{
          fontSize: 9,
          fontWeight: 400,
          fontFamily: "var(--font-sans)",
        }}
      >
        <textPath
          href={`#${pathId}`}
          textLength={PATH_CIRCUMFERENCE}
          lengthAdjust="spacing"
        >
          {"ВГОРУ · ВГОРУ · ВГОРУ · ВГОРУ · "}
        </textPath>
      </text>
    </svg>
  );
}

export function RingText() {
  // The orange circle is a fixed 56 px on both mobile and desktop, but a
  // single 130-viewBox ring scales with the button, which pulled the text
  // tight against the circle on the smaller 100-px mobile button (radius
  // ~30 -> ~2 px gap). Render a 100-viewBox ring below lg so the ring
  // radius stays 39 px (matching Figma's ~11 px gap to the circle), and
  // the 130-viewBox ring at lg so desktop is unchanged.
  return (
    <>
      <RingTextSvg vb={100} className="lg:hidden" />
      <RingTextSvg vb={130} className="hidden lg:block" />
    </>
  );
}

export function ScrollToTopButton({ className, showRing = true }: Props) {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Догори"
      className={`group relative shrink-0 cursor-pointer ${
        showRing
          ? "size-[100px] sm:size-[110px] lg:size-[130px]"
          : "size-[56px]"
      } ${className ?? ""}`}
    >
      {/* Circle text — spins continuously (Figma "Up Animation" set).
          Omitted in the FAB (showRing=false), which shows only the
          orange circle + arrow. */}
      {showRing && <RingText />}

      {/* Orange circle — Figma 567:2039. Static — Figma has no hover. */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 size-[56px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand"
      />

      {/* Up-arrow glyph — Figma 567:2038. Static. */}
      <img
        src="/figma-export/footer-up-arrow.svg"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute left-1/2 top-1/2 h-[24px] w-[17px] -translate-x-1/2 -translate-y-1/2"
      />
    </button>
  );
}
