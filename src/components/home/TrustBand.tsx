/* eslint-disable @next/next/no-img-element */
import { Reveal } from "@/components/ui/Reveal";

const ICONS = [
  { src: "/figma-export/hero/icon-hotel.svg", className: "size-[60%] rotate-90", label: "Готелі" },
  { src: "/figma-export/hero/icon-beauty.svg", className: "size-[68%]", label: "Салони краси" },
  { src: "/figma-export/hero/icon-medical.svg", className: "h-[68%] w-[80%]", label: "Медичні заклади" },
  { src: "/figma-export/hero/icon-factory.svg", className: "h-[72%] w-[78%]", label: "Виробничі підприємства" },
];

export function TrustBand() {
  return (
    <section className="lg-pad-x px-5 py-12 sm:px-10 sm:py-16 lg:py-[160px]">
      <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
        {/* Figma 1384:12745: 42/48/-0.84 (NOT the global text-h2 token
            which is 44/48). Single-occurrence size override on this
            section's heading. Mobile / tablet scale down to keep the
            heading comfortable on narrow viewports (the arbitrary
            text-[42px] above bypasses the .text-h2 responsive
            overrides in globals.css). */}
        <h2 className="max-w-[675px] text-[28px] font-light leading-[32px] tracking-[-0.6px] text-neutral-900 sm:text-[36px] sm:leading-[40px] sm:tracking-[-0.72px] lg:text-[42px] lg:leading-[48px] lg:tracking-[-0.84px]">
          <span className="font-bold">Нам довіряють</span>
          <br aria-hidden />
          <span>готелі, салони, медичні центри</span>
          <br aria-hidden className="hidden lg:inline" />
          <span> та виробничі підприємства</span>
        </h2>
        <ul className="flex shrink-0 items-center gap-3 sm:gap-[14.365px]">
          {ICONS.map((i, idx) => (
            <Reveal
              as="li"
              key={i.label}
              delay={idx * 100}
              direction="right"
              aria-label={i.label}
              className="relative flex size-[64px] items-center justify-center overflow-clip rounded-[14px] border border-stroke-default bg-white sm:size-[80px] sm:rounded-[16px] lg:size-[96px] lg:rounded-[18px]"
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
