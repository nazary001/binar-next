/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

// Icon sizes are % of the 52px container so the visible glyph matches
// Figma's Frame 63..66 1:1: container has a 9px inner inset (icon zone
// 34x34), then each glyph has its own inset inside that 34px square.
// Hotel SVG is natively wide (viewBox 29.38 x 13.79), so we size the
// img to keep that aspect and apply rotate-90 to render it as a
// vertical key, matching the design.
const INDUSTRIES = [
  {
    label: "Готелів",
    icon: "/figma-export/hero/icon-hotel.svg",
    iconClass: "w-[60%] h-[28%] rotate-90",
  },
  {
    label: "Салонів краси",
    icon: "/figma-export/hero/icon-beauty.svg",
    iconClass: "size-[50%]",
  },
  {
    label: "Медичних закладів",
    icon: "/figma-export/hero/icon-medical.svg",
    iconClass: "w-[60%] h-[50%]",
  },
  {
    label: "Виробничих підприємств",
    icon: "/figma-export/hero/icon-factory.svg",
    iconClass: "w-[56%] h-[53%]",
  },
];

type DotConfig = {
  // Position in the photo column (% of 603×746).
  left: string;
  top: string;
  popup: {
    label: string;
    image: string;
    // Image-crop transform copied from Figma so the popup thumbnail
    // matches the designer's framing within the 160×160 box.
    imgSize: number;
    imgLeft: number;
    imgTop: number;
  };
  // Horizontal anchor for the popup so it never overflows the photo:
  // center for dots near the middle, left/right for dots near the edges.
  popupAnchor: "center" | "left" | "right";
};

// Dot positions are the VISIBLE-CENTER coordinates of each Figma Dot
// instance on the 603×746 photo column (Figma node 1384:12660).
//
// In Figma the Dot frames sit at:
//   accessories  → top-left (125, 339), size 32 → centre (141, 355)
//   textile      → top-left (520, 421), size 32 → centre (536, 437)
//   cosmetics    → top-left  (48, 445), size 32 → centre  (64, 461)
//
// CSS positions the button via `left/top` + `transform: translate(-50%,
// -50%)` so the button's CENTRE lands on (left, top). Storing the
// percentages relative to the Figma CENTRE (not the Figma top-left, as
// the previous values did - that offset every dot by -16 / -16 px
// from its product) keeps the visible dot circles glued to the photo
// features at every stage size, since the .hero-photo-canvas locks
// the aspect to 603/746.
const DOTS: DotConfig[] = [
  {
    // Cup with toothbrush - top-center. Centre (141, 355) on 603×746.
    left: "23.38%",
    top: "47.59%",
    popup: {
      label: "аксесуари",
      image: "/figma-export/hero/popup-accessories.png",
      imgSize: 196.34,
      imgLeft: -13.03,
      imgTop: -18.94,
    },
    popupAnchor: "center",
  },
  {
    // HAND SOAP bottle - right. Centre (536, 437) on 603×746.
    left: "88.89%",
    top: "58.58%",
    popup: {
      label: "текстиль",
      image: "/figma-export/hero/popup-textile.png",
      imgSize: 275.958,
      imgLeft: -82.61,
      imgTop: -53.68,
    },
    popupAnchor: "right",
  },
  {
    // SHOWER GEL tube - bottom-left. Centre (64, 461) on 603×746.
    left: "10.61%",
    top: "61.80%",
    popup: {
      label: "косметика",
      image: "/figma-export/hero/popup-cosmetics.png",
      imgSize: 199.556,
      imgLeft: -28.92,
      imgTop: -16.02,
    },
    popupAnchor: "left",
  },
];

