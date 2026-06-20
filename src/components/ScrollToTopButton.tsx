"use client";
/* eslint-disable @next/next/no-img-element */
import { useId } from "react";

// Figma 567:2040 - `UpAnimation / Property 1=Default`.
//   - 130x130 component (rounded-full hit area).
//   - Centred 56.17-px orange circle (node 567:2039).
//   - Centred up-arrow glyph, 17.47x23.66 (node 567:2038).
//   - "ВГОРУ" text-on-path wrapped around the outside of the circle
//     (node 567:2018), Manrope Regular 14, on a radius-45.685 ring,
//     repeated 5x.
//
// In Figma this is ONE component used at 130 px on desktop and uniformly
// SCALED to 100 px on mobile - so the circle, arrow and ring text all shrink
// together (mobile: circle 43.2, arrow 13.4x18.2, ring text 10.77). We
// reproduce that faithfully: a single 130-viewBox ring SVG that scales with
// the button (so its radius/font track the box at every size), and the circle
// + arrow sized as fixed PERCENTAGES of the button so they scale with it too.
// The button itself is 100 / 110 / 130 across the mobile / sm / desktop
// breakpoints, matching Figma's two endpoints.
//
// The Figma component SET (567:2041) keyframes the ring at successive rotation
// angles - i.e. the ring SPINS. We reproduce that as one continuous clockwise
// rotation of the text SVG (`up-ring-spin` in globals.css); the orange circle
// + arrow are separate siblings and stay static. Spin is killed under
// prefers-reduced-motion.

type Props = {
  className?: string;
  // When false, the spinning "ВГОРУ" text ring is omitted and the hit area
  // shrinks to just the orange circle. Used by the desktop flight's button
  // layer, where the ring is rendered as a SEPARATE blended fixed layer (so
  // the orange circle is not inverted by the blend).
  showRing?: boolean;
  // Tailwind text-colour class for the ring text (the SVG uses fill-current).
  // Defaults to white (footer = white on the dark footer). The mobile corner
  // FAB overrides it to a dark colour so the text stays readable on the light
  // page instead of relying on mix-blend (which washed out over mid-tones).
  ringColorClassName?: string;
};

// Ring geometry, all from the Figma 130-px master so the SVG is an exact copy
// that simply scales down with its container.
//   * VIEW 130 - the master component size; the SVG fills its box (size-full),
//     so at a 100-px button it renders at 100/130 = 0.769 scale, which lands
//     the ring radius at 35.14 and the font at 10.77 - exactly Figma mobile.
//   * RING_RADIUS 45.685 - half the text-path bbox (91.37) of node 567:2018.
//     The previous code used 39, which (scaled) pulled the text tight against
//     the circle and forced the font down; 45.685 keeps Figma's ~17.6 px gap.
//   * RING_FONT 14 / weight 400 - Manrope Regular, read straight from the
//     Figma text node. (SemiBold renders heavier than the mockup; Regular is
//     what the design uses.)
//   * textLength = ring circumference + lengthAdjust="spacing" - guarantees the
//     5 "ВГОРУ" wrap the full loop with no bare arc regardless of cross-platform
//     Manrope metrics, stretching only the inter-letter gaps (glyph shapes stay
//     intact). The trailing " " after the last "·" is load-bearing: it keeps the
//     gap before the wrap-around "В" identical to every interior gap.
const VIEW = 130;
const RING_RADIUS = 45.685;
const RING_FONT = 14;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
// Unit start direction at ~11 o'clock (preserved from the master's start
// offset), so the first "ВГОРУ" reads centred across the top with «В» near
// 11 o'clock and «У» near 1 o'clock, running clockwise.
const START_UX = -0.52999;
const START_UY = -0.84795;

// The spinning "ВГОРУ" text ring, exported on its own so ScrollUpDock can
// render it as a SEPARATE fixed layer. That separation is what lets the ring
// use `mix-blend-mode: difference` to invert against the page: the blend only
// reaches the page backdrop when it sits on a fixed element directly, not when
// it is nested inside another fixed/transformed (and therefore blend-isolating)
// wrapper. So the blend lives on ScrollUpDock's ring layer, not here; this stays
// plain white and the layer above decides whether to blend it.
function RingTextSvg({ colorClassName = "text-white" }: { colorClassName?: string }) {
  const pathId = useId();
  const c = VIEW / 2;
  const sx = (c + RING_RADIUS * START_UX).toFixed(2);
  const sy = (c + RING_RADIUS * START_UY).toFixed(2);
  const ox = (c - RING_RADIUS * START_UX).toFixed(2);
  const oy = (c - RING_RADIUS * START_UY).toFixed(2);
  const r = RING_RADIUS.toFixed(3);
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className={`up-ring-spin pointer-events-none absolute inset-0 size-full ${colorClassName}`}
      aria-hidden
    >
      <defs>
        <path
          id={pathId}
          d={`M ${sx} ${sy} A ${r} ${r} 0 1 1 ${ox} ${oy} A ${r} ${r} 0 1 1 ${sx} ${sy}`}
          fill="none"
        />
      </defs>
      <text
        className="fill-current"
        xmlSpace="preserve"
        style={{
          fontSize: RING_FONT,
          fontWeight: 400,
          fontFamily: "var(--font-sans)",
        }}
      >
        <textPath
          href={`#${pathId}`}
          textLength={RING_CIRCUMFERENCE}
          lengthAdjust="spacing"
        >
          {"ВГОРУ · ВГОРУ · ВГОРУ · ВГОРУ · ВГОРУ · "}
        </textPath>
      </text>
    </svg>
  );
}

export function RingText({ colorClassName }: { colorClassName?: string }) {
  // One ring SVG at the 130-viewBox master scale. It fills its container, so it
  // scales to whatever button size renders it (100 / 110 / 130), keeping the
  // ring radius and font exactly proportional to the box - the Figma behaviour.
  // colorClassName sets the text colour (default white); the mobile FAB passes
  // a dark colour so the ring reads on the light page without mix-blend.
  return <RingTextSvg colorClassName={colorClassName} />;
}

export function ScrollToTopButton({
  className,
  showRing = true,
  ringColorClassName,
}: Props) {
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
      {/* Circle text - spins continuously (Figma "Up Animation" set).
          Omitted when showRing=false (desktop flight button layer), which
          shows only the orange circle + arrow. */}
      {showRing && <RingText colorClassName={ringColorClassName} />}

      {/* Orange circle - Figma 567:2039 (56.17 in the 130 master). In the ring
          version it is 56.17/130 = 43.21% of the button, so it scales with the
          ring (mobile 43.2, desktop 56.17) - matching Figma's uniformly-scaled
          component. The FAB shows the circle at its full 56 px. Static - Figma
          has no hover. */}
      <span
        aria-hidden
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand ${
          showRing ? "size-[43.21%]" : "size-full"
        }`}
      />

      {/* Up-arrow glyph - Figma 567:2038 (17.47x23.66 in the 130 master). Scales
          with the button in the ring version (13.44% x 18.20%), fixed master
          size in the FAB. Static. */}
      <img
        src="/figma-export/footer-up-arrow.svg"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${
          showRing ? "h-[18.20%] w-[13.44%]" : "h-[24px] w-[17px]"
        }`}
      />
    </button>
  );
}
