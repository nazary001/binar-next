/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";

// Figma Frame 1010106678 lays the 9 partner brands as a 6-column x 3-row
// mosaic of 240x240 cells. The "puzzle" look comes from each cell having
// just SOME corners rounded — the flat edges are where one cell touches
// its neighbour, so the round corners point only to empty space.
//
// Filled cells (col, row) and which corners are rounded (Figma Rect IDs
// referenced for traceability):
//
//   .  .  .  X1 X2 .
//   X3 .  X4 X5 .  X6
//   X7 X8 .  .  X9 .
//
//   X1 (4,1) 122 — all 4 corners.
//   X2 (5,1) 125 — tl, tr, bl     (br aims at empty 6,1).
//   X3 (1,2) 117 — tr, br         (left edge faces section edge).
//   X4 (3,2) 121 — tl, tr, br     (bl aims at empty 2,2).
//   X5 (4,2) 123 — tl, tr, bl     (br aims at empty 5,2).
//   X6 (6,2) 128 — none           (square: section edge / empties).
//   X7 (1,3) 119 — tr, br         (mirrors X3).
//   X8 (2,3) 120 — tl, bl, br     (tr aims at empty 3,3).
//   X9 (5,3) 127 — bl, br         (top aims at empty 5,2).
//
// LG render approach: cells provide only the logo (no border, no
// background, no border-radius), and a single absolute-positioned SVG
// overlay draws every cell's rounded outline as its own <path>. Because
// SVG stroke is center-aligned, two adjacent paths' strokes coincide on
// the same pixel column at every shared edge — the puzzle reads as
// uniform 1-px hairlines throughout, exactly matching Figma's master.
// vector-effect="non-scaling-stroke" keeps each stroke at 1 device
// pixel regardless of how the viewBox scales with the viewport.
//
// Mobile / sm fallback is unchanged: each cell has its own 24-px
// rounded white tile with a stroke-default border — they don't touch
// at any breakpoint below lg so the doubled-border problem doesn't
// apply there.

type Corners = { tl: number; tr: number; br: number; bl: number };

type Partner = {
  src: string;
  imgClass: string;
  col: number;
  row: number;
  corners: Corners;
  // lg grid placement utility classes. Stored as full string literals
  // so Tailwind's scanner picks them up — interpolating `col` into
  // template strings would hide the class from the build.
  pos: string;
};

const CELL = 240;
const RADIUS = 48;
const VIEW_W = 6 * CELL;
const VIEW_H = 3 * CELL;
const STROKE = "#8e8e8f";

const DEFAULT_PARTNERS: Partner[] = [
  {
    src: "/figma-export/hotels/partners/p2.svg",
    imgClass: "lg:h-[83px] lg:w-[124px]",
    col: 4,
    row: 1,
    corners: { tl: RADIUS, tr: RADIUS, br: RADIUS, bl: RADIUS },
    pos: "lg:col-start-4 lg:row-start-1",
  },
  {
    src: "/figma-export/hotels/partners/p4.svg",
    imgClass: "lg:h-[46px] lg:w-[188px]",
    col: 5,
    row: 1,
    corners: { tl: RADIUS, tr: RADIUS, br: 0, bl: RADIUS },
    pos: "lg:col-start-5 lg:row-start-1",
  },
  {
    src: "/figma-export/hotels/partners/p6.svg",
    imgClass: "lg:h-[79px] lg:w-[202px]",
    col: 1,
    row: 2,
    corners: { tl: 0, tr: RADIUS, br: RADIUS, bl: 0 },
    pos: "lg:col-start-1 lg:row-start-2",
  },
  {
    src: "/figma-export/hotels/partners/p9.svg",
    imgClass: "lg:h-[65px] lg:w-[202px]",
    col: 3,
    row: 2,
    corners: { tl: RADIUS, tr: RADIUS, br: RADIUS, bl: 0 },
    pos: "lg:col-start-3 lg:row-start-2",
  },
  {
    src: "/figma-export/hotels/partners/p8.svg",
    imgClass: "lg:h-[44px] lg:w-[176px]",
    col: 4,
    row: 2,
    corners: { tl: RADIUS, tr: RADIUS, br: 0, bl: RADIUS },
    pos: "lg:col-start-4 lg:row-start-2",
  },
  {
    src: "/figma-export/hotels/partners/p5.svg",
    imgClass: "lg:h-[82px] lg:w-[124px]",
    col: 6,
    row: 2,
    corners: { tl: 0, tr: 0, br: 0, bl: 0 },
    pos: "lg:col-start-6 lg:row-start-2",
  },
  {
    src: "/figma-export/hotels/partners/p1.svg",
    imgClass: "lg:h-[57px] lg:w-[166px]",
    col: 1,
    row: 3,
    corners: { tl: 0, tr: RADIUS, br: RADIUS, bl: 0 },
    pos: "lg:col-start-1 lg:row-start-3",
  },
  {
    src: "/figma-export/hotels/partners/p7.svg",
    imgClass: "lg:h-[71px] lg:w-[202px]",
    col: 2,
    row: 3,
    corners: { tl: RADIUS, tr: 0, br: RADIUS, bl: RADIUS },
    pos: "lg:col-start-2 lg:row-start-3",
  },
  {
    src: "/figma-export/hotels/partners/p3.svg",
    imgClass: "lg:h-[62px] lg:w-[202px]",
    col: 5,
    row: 3,
    corners: { tl: 0, tr: 0, br: RADIUS, bl: RADIUS },
    pos: "lg:col-start-5 lg:row-start-3",
  },
];

