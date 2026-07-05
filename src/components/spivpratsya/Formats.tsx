import { Fragment } from "react";
import { Reveal } from "@/components/ui/Reveal";
import type { CSSProperties } from "react";

// Figma 1870:6117 — "Формати співпраці" section (1440×900).
//
// Layout (1440-master spec):
//   • Title "Формати співпраці" at (130, 160), two-tone Light + Bold
//   • Decoration area at y=328..736 (408 tall):
//       - Top L-frame (Rect 146): 720×204 at (0, 328). 3-sided border
//         (top + right + bottom), opens LEFT toward the section's left
//         edge, rounded-tr-[40px]. Encloses Block A.
//       - Bottom L-frame (Rect 147): 720×204 at (720, 532). 3-sided
//         border (top + left + bottom), opens RIGHT toward the section's
//         right edge, rounded-bl-[40px]. Encloses Block D.
//       - Together the two frames share the midline at y=532 — its
//         bottom-edge of top + top-edge of bottom overlap to draw one
//         continuous 1-px hairline edge-to-edge.
//   • 6 polygon pins (8 px hexagons, 4 dark + 2 brand) at specific
//     decorative break points along the frames.
//   • 4 text blocks (Title/Large + Body/Small in stroke-subtle):
//       - A "Партнер у проєкті" — top-left,  INSIDE top frame
//       - B "Підбір під бюджет" — bottom-left,  outside (free area)
//       - C "Кастомізація" — top-right,  outside (free area)
//       - D "Поставка партіями + зберігання" — bottom-right, INSIDE bottom frame
//
// Below `lg` the decorative frames don't make geometric sense at narrow
// widths, so we drop them entirely and render a clean stacked list of
// the 4 blocks.

type Format = {
  title: string;
  body: string;
};

const FORMATS: Format[] = [
  {
    title: "Партнер у проєкті",
    body: "Ми закриваємо підбір, прорахунок, постачання і контроль якості.",
  },
  {
    title: "Підбір під бюджет",
    body: "Даємо 2–3 варіанти для швидкого рішення клієнта.",
  },
  {
    title: "Кастомізація",
    body: "Дизайн → макети → виробництво → поставка.",
  },
  {
    title: "Поставка партіями + зберігання",
    body: "Для поетапного запуску об’єктів.",
  },
];

function BlockText({ title, body }: Format) {
  // No hover variant — Figma 1870:6120 / 6123 / 6126 / 6129 render the
  // title as static `text-default` (#1d1d1f = neutral-900) and the body
  // as static `text-subtle` (#777779 = neutral-500). Earlier the title
  // also carried `transition-colors duration-300 group-hover/format:
  // text-brand` to flip it orange on hover, but that effect isn't part
  // of the design master so we render the blocks fully static now.
  return (
    <>
      <h3 className="text-title-lg text-neutral-900">{title}</h3>
      <p className="text-body-sm text-neutral-500">{body}</p>
    </>
  );
}

// Hexagon pin — Figma's `Polygon 15` (asset bef51c9a-…) is a regular
// pointed-top hexagon with the exact path `M3.4641 0 L6.9282 2 V6 L3.4641 8 L0 6 V2 Z`
// at a 6.9282×8 viewBox. That's the proper regular-hexagon aspect of
// √3/2 ≈ 0.866 (width/height). Earlier this was clip-path'd inside an
// 8×8 `size-2` span — which stretched the hexagon ~15% horizontally
// (8 / 6.9282 = 1.155). Inline SVG preserves the exact ratio.
function Polygon({
  x,
  y,
  color,
}: {
  x: string;
  y: string;
  color: "brand" | "dark";
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 6.9282 8"
      className={`absolute hidden h-2 w-[6.9282px] -translate-x-1/2 -translate-y-1/2 lg:block ${
        color === "brand" ? "fill-brand" : "fill-neutral-900"
      }`}
      style={{ left: x, top: y }}
    >
      <path d="M3.4641 0L6.9282 2V6L3.4641 8L0 6V2L3.4641 0Z" />
    </svg>
  );
}

// Mobile block order (Figma 3167:5279) differs from the FORMATS array
// (ordered for the desktop decoration): the phone master lists them
// Партнер -> Кастомізація -> Підбір -> Поставка.
const MOBILE_ORDER = [FORMATS[0], FORMATS[2], FORMATS[1], FORMATS[3]];

