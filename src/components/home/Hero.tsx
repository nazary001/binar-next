/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

const DOT_OUTER = "/figma-export/hero/dot-outer.svg";
const DOT_INNER = "/figma-export/hero/dot-inner.svg";

const INDUSTRIES = [
  {
    label: "Готелів",
    icon: "/figma-export/hero/icon-hotel.svg",
    iconClass: "size-[60%] rotate-90",
  },
  {
    label: "Салонів краси",
    icon: "/figma-export/hero/icon-beauty.svg",
    iconClass: "size-[68%]",
  },
  {
    label: "Медичних закладів",
    icon: "/figma-export/hero/icon-medical.svg",
    iconClass: "h-[68%] w-[80%]",
  },
  {
    label: "Виробничих підприємств",
    icon: "/figma-export/hero/icon-factory.svg",
    iconClass: "h-[72%] w-[78%]",
  },
];

type DotConfig = {
  // Position in the photo column (% of 603×746).
  left: string;
  top: string;
  pulseDelay: number;
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

// Dot positions are calibrated against the design-aspect photo canvas
// (locked 603/746 via `.hero-photo-canvas`). Values measured from the
// designer's reference image.png in the project root — each dot's
// pixel center (~ ring blob) divided by image dimensions (1192×1510)
// gives the canvas %. See globals.css `.hero-photo-canvas`.
const DOTS: DotConfig[] = [
  {
    // Cup with toothbrush — top-left.
    left: "23.6%",
    top: "48.3%",
    pulseDelay: 0,
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
    // White towels stack — right.
    left: "86.9%",
    top: "58.7%",
    pulseDelay: 600,
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
    // SHOWER GEL tube — bottom-left.
    left: "11.3%",
    top: "61.7%",
    pulseDelay: 1200,
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

function DotMarker({
  left,
  top,
  pulseDelay,
  popup,
  popupAnchor,
}: DotConfig) {
  return (
    <button
      type="button"
      aria-label={`Показати: ${popup.label}`}
      className="hero-dot group absolute size-8"
      style={{ left, top, transform: "translate(-50%, -50%)" }}
    >
      <img
        src={DOT_OUTER}
        alt=""
        aria-hidden
        className="dot-pulse-ring absolute"
        style={{
          inset: "-2.81%",
          left: "2.67px",
          top: "2.67px",
          width: "26.656px",
          height: "26.656px",
          animationDelay: `${pulseDelay}ms`,
        }}
      />
      <img
        src={DOT_INNER}
        alt=""
        aria-hidden
        className="dot-pulse-inner absolute"
        style={{
          left: "8.87px",
          top: "8.87px",
          width: "14.263px",
          height: "14.263px",
          animationDelay: `${pulseDelay}ms`,
        }}
      />

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
    </button>
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
        <div className="hero-left flex flex-1 flex-col gap-12 px-5 pb-8 pt-10 sm:gap-16 sm:px-10 sm:pb-10 sm:pt-14 lg:gap-[88px] lg:rounded-br-[48px] lg:rounded-tr-[48px] lg:border lg:border-stroke-default lg:pb-10 lg:pr-8 lg:pt-20">
          <div className="flex w-full flex-col gap-10 sm:gap-12 lg:max-w-[575px] lg:gap-14">
            <div className="flex flex-col gap-5 sm:gap-6">
              <Reveal as="h1" className="text-h1 text-neutral-900">
                Співпраця заради ефективності
              </Reveal>
              <Reveal
                as="p"
                delay={120}
                className="text-body-md text-neutral-800 max-w-[575px]"
              >
                Комплексне постачання одноразової продукції та ЗІЗ для готелів і
                бізнесу
              </Reveal>
            </div>
            <Reveal delay={240}>
              <Button href="/#contact-form" arrow>
                Підібрати рішення
              </Button>
            </Reveal>
          </div>

          <div className="flex w-full flex-col gap-8 sm:gap-10 lg:max-w-[711px]">
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
            <ul className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 sm:gap-x-10 lg:max-w-[575px]">
              {INDUSTRIES.map((i, idx) => (
                <Reveal
                  as="li"
                  key={i.label}
                  delay={idx * 90}
                  className="flex items-center gap-3 py-1 sm:gap-2"
                >
                  <span className="group flex size-[48px] shrink-0 items-center justify-center overflow-clip rounded-xl border border-stroke-default transition-colors duration-300 hover:border-neutral-900 hover:bg-bg-subtle sm:size-[52px]">
                    <img
                      src={i.icon}
                      alt=""
                      aria-hidden
                      className={`${i.iconClass} transition-transform duration-300 group-hover:scale-110`}
                    />
                  </span>
                  <span className="text-body-sm text-neutral-900">{i.label}</span>
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
        <div className="hero-photo relative h-[480px] sm:h-[560px] md:h-[640px] lg:h-auto lg:min-h-[746px] lg:shrink-0">
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
          <div
            className="ken-burns-stage absolute inset-0 overflow-clip rounded-bl-[32px] rounded-br-[32px] sm:rounded-bl-[40px] sm:rounded-br-[40px] lg:rounded-bl-[48px] lg:rounded-tl-[48px] lg:rounded-br-none"
            style={{ background: "#c34924" }}
          >
            <div className="hero-photo-canvas">
              <div className="ken-burns-follow absolute inset-0">
                <img
                  src="/figma-export/hero/bg-wood-tree.png"
                  alt=""
                  aria-hidden
                  /* Hero LCP image — eager-load with a high fetch priority
                     hint so the browser starts decoding it before any
                     below-the-fold work. `decoding="async"` keeps the
                     decode off the main thread once the bytes arrive. */
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                  className="absolute inset-0 size-full max-w-none object-cover"
                  style={{ objectPosition: "50% 50%" }}
                />
                <img
                  src="/figma-export/hero/bg-driftwood-sea.png"
                  alt=""
                  aria-hidden
                  loading="eager"
                  decoding="async"
                  className="driftwood-parallax pointer-events-none absolute inset-0 size-full max-w-none object-cover"
                  style={{ objectPosition: "50% 50%" }}
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