// Build SVG path for a rounded rectangle with per-corner radii. Each
// corner uses an A (arc) command when its radius > 0; flat corners
// degenerate to straight L commands so the join is sharp.
function roundedRectPath(x: number, y: number, w: number, h: number, c: Corners): string {
  const parts: string[] = [];
  parts.push(`M${x + c.tl} ${y}`);
  parts.push(`L${x + w - c.tr} ${y}`);
  if (c.tr > 0) parts.push(`A${c.tr} ${c.tr} 0 0 1 ${x + w} ${y + c.tr}`);
  parts.push(`L${x + w} ${y + h - c.br}`);
  if (c.br > 0) parts.push(`A${c.br} ${c.br} 0 0 1 ${x + w - c.br} ${y + h}`);
  parts.push(`L${x + c.bl} ${y + h}`);
  if (c.bl > 0) parts.push(`A${c.bl} ${c.bl} 0 0 1 ${x} ${y + h - c.bl}`);
  parts.push(`L${x} ${y + c.tl}`);
  if (c.tl > 0) parts.push(`A${c.tl} ${c.tl} 0 0 1 ${x + c.tl} ${y}`);
  parts.push("Z");
  return parts.join(" ");
}

type PartnerBrandsProps = {
  heading?: ReactNode;
  body?: ReactNode;
  partners?: Partner[];
};

export function PartnerBrands({ heading, body, partners = DEFAULT_PARTNERS }: PartnerBrandsProps = {}) {
  return (
    <section className="bg-white py-16 sm:py-20 lg:py-[160px]">
      {/* Heading row uses the same adaptive padding as other lg sections
          so the text aligns with the design's x=130 column. */}
      <div className="lg-pad-x px-5 sm:px-10">
        <div className="flex flex-col gap-6 sm:gap-8 lg:flex-row lg:items-start lg:gap-8">
          <h2 className="flex-1 lg:max-w-[574px] text-neutral-900">
            {heading ?? (
              <>
                {/* Figma 1384:11956 — single <br> after the bold/light
                    flip-point's first chunk; rest wraps naturally inside
                    the 574-px heading frame, so the rendered break lands
                    as `Партнери-виробники / та бренди, з якими ми /
                    працюємо` (3 lines on lg). */}
                <span className="text-h2-light">Партнери-виробники </span>
                <br aria-hidden className="hidden lg:inline" />
                <span className="text-h2-light">та бренди, </span>
                <span className="text-h2">з якими ми працюємо</span>
              </>
            )}
          </h2>
          <div className="flex-1 max-w-[574px] text-body-sm text-neutral-500">
            {body ?? (
              <p>
                Ми постачаємо продукцію перевірених виробників. Це дає вам
                прогнозовану якість, стабільні характеристики та можливість
                працювати з брендами, які вже є стандартом у своїх категоріях.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mosaic — padded on mobile/sm, edge-to-edge on lg. The lg
          wrapper is `relative` so the SVG overlay can fill the grid
          area precisely; the SVG is the FIRST child and renders behind
          the cells so logos paint on top of the puzzle outline. */}
      <div className="relative mt-10 px-5 sm:mt-12 sm:px-10 lg:mt-[80px] lg:px-0">
        {/* lg-only SVG puzzle outline — one <path> per cell, drawn with
            non-scaling 1-px stroke + white fill. Adjacent paths' strokes
            coincide pixel-perfect on shared edges → uniform 1-px lines
            throughout. Hidden below lg where the per-cell card chrome
            (rounded white tile + border) handles the look.
            `overflow="visible"` is critical: a 1-px center-aligned
            stroke at the very edge of the viewBox (e.g. y=720 for the
            bottom row) extends from y=719.5 to y=720.5, so the bottom
            half (0.5 px) sits outside the viewport. Without
            `overflow: visible` the SVG clips that half and the bottom /
            top / left / right perimeter strokes render as a
            half-thickness hairline — exactly the "too thin" look the
            bottom row had. Setting overflow on the element preserves
            the full 1-px line on every outer edge while keeping every
            inner edge at the same 1-px (since interior path coords are
            well inside the viewBox). */}
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          overflow="visible"
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible lg:block"
        >
          {partners.map((p, i) => (
            <path
              key={i}
              d={roundedRectPath((p.col - 1) * CELL, (p.row - 1) * CELL, CELL, CELL, p.corners)}
              fill="white"
              stroke={STROKE}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        <ul className="relative grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6 lg:grid-rows-3 lg:gap-0">
          {partners.map((p, i) => (
            // The last cell spans 2 columns ONLY in the 2-col mobile grid
            // (`max-sm:`). It must NOT carry any `last:col-span-*` at sm/lg:
            // the `:last-child` pseudo raises specificity above
            // `lg:col-start-*`, so a `col-span` shorthand there overrides the
            // explicit grid-column-start and the last logo auto-places into
            // the wrong column (it "escapes" its puzzle frame, which is drawn
            // separately from p.col/p.row). At sm+ the default span-1 +
            // base `aspect-square` already give the right shape.
            <li
              key={i}
              className={`group flex aspect-square items-center justify-center rounded-[24px] border border-stroke-default bg-white p-3 max-sm:last:col-span-2 max-sm:last:aspect-[2/1] sm:p-4 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 ${p.pos}`}
            >
              <img
                src={p.src}
                alt=""
                aria-hidden
                loading="lazy"
                decoding="async"
                className={`object-contain ${p.imgClass}`}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
