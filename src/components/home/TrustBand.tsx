/* eslint-disable @next/next/no-img-element */
import { Reveal } from "@/components/ui/Reveal";

// Each icon SVG is the Figma "Info icon" 34px-zone export (glyph padding
// and orientation baked in), rendered at a uniform 17.31% inset (= 9/52)
// of the tile so it scales exactly like the master at 52 and 96 px.
const ICONS = [
  { src: "/figma-export/info-icons/tb-hotel.svg", label: "Готелі" },
  { src: "/figma-export/info-icons/tb-beauty.svg", label: "Салони краси" },
  { src: "/figma-export/info-icons/tb-medical.svg", label: "Медичні заклади" },
  { src: "/figma-export/info-icons/tb-factory.svg", label: "Виробничі підприємства" },
];

export function TrustBand() {
  return (
    // Mobile (Figma 3094:5041): the heading block carries pt-60 and NO
    // bottom padding — the 48-px gap to the first case card comes from
    // the Cases section's own pt-12.
    <section className="lg-pad-x px-6 pt-[60px] sm:px-10 lg:py-[160px]">
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
                // The Figma "Info icon" keeps a FIXED 9px zone inset when
                // resized (52 tile -> 34 zone, 96 tile -> 78 zone), so the
                // inset must be absolute px - the old 17.31% shrank the
                // glyph ~20% at the lg 96px tile.
                className="absolute left-[9px] top-[9px] size-[calc(100%-18px)] max-w-none"
              />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