// Orange hexagon pin for the mobile bordered frame — same glyph as the
// desktop Polygon, visible only below lg, positioned via `style`.
function MobilePolygon({ style }: { style: CSSProperties }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 6.9282 8"
      className="absolute z-10 h-2 w-[6.9282px] -translate-x-1/2 -translate-y-1/2 fill-brand lg:hidden"
      style={style}
    >
      <path d="M3.4641 0L6.9282 2V6L3.4641 8L0 6V2L3.4641 0Z" />
    </svg>
  );
}

// x-position of the orange pin sitting on each between-block divider
// (Figma 3167:5315/5314/5312), keyed by divider index 1..3. Each divider
// span is the 342-px content width (inside the frame's px-6) and the pin
// glyph self-centres via -translate-x-1/2, so these are the pin-BOX
// CENTRES: (figmaLeftInFrame + 4 - 24) / 342.
const DIVIDER_PIN_X = ["", "70.4%", "99.9%", "14.2%"];

// CSS-variable-driven anchor — `--lg-pad-x` is defined globally in
// globals.css at the `:root` level for `min-width: 1024px`. On smaller
// viewports the variable doesn't exist, so we don't bother — the desktop
// decoration tree is `hidden lg:block` anyway. Using the variable
// instead of a hard-coded 130 px keeps the blocks pinned to the same
// design x-positions on viewports wider than 1440 (where the variable
// grows to keep content centered on a 1440 column).
const PAD_LEFT: CSSProperties = { left: "var(--lg-pad-x, 130px)" };
const PAD_RIGHT: CSSProperties = { right: "var(--lg-pad-x, 130px)" };

