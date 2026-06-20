/* eslint-disable @next/next/no-img-element */
import { Reveal } from "@/components/ui/Reveal";

// Glyph sizes are % of the 96px tile, taken 1:1 from Figma's "Info icon"
// component (node 1384:12746): each tile has a 9px inner clip zone and the
// vector sits centred inside it. The hero SVGs are the SAME glyphs (their
// viewBox aspect ratios match the Figma boxes exactly), so a meet-fit at
// these percentages reproduces the design pixel-for-pixel.
//   hotel   33.61×71.62 (rotated 90; long edge 71.62/96 = 74.6%)
//   beauty  60.06×60.06 (square → 62.6%)
//   medical 71.35×59.58 (w 74.3% / h 62.1%)
//   factory 66.73×63.11 (w 69.5% / h 65.7%)
const ICONS = [
  { src: "/figma-export/hero/icon-hotel.svg", className: "size-[74.6%] rotate-90", label: "Готелі" },
  { src: "/figma-export/hero/icon-beauty.svg", className: "size-[62.6%]", label: "Салони краси" },
  { src: "/figma-export/hero/icon-medical.svg", className: "h-[62.1%] w-[74.3%]", label: "Медичні заклади" },
  { src: "/figma-export/hero/icon-factory.svg", className: "h-[65.7%] w-[69.5%]", label: "Виробничі підприємства" },
];

export function TrustBand() {
  return (
    <section className="lg-pad-x px-6 py-12 sm:px-10 sm:py-16 lg:py-[160px]">
      <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
        {/* Figma 1384:12745: 42/48/-0.84 (NOT the global text-h2 token
            which is 44/48). Single-occurrence size override on this
            section's heading. Mobile / tablet scale down to keep the
            heading comfortable on narrow viewports (the arbitrary
            text-[42px] above bypasses the .text-h2 responsive
            overrides in globals.css). */}
        <h2 className="max-w-[675px] text-[30px] font-light leading-[36px] tracking-[-0.6px] text-neutral-900 lg:text-[42px] lg:leading-[48px] lg:tracking-[-0.84px]">
          <span className="font-bold">Нам довіряють</span>
          <br aria-hidden />
          <span>готелі, салони, медичні центри</span>
          <br aria-hidden className="hidden lg:inline" />
          <span> та виробничі підприємства</span>
        </h2>
        <ul className="flex shrink-0 items-center gap-[14px]">
          {ICONS.map((i, idx) => (
            <Reveal
              as="li"
              key={i.label}
              delay={idx * 100}
              direction="right"
              aria-label={i.label}
              className="relative flex size-[52px] items-center justify-center overflow-clip rounded-[12px] border border-stroke-default bg-white lg:size-[96px] lg:rounded-[18px]"
            >
              <img
                src={i.src}
                alt=""
                aria-hidden
                loading="lazy"
                decoding="async"
                className={i.className}
              />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