function DotMarker({ left, top, popup, popupAnchor }: DotConfig) {
  // "Glass breath" hotspot: the outer ring and the inner solid
  // animate in OPPOSITE directions on a synchronised 3.5 s cycle.
  //
  //   1. Outer ring (the <circle class="dot-pulse-outer">) -
  //      shrinks scale 1 -> 0.78 -> 1. The translucent dark frame
  //      contracts so the bright centre can expand through it.
  //   2. Inner solid (the <circle class="dot-pulse-inner">) -
  //      expands scale 1 -> 1.65 -> 1 AND fades opacity 1 -> 0.32
  //      -> 1. At the peak the inner has pushed past the shrunken
  //      outer ring AND become "glassy" - the photo bleeds through
  //      the semi-transparent white, like frosted glass.
  //
  // Both circles live inside a SINGLE inline SVG with viewBox
  // 0 0 32 32 and cx=cy=16 - one shared coordinate system means the
  // SVG rasteriser draws them at the exact same centre, regardless
  // of where the host button lands on the device-pixel grid. The
  // previous IMG-based approach (one image for each circle) was
  // hitting sub-pixel rounding at DPR 1: at fractional button
  // x-positions (23.38 %, 10.61 % gave centres like 960.906 px)
  // the two IMG widths (26.656 vs 14.263) rounded to different
  // device pixels, drifting the inner ~0.5 px relative to the
  // outer. With ONE svg + ONE rasteriser, the circles share the
  // SAME rounding for every dot, on every viewport, at every DPR.
  //
  // All three dots share a SYNCHRONISED 3.5 s breath - no
  // pulseDelay, no stagger. The host element is a <div> instead of
  // a <button> so clicks do nothing; the popup card is purely a
  // hover affordance (the CSS only opens it on :hover, never on
  // :focus, so a tap or click never sticks the popup open).
  // Animations live in globals.css and are killed under
  // prefers-reduced-motion.
  return (
    <div
      role="img"
      aria-label={popup.label}
      className="hero-dot group absolute size-5 sm:size-8"
      style={{ left, top, transform: "translate(-50%, -50%)" }}
    >
      <svg
        aria-hidden
        viewBox="0 0 32 32"
        className="absolute inset-0 size-full overflow-visible"
        fill="none"
      >
        <circle
          className="dot-pulse-outer"
          cx="16"
          cy="16"
          r="12.62"
          fill="rgba(0,0,0,0.5)"
          stroke="#ffffff"
          strokeWidth="1.42"
        />
        <circle
          className="dot-pulse-inner"
          cx="16"
          cy="16"
          r="7.13"
          fill="#ffffff"
        />
      </svg>

      <span
        aria-hidden
        className={`hero-dot-popup hero-dot-popup-${popupAnchor}`}
      >
        <span className="hero-dot-popup-img">
          <img
            src={popup.image}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="absolute max-w-none object-cover"
            style={{
              width: `${popup.imgSize}px`,
              height: `${popup.imgSize}px`,
              left: `${popup.imgLeft}px`,
              top: `${popup.imgTop}px`,
            }}
          />
        </span>
        <span className="hero-dot-popup-label">{popup.label}</span>
      </span>
    </div>
  );
}