export function Formats() {
  return (
    // Figma 1870:6117: section background is `Backgroud/Sublte #f8f8f8`
    // with `rounded-[68px]` corners. Earlier code rendered this flat
    // white, making the section indistinguishable from its white
    // neighbours and losing the design's signature "subtle slab"
    // shoulder. Note: the rounded corners only resolve into visible
    // shoulders on viewports where the section can extend edge-to-edge
    // — on the centred 1440 master they bleed into the parent's white,
    // matching Figma.
    // Mobile (3167:5216): the grey slab IS the whole 888-px section,
    // rounded 32 on all four corners (pixel-probed), pt/pb 60.
    <section className="relative w-full bg-bg-subtle px-6 pb-[60px] pt-[60px] max-lg:rounded-[32px] sm:px-10 sm:py-20 lg:rounded-[68px] lg:px-0 lg:py-[160px]">
      {/* Title — left-anchored at lg-pad-x on desktop. No max-width so
          the two-tone "Формати співпраці" stays on one line at the
          44-px Figma size. */}
      <Reveal
        as="h2"
        className="text-neutral-900 lg:[padding-left:var(--lg-pad-x)]"
      >
        <span className="text-h2-light">Формати </span>
        <span className="text-h2">співпраці</span>
      </Reveal>

      {/* === Mobile / tablet — Figma 3167:5279 bordered "L-frame" ===
          A bg-subtle frame with a border on top/right/bottom (open on the
          left, rounded right corners), the 4 blocks REORDERED, hairline
          dividers between them, and 5 orange hexagon pins on the frame
          edges + dividers. === */}
      {/* pt-[47px] / pb-[59px]: Figma draws the frame stroke INSIDE the
          672-px box (content at y48, last block ends at 612); CSS
          border-box adds the 1-px borders on top, so 47+1 and 59+1
          restore the master's 48/60. Dividers carry -mb-px because
          Figma's are zero-height vectors that consume no flow space. */}
      <div className="relative -mx-6 mt-[60px] flex flex-col gap-12 rounded-br-[32px] rounded-tr-[32px] border-b border-r border-t border-stroke-default bg-bg-subtle px-6 pb-[59px] pt-[47px] sm:-mx-10 sm:mt-14 lg:hidden">
        {MOBILE_ORDER.map((f, i) => (
          <Fragment key={f.title}>
            {i > 0 && (
              <span
                aria-hidden
                className="relative -mb-px block h-px w-full bg-stroke-subtle"
              >
                <MobilePolygon style={{ left: DIVIDER_PIN_X[i], top: 0 }} />
              </span>
            )}
            <Reveal direction="up" delay={i * 70} className="flex flex-col gap-4">
              <BlockText {...f} />
            </Reveal>
          </Fragment>
        ))}
        {/* Pins on the frame's top + bottom borders (Figma 3167:5295 / 5310). */}
        <MobilePolygon style={{ left: "11.6%", top: 0 }} />
        <MobilePolygon style={{ left: "69.6%", top: "100%" }} />
      </div>

      {/* === Desktop (lg+) — Figma-exact decoration ===
          Full-width band (edge-to-edge of the section) so the L-frames
          start at x=0 and finish at x=1440 in the design master, same
          as Figma. Blocks are pinned to lg-pad-x on left/right so their
          text stays at the design's x=130 / x=1310 column lines on any
          viewport (including > 1440). Margin-top 120 px matches the
          Figma gap between title (ends at y=208) and curve area top
          (y=328). */}
      <div className="relative mt-[152px] hidden h-[408px] w-full lg:mt-[120px] lg:block">
        {/* Top L-frame — 50%×50% at top-left. Borders on top, right,
            bottom (opens LEFT). Rounded top-right (40 px). */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-1/2 w-1/2 rounded-tr-[40px] border-y border-r border-stroke-default"
        />
        {/* Bottom L-frame — 50%×50% at bottom-right. Borders on top,
            left, bottom (opens RIGHT). Rounded bottom-left (40 px).
            Shares the midline edge with the top frame. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-1/2 w-1/2 rounded-bl-[40px] border-y border-l border-stroke-default"
        />

        {/* Block A — INSIDE top frame, pinned to lg-pad-x left.
            Vertical center within the frame matches Figma's
            (y=392 within section, = 64 within curve area, ≈ 15.7%).
            Anchored at `top` corresponding to text top edge, with
            translate to center optically. */}
        <Reveal
          delay={0}
          direction="up"
          className="absolute flex w-[505px] flex-col gap-6"
          style={{ ...PAD_LEFT, top: "15.7%" }}
        >
          <BlockText title={FORMATS[0].title} body={FORMATS[0].body} />
        </Reveal>

        {/* Block C — top-right (free area, outside frames). Pinned to
            lg-pad-x right. Same vertical position as Block A. */}
        <Reveal
          delay={140}
          direction="up"
          className="absolute flex w-[473px] flex-col gap-6"
          style={{ ...PAD_RIGHT, top: "15.7%" }}
        >
          <BlockText title={FORMATS[2].title} body={FORMATS[2].body} />
        </Reveal>

        {/* Block B — bottom-left (free area). y=596 within section =
            268 within curve area, ≈ 65.7%. */}
        <Reveal
          delay={70}
          direction="up"
          className="absolute flex w-[473px] flex-col gap-6"
          style={{ ...PAD_LEFT, top: "65.7%" }}
        >
          <BlockText title={FORMATS[1].title} body={FORMATS[1].body} />
        </Reveal>

        {/* Block D — INSIDE bottom frame. */}
        <Reveal
          delay={210}
          direction="up"
          className="absolute flex w-[473px] flex-col gap-6"
          style={{ ...PAD_RIGHT, top: "65.7%" }}
        >
          <BlockText title={FORMATS[3].title} body={FORMATS[3].body} />
        </Reveal>

        {/* Polygon pins — Figma coords are the polygon BOX's top-left
            corner (each box is 8×8). The Polygon component uses
            `-translate-(x|y)-1/2` so its centre lands on (x, y). We
            therefore convert Figma's top-left to the box CENTER:
            centre = top-left + (4, 4) — then divide by section width
            1440 and curve-area height 408. */}
        <Polygon x="9.03%"  y="0%"      color="brand" /> {/* P13 c (130, 328) */}
        <Polygon x="50%"    y="19.12%"  color="brand" /> {/* P15 c (720, 406) */}
        <Polygon x="27.85%" y="50%"     color="brand" /> {/* P17 c (401, 532) */}
        <Polygon x="76.94%" y="50%"     color="brand" /> {/* P12 c (1108, 532) */}
        <Polygon x="59.31%" y="100%"    color="brand" /> {/* P14 c (854, 736) */}
        <Polygon x="88.68%" y="100%"    color="brand" /> {/* P16 c (1277, 736) */}
      </div>
    </section>
  );
}
