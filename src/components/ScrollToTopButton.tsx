"use client";
/* eslint-disable @next/next/no-img-element */
import { useId } from "react";

// Figma 567:2040 — `UpAnimation`.
//   • 130×130 outer hit area (rounded-full).
//   • Centred 56-px orange circle.
//   • Centred up-arrow glyph (~17×24 at lg).
//   • Slow-rotating "ВГОРУ · ВГОРУ · ВГОРУ · ВГОРУ ·" text wrapped
//     around the outside of the orange circle (Figma's circle-text).
//
// Mobile shrinks both the circle and the surrounding text radius
// proportionally so the footer's social row still fits.

type Props = {
  className?: string;
};

// Rotating "ВГОРУ" circle text. SVG `<textPath>` runs the string along
// a circle of radius 55 centred in a 130×130 viewBox (circumference =
// 2π × 55 ≈ 345.6 user units). `textLength={345}` + `lengthAdjust=
// "spacing"` forces the four "ВГОРУ ·" repeats to fill the whole
// circumference — without it, the natural text width was ~280 and a
// noticeable bare arc remained at the bottom. The wrapper carries the
// `quiz-radio-text` class which animates a slow 14-s rotation so the
// curve reads as live, not static.
function CircleText() {
  const pathId = useId();
  // Path starts at the TOP of the circle (65, 10) so the first
  // "ВГОРУ" sits centred at the top of the button — visually anchored
  // to the up-arrow inside.
  return (
    <svg
      viewBox="0 0 130 130"
      className="quiz-radio-text pointer-events-none absolute inset-0 size-full text-neutral-500"
      aria-hidden
    >
      <defs>
        <path
          id={pathId}
          d="M 65 10 A 55 55 0 1 1 65 120 A 55 55 0 1 1 65 10"
          fill="none"
        />
      </defs>
      <text
        className="fill-current"
        style={{
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "var(--font-sans)",
        }}
      >
        <textPath
          href={`#${pathId}`}
          textLength={345}
          lengthAdjust="spacing"
        >
          ВГОРУ · ВГОРУ · ВГОРУ · ВГОРУ ·
        </textPath>
      </text>
    </svg>
  );
}

export function ScrollToTopButton({ className }: Props) {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Догори"
      className={`group relative size-[88px] shrink-0 cursor-pointer sm:size-[110px] lg:size-[130px] ${className ?? ""}`}
    >
      {/* Circle text — light grey, rotates slowly around the centre. */}
      <CircleText />

      {/* Orange circle — Figma 567:2039. */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 size-[44px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand transition-transform duration-300 ease-out group-hover:scale-110 group-active:scale-95 sm:size-[52px] lg:size-[56px]"
      />

      {/* Up-arrow glyph — Figma 567:2038. */}
      <img
        src="/figma-export/footer-up-arrow.svg"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute left-1/2 top-1/2 h-5 w-4 -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 ease-out group-hover:-translate-y-[58%] sm:h-[22px] sm:w-[16px] lg:h-[24px] lg:w-[17px]"
      />
    </button>
  );
}