export function Hero() {
  return (
    <section className="w-full">
      {/* lg:items-stretch (default) makes both columns share the same
          height — equal to whichever is taller — so their bottom edges
          line up. Combined with lg:min-h-[746px] on the photo, this
          matches the Figma master where both columns are 746 px tall and
          bottom-aligned, while letting the photo grow if the left column
          ever exceeds 746 px (e.g. text wraps on narrower lg widths). */}
      <div className="flex flex-col items-stretch lg:flex-row">
        {/* Mobile (Figma 3082:3246): the text card is a full-bleed panel
            with a border on top/right/bottom and rounded RIGHT corners,
            sitting BELOW the photo band (order-2). px-24 py-48, gap-48
            between the two inner groups. Desktop (lg) restores the
            original bordered hero-left column unchanged. */}
        <div className="hero-left order-2 flex flex-1 flex-col gap-12 rounded-tr-[32px] rounded-br-[32px] border-y border-r border-stroke-default px-6 py-12 sm:gap-16 sm:px-8 sm:py-14 lg:order-none lg:gap-[88px] lg:rounded-br-[48px] lg:rounded-tr-[48px] lg:border lg:border-stroke-default lg:pb-10 lg:pr-8 lg:pt-20">
          <div className="flex w-full flex-col gap-8 sm:gap-12 lg:max-w-[575px] lg:gap-14">
            <div className="flex flex-col gap-4 sm:gap-6">
              <Reveal as="h1" className="text-h1 text-neutral-900">
                Співпраця заради ефективності
              </Reveal>
              <Reveal
                as="p"
                delay={120}
                className="text-body-md text-neutral-800 max-w-[575px]"
              >
                Комплексне постачання одноразової
                <br />
                продукції та ЗІЗ для готелів і бізнесу
              </Reveal>
            </div>
            <Reveal delay={240}>
              {/* Mobile: Figma Button/Small in a 240-px-wide pill whose
                  label fills the row (the last span is the label pill).
                  Desktop keeps the original large CTA. */}
              <Button
                href="/#contact-form"
                size="small"
                arrow
                className="w-[240px] [&>span:last-child]:flex-1 lg:hidden"
              >
                Підібрати рішення
              </Button>
              <Button
                href="/#contact-form"
                arrow
                className="max-lg:hidden"
              >
                Підібрати рішення
              </Button>
            </Reveal>
          </div>

          <div className="flex w-full flex-col gap-10 lg:max-w-[711px]">
            <div className="flex flex-col gap-4">
              <p className="text-title-sm text-neutral-900 lg:max-w-[575px]">
                Працюємо без перебоїв з 2000 року для
              </p>
              {/* Line extends past the column's lg:pr-8 (32px) so it reaches
                  the photo's left edge — matches Figma's Vector 59 width
                  (711px on 1440 master, ≈ left-col - 130 px-padding). */}
              <div
                className="h-px w-full lg:w-[calc(100%+32px)]"
                style={{ background: "var(--color-stroke-subtle)" }}
              />
            </div>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2 lg:grid-cols-2 lg:gap-x-10 lg:gap-y-4 lg:max-w-[575px]">
              {INDUSTRIES.map((i, idx) => (
                <Reveal
                  as="li"
                  key={i.label}
                  delay={idx * 90}
                  className="flex items-center gap-4 py-1 lg:gap-2"
                >
                  <span className="flex size-[52px] shrink-0 items-center justify-center overflow-clip rounded-xl border border-stroke-default">
                    <img
                      src={i.icon}
                      alt=""
                      aria-hidden
                      className={i.iconClass}
                    />
                  </span>
                  <span className="text-[16px] leading-[24px] text-neutral-900">{i.label}</span>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>

        {/* Photo block.
            Below lg: in normal flow, takes full width of section.
            On lg the section is full-width (no max-w), so this column
            grows to (100vw - 1440)/2 + 603 px on viewports > 1440 — i.e.
            it consumes the right-side gutter so the photo runs all the
            way to the screen's right edge. The width is set in CSS via
            the `.hero-photo` class (uses min/max for clamping). */}
        {/* Below lg the photo runs full width of the section, so we
            anchor its height to the design's 603/746 aspect ratio
            (≈ 1.237 → height = 1.237× width) instead of fixed pixel
            heights. That keeps the tree composition cropped the same
            way on every phone width (360 / 390 / 412) and prevents the
            previous "looks fine on 390 but the bottle vanishes on 412"
            inconsistency. min/max clamps cap the photo so it never
            becomes too short on tiny phones nor too tall on tablets. */}
        <div className="hero-photo relative order-first h-[320px] w-full lg:order-none lg:aspect-auto lg:h-auto lg:min-h-[746px] lg:w-auto lg:shrink-0">
          {/* `ken-burns-stage` runs ONE 20s animation that writes the
              shared --kb-scale / --kb-tx / --kb-ty custom properties.
              A SINGLE `.ken-burns-follow` wrapper inside the canvas
              reads those properties and transforms ALL hotspot-related
              layers — the tree photo, the driftwood overlay, and the
              dots — as a single GPU layer. This is the strongest
              possible sync guarantee: with everything on one
              compositor surface, the dots cannot drift sub-pixel
              relative to the tree even after the 20 s loop runs for
              hours (two separate `will-change: transform` siblings can
              rasterise the same matrix to slightly different
              sub-pixels — that's the rasterisation drift this
              consolidation eliminates).

              The driftwood layer adds a tiny TRANSLATE-only extra
              animation on top (`.driftwood-parallax`, 26 s / -7 s
              phase) so the two photo layers still parallax, without
              double-scaling against its parent's ken-burns scale.

              Layout sync — separate from animation sync — is solved by
              `.hero-photo-canvas`: it locks the photo + dots to the
              Figma master's 603/746 aspect and behaves like a single
              `object-fit: cover` rectangle relative to the stage. So
              wider viewports (>1440 widens the column) and phones
              (narrower than design) only change how much of the canvas
              is cropped on one axis — they never re-flow the dots
              relative to the tree. See `.hero-photo-canvas` in
              globals.css for the full breakdown. The stage itself is
              the size container queried by the canvas. */}
          {/* Photo + dots — Figma master places both photos at NATURAL
              size with a slight negative offset from the container's
              origin (the photos overflow on top + left). Reproduce that
              exactly with absolute % positioning relative to the
              container so the framing matches Figma at 1440 and scales
              correctly on larger viewports without ever stretching the
              image. Container = 603x746 at lg/1440; photos:
                wood-tree:   pos (-76.4, -65),  size 729x934
                driftwood:   pos (-6.78, -35),  size 667.4x817.0 */}
          <div
            className="ken-burns-stage absolute inset-0 overflow-clip rounded-tl-[32px] rounded-bl-[32px] sm:rounded-tl-[40px] sm:rounded-bl-[40px] lg:rounded-bl-[48px] lg:rounded-tl-[48px] lg:rounded-br-none"
            style={{ background: "#c34924" }}
          >
            {/* Locked-aspect canvas (603/746) + single ken-burns-follow
                wrapper. The photos AND the dots overlay all sit inside
                this one transformed surface so they stay pixel-perfect
                synced through the 20s ken-burns loop and the layout
                stays anchored on the photo features regardless of stage
                aspect (see `.hero-photo-canvas` in globals.css). */}
            <div className="hero-photo-canvas">
              <div className="ken-burns-follow absolute inset-0">
                <img
                  src="/figma-export/hero/bg-wood-tree.png"
                  alt=""
                  aria-hidden
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                  className="pointer-events-none absolute max-w-none"
                  style={{
                    left: "-12.67%",
                    top: "-8.71%",
                    width: "120.9%",
                    height: "125.2%",
                  }}
                />
                <img
                  src="/figma-export/hero/bg-driftwood-sea.png"
                  alt=""
                  aria-hidden
                  loading="eager"
                  decoding="async"
                  className="driftwood-parallax pointer-events-none absolute max-w-none"
                  style={{
                    left: "-1.12%",
                    top: "-4.7%",
                    width: "110.69%",
                    height: "109.52%",
                  }}
                />
                <div className="absolute inset-0">
                  {DOTS.map((d, i) => (
                    <DotMarker key={i} {...d} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
