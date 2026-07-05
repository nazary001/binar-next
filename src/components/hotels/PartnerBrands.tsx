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
  // Mobile (<lg) logo size. Figma master 3117:16390 sizes each logo in
  // px inside a 195-px cell; kept as full literals for the scanner.
  imgClassM: string;
  // Mobile (<lg) cell chrome: border + the single rounded corner the
  // Figma master draws on this cell (others are borderless). lg:* in the
  // <li> strips all of it so desktop is unchanged.
  mb: string;
  // Mobile (<lg) DOM order (order-1..order-9 = the phone cell index) plus
  // lg:order-none to restore desktop, where placement is driven by
  // lg:col-start/lg:row-start and is independent of DOM order. Explicit on
  // every entry so the two logos the phone layout swaps (p1 and p5) land in
  // their Figma cells without shifting their neighbours.
  orderM: string;
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
    // Phone (1,1): bordered, top-right corner rounded.
    imgClassM: "h-[56px] w-[84px]",
    mb: "border border-stroke-default rounded-tr-[32px]",
    orderM: "order-1 lg:order-none",
    col: 4,
    row: 1,
    corners: { tl: RADIUS, tr: RADIUS, br: RADIUS, bl: RADIUS },
    pos: "lg:col-start-4 lg:row-start-1",
  },
  {
    src: "/figma-export/hotels/partners/p4.svg",
    imgClass: "lg:h-[46px] lg:w-[188px]",
    // Phone (2,1): borderless.
    imgClassM: "h-[32px] w-[128px]",
    mb: "",
    orderM: "order-2 lg:order-none",
    col: 5,
    row: 1,
    corners: { tl: RADIUS, tr: RADIUS, br: 0, bl: RADIUS },
    pos: "lg:col-start-5 lg:row-start-1",
  },
  {
    src: "/figma-export/hotels/partners/p6.svg",
    imgClass: "lg:h-[79px] lg:w-[202px]",
    // Phone (1,2): borderless.
    imgClassM: "h-[54px] w-[137px]",
    mb: "",
    orderM: "order-3 lg:order-none",
    col: 1,
    row: 2,
    corners: { tl: 0, tr: RADIUS, br: RADIUS, bl: 0 },
    pos: "lg:col-start-1 lg:row-start-2",
  },
  {
    src: "/figma-export/hotels/partners/p9.svg",
    imgClass: "lg:h-[65px] lg:w-[202px]",
    // Phone (2,2): bordered, bottom-left corner rounded.
    imgClassM: "h-[44px] w-[137px]",
    mb: "border border-stroke-default rounded-bl-[32px]",
    orderM: "order-4 lg:order-none",
    col: 3,
    row: 2,
    corners: { tl: RADIUS, tr: RADIUS, br: RADIUS, bl: 0 },
    pos: "lg:col-start-3 lg:row-start-2",
  },
  {
    src: "/figma-export/hotels/partners/p8.svg",
    imgClass: "lg:h-[44px] lg:w-[176px]",
    // Phone (1,3): bordered, top-right corner rounded.
    imgClassM: "h-[30px] w-[120px]",
    mb: "border border-stroke-default rounded-tr-[32px]",
    orderM: "order-5 lg:order-none",
    col: 4,
    row: 2,
    corners: { tl: RADIUS, tr: RADIUS, br: 0, bl: RADIUS },
    pos: "lg:col-start-4 lg:row-start-2",
  },
  {
    src: "/figma-export/hotels/partners/p5.svg",
    imgClass: "lg:h-[82px] lg:w-[124px]",
    // Phone (1,4): borderless. The phone layout places this logo one cell
    // later than the desktop source order, so it takes mobile cell 7 while
    // p1 (next entry) takes cell 6. lg:order-none restores desktop, where
    // placement is by lg:col-start/lg:row-start regardless of DOM order.
    imgClassM: "h-[56px] w-[84px]",
    mb: "",
    orderM: "order-7 lg:order-none",
    col: 6,
    row: 2,
    corners: { tl: 0, tr: 0, br: 0, bl: 0 },
    pos: "lg:col-start-6 lg:row-start-2",
  },
  {
    src: "/figma-export/hotels/partners/p1.svg",
    imgClass: "lg:h-[57px] lg:w-[166px]",
    // Phone (2,3): borderless. Takes mobile cell 6 (one cell earlier than
    // desktop order); lg:order-none restores the desktop sequence.
    imgClassM: "h-[39px] w-[112px]",
    mb: "",
    orderM: "order-6 lg:order-none",
    col: 1,
    row: 3,
    corners: { tl: 0, tr: RADIUS, br: RADIUS, bl: 0 },
    pos: "lg:col-start-1 lg:row-start-3",
  },
  {
    src: "/figma-export/hotels/partners/p7.svg",
    imgClass: "lg:h-[71px] lg:w-[202px]",
    // Phone (2,4): bordered, bottom-left corner rounded.
    imgClassM: "h-[48px] w-[137px]",
    mb: "border border-stroke-default rounded-bl-[32px]",
    orderM: "order-8 lg:order-none",
    col: 2,
    row: 3,
    corners: { tl: RADIUS, tr: 0, br: RADIUS, bl: RADIUS },
    pos: "lg:col-start-2 lg:row-start-3",
  },
  {
    src: "/figma-export/hotels/partners/p3.svg",
    imgClass: "lg:h-[62px] lg:w-[202px]",
    // Phone (1,5): bordered, top-right and bottom-right corners rounded.
    imgClassM: "h-[42px] w-[137px]",
    mb: "border border-stroke-default rounded-tr-[32px] rounded-br-[32px]",
    orderM: "order-9 lg:order-none",
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

// Mobile (<lg) puzzle outline, drawn as ONE svg exactly like the desktop
// grid: every tile path shares a single coordinate system + rasteriser,
// so segments of the same line painted by different tiles can never land
// on different pixel rows/columns (the per-tile border/overlay approach
// still stair-stepped on fractional-DPR screens). Cells are 195-square
// on the 390 master (2 cols x 5 rows); the bordered cells + their single
// rounded corners mirror the `mb` chrome of DEFAULT_PARTNERS.
const MOBILE_CELL = 195;
const MOBILE_R = 32;
const MOBILE_TILES: { col: number; row: number; corners: Corners }[] = [
  { col: 1, row: 1, corners: { tl: 0, tr: MOBILE_R, br: 0, bl: 0 } }, // p2
  { col: 2, row: 2, corners: { tl: 0, tr: 0, br: 0, bl: MOBILE_R } }, // p9
  { col: 1, row: 3, corners: { tl: 0, tr: MOBILE_R, br: 0, bl: 0 } }, // p8
  { col: 2, row: 4, corners: { tl: 0, tr: 0, br: 0, bl: MOBILE_R } }, // p7
  { col: 1, row: 5, corners: { tl: 0, tr: MOBILE_R, br: MOBILE_R, bl: 0 } }, // p3
];

type PartnerBrandsProps = {
  heading?: ReactNode;
  body?: ReactNode;
  partners?: Partner[];
};

export function PartnerBrands({ heading, body, partners = DEFAULT_PARTNERS }: PartnerBrandsProps = {}) {
  return (
    <section className="bg-white pt-[60px] pb-[60px] sm:pt-[60px] sm:pb-[60px] lg:py-[160px]">
      {/* Heading row uses the same adaptive padding as other lg sections
          so the text aligns with the design's x=130 column. */}
      <div className="lg-pad-x px-6 sm:px-10">
        <div className="flex flex-col gap-6 sm:gap-8 lg:flex-row lg:items-start lg:gap-8">
          <h2 className="flex-1 lg:max-w-[574px] text-neutral-900">
            {heading ?? (
              <>
                {/* Single <br> after the light flip-point's first chunk;
                    rest wraps naturally inside the heading frame, so the
                    rendered break lands as `Партнери-виробники / та бренди,
                    з якими ми / працюємо` (3 lines on lg). Figma phone
                    master 3117:16388 keeps the same <br> on mobile, so the
                    break renders at every breakpoint (was lg-only before). */}
                <span className="text-h2-light">Партнери-виробники </span>
                <br aria-hidden />
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

      {/* Mosaic — edge-to-edge at every breakpoint. Figma phone master
          3117:16390 runs the 2-col puzzle full-bleed (two 195-px cells =
          390-px frame, no side gutter), and the lg master is likewise
          edge-to-edge. The lg wrapper is `relative` so the SVG overlay can
          fill the grid area precisely; the SVG is the FIRST child and
          renders behind the cells so logos paint on top of the puzzle
          outline. */}
      <div className="relative mt-12 px-0 sm:mt-12 lg:mt-[80px] lg:px-0">
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

        {/* Mobile (<lg) puzzle outline — same coinciding-stroke SVG
            technique as the desktop grid above, so every shared line is
            drawn once, in one coordinate system, and stays perfectly
            straight on any DPR (per-tile CSS borders/overlays kept
            producing a visible 1px step where a line passed from a col-1
            tile to a col-2 tile on fractional device-pixel ratios). */}
        <svg
          viewBox={`0 0 ${2 * MOBILE_CELL} ${5 * MOBILE_CELL}`}
          preserveAspectRatio="none"
          overflow="visible"
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible lg:hidden"
        >
          {MOBILE_TILES.map((t, i) => (
            <path
              key={i}
              d={roundedRectPath(
                (t.col - 1) * MOBILE_CELL,
                (t.row - 1) * MOBILE_CELL,
                MOBILE_CELL,
                MOBILE_CELL,
                t.corners
              )}
              fill="none"
              stroke={STROKE}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        <ul className="relative grid grid-cols-2 gap-0 lg:grid-cols-6 lg:grid-rows-3 lg:gap-0">
          {partners.map((p, i) => (
            // Mobile (<lg): square cells touch edge-to-edge (gap-0); the
            // puzzle outline is painted by the mobile SVG above, so the
            // cells themselves carry no chrome. p.orderM swaps the two
            // logos the phone layout reorders relative to the desktop
            // source array, with lg:order-none restoring desktop order;
            // lg placement stays on lg:col-start/lg:row-start.
            <li
              key={i}
              className={`group relative flex aspect-square items-center justify-center lg:bg-transparent lg:p-0 ${p.orderM} ${p.pos}`}
            >
              <img
                src={p.src}
                alt=""
                aria-hidden
                loading="lazy"
                decoding="async"
                className={`object-contain ${p.imgClassM} ${p.imgClass}`}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
