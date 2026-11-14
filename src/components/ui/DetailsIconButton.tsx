/* eslint-disable @next/next/no-img-element */
import { useId } from "react";

// Shared hover icon-button used by the hotels ZonesGrid cards and the
// catalog category banners — both are instances of the same Figma
// component set ("Property 1=Default/Hover, Fill=yes/no", 1127:5789).
// Default shows an outlined arrow square; the parent card's .group
// hover fills it brand-orange and fades in the rotating "ДЕТАЛІ" ring.
// A .group that carries `data-active` (a /catalog banner whose popover
// holds the pointer, catalog/ZoneCard) keeps the same hover look from 640.

const ARROW_WHITE = "/figma-export/hero/arrow-up-right.svg";
const ARROW_DARK = "/figma-export/directions/arrow-up-right-dark.svg";

// "ДЕТАЛІ · ДЕТАЛІ" curving around the icon button — only revealed on
// the parent card's hover state. Figma node 1333:7835 (hover state for
// the white-variant icon button on image cards) shows the rotating
// text in WHITE against the desaturated photo. For the dark variant
// (compact cards) the text sits on top of a white
// card surface, so we keep it in neutral-900 there.
//
// Path geometry: Figma "Circle text" master 572:4542 is an 86×86 frame
// with the text-path bounds at (10.83, 10.83) size 64.37 — i.e. a
// radius-32 circle centred at (44, 44). We mirror that in an 88×88
// viewBox (icon 52 + -inset-18 wrapper). The Figma text-path 2567:2617
// spells the ring with FIVE "ДЕТАЛІ" reps (not four). At 9 px Manrope
// Regular five reps sit just under the ~201 path circumference
// (2*pi*32), so `textLength=201` + `lengthAdjust="spacing"` evens out
// only the inter-glyph SPACING to fill the loop seamlessly WITHOUT
// stretching the glyph shapes. (The earlier four-rep Bold version used
// `spacingAndGlyphs`, which deformed the glyphs to fill the ring.)
// Same approach as the ScrollToTopButton circle text.
//
// `text` and `radius` let another ring of the same Figma family reuse
// this one: the catalog cart disc's «У КОШИК» ring is the text-path
// I2766:4586;1127:5860, a radius-36 circle around the same 52-px disc
// (catalog/CartDisc.tsx; asked for by the designer on 2026-11-11). The
// defaults are the «ДЕТАЛІ» ring described above.
const DETAILS_PATH_RADIUS = 32;
const DETAILS_TEXT = "ДЕТАЛІ · ДЕТАЛІ · ДЕТАЛІ · ДЕТАЛІ · ДЕТАЛІ · ";

export function DetailsCircleText({
  variant,
  text = DETAILS_TEXT,
  radius = DETAILS_PATH_RADIUS,
}: {
  variant: "light" | "dark";
  text?: string;
  radius?: number;
}) {
  const pathId = useId();
  return (
    <svg
      viewBox="0 0 88 88"
      className={`zones-details-text pointer-events-none absolute inset-0 size-full ${
        variant === "light" ? "text-white" : "text-neutral-900"
      }`}
      aria-hidden
    >
      <defs>
        <path
          id={pathId}
          d={`M 44 ${44 - radius} A ${radius} ${radius} 0 1 1 44 ${44 + radius} A ${radius} ${radius} 0 1 1 44 ${44 - radius}`}
          fill="none"
        />
      </defs>
      <text
        className="fill-current"
        // xml:space="preserve" keeps the TRAILING space after the last
        // "ДЕТАЛІ · ". Without it SVG trims trailing whitespace, so at the
        // loop seam the final "·" butts straight against the first "Д"
        // (one dot reads too close to the word). Preserving it makes the
        // seam gap identical to every interior " · " gap. textLength +
        // lengthAdjust live on the textPath so only spacing is evened
        // out to fill the ring (glyph shapes stay intact).
        xmlSpace="preserve"
        style={{
          fontSize: 9,
          fontWeight: 400,
          fontFamily: "var(--font-sans)",
        }}
      >
        <textPath
          href={`#${pathId}`}
          textLength={2 * Math.PI * radius}
          lengthAdjust="spacing"
        >
          {text}
        </textPath>
      </text>
    </svg>
  );
}

// Icon button that morphs on the parent card's hover:
//   default — outlined (white border for light variant, dark border
//             + white fill for dark variant) with the matching arrow
//   hover  — solid brand-orange background with a white arrow, and
//            the "ДЕТАЛІ" circular text fades in around it
// All transitions sit on the icon itself (not the parent), and arrow
// images are layered with opacity-fade so they swap smoothly between
// the default + hover assets without a flicker.
//
// lg matches Figma master 1127:5808 (52x52 outlined). NOTE: Figma's
// arrow lives in a 24px `heroicons-outline/arrow-up-right` container
// with the glyph inset 15.62%, so the VISIBLE arrow is ~16.5px, NOT
// 24px. Sizing the img to 16.5 keeps the stroke exactly as thin as the
// design (the old size-6 / 24px rendered the arrow ~1.45x too big, so
// its lines looked too thick).
// `ring` (default true) draws the rotating text ring on hover. Every
// caller shows it: the hotels landing zones, and since the designer's
// 2026-11-11 note ("our circle that spins on hover") the catalog banners
// and the direction carousel too (render 4329:39265 shows the ring; its
// ctx export omits that layer). `ring={false}` stays for a card that
// must not show it.
export function DetailsIconButton({ variant, ring = true }: { variant: "light" | "dark"; ring?: boolean }) {
  return (
    <span className="relative size-[52px] shrink-0">
      {/* Circular ДЕТАЛІ text — wrapper grows in lock-step with the
          icon so the 88-unit SVG viewBox stays centred and the path
          radius reads as a consistent ring around the icon. Hidden by
          default; the parent card's :hover state fades it in. */}
      {ring && (
        <span className="pointer-events-none absolute -inset-[18px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:group-data-[active]:opacity-100">
          <DetailsCircleText variant={variant} />
        </span>
      )}

      <span
        className={`absolute inset-0 flex items-center justify-center rounded-[26px] border transition-[background-color,border-color] duration-300 ${
          variant === "light" ? "border-white" : "border-neutral-900 bg-white"
        } group-hover:border-brand group-hover:bg-brand lg:group-data-[active]:border-brand lg:group-data-[active]:bg-brand`}
      >
        {/* Default arrow — fades out on hover. */}
        <img
          src={variant === "light" ? ARROW_WHITE : ARROW_DARK}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute size-[16.5px] transition-opacity duration-300 group-hover:opacity-0 lg:group-data-[active]:opacity-0"
        />
        {/* Hover arrow (always white, fades in over the orange fill). */}
        <img
          src={ARROW_WHITE}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute size-[16.5px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:group-data-[active]:opacity-100"
        />
      </span>
    </span>
  );
}
