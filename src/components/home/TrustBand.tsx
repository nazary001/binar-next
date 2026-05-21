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
    <section className="lg-pad-x px-5 py-12 sm:px-10 sm:py-16 lg:py-[120px]">
      <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
        <h2 className="max-w-[675px] text-neutral-900">
          <span className="text-h2">Нам довіряють</span>
          <br aria-hidden />
          <span className="text-h2-light">готелі, салони, медичні центри</span>
          <br aria-hidden className="hidden lg:inline" />
          <span className="text-h2-light"> та виробничі підприємства</span>
        </h2>
        <ul className="-space-x-[10px] flex shrink-0 items-center sm:-space-x-[14.365px]">
          {ICONS.map((i, idx) => (
            <Reveal
              as="li"
              key={i.label}
              delay={idx * 100}
              direction="right"
              aria-label={i.label}
              className="relative flex size-[64px] items-center justify-center overflow-clip rounded-[14px] border border-stroke-default bg-white transition-all duration-300 hover:z-10 hover:-translate-y-1 hover:shadow-md sm:size-[80px] sm:rounded-[16px] lg:size-[96px] lg:rounded-[18px]"
              style={{ zIndex: ICONS.length - idx }}
            >
              <img
                src={i.src}
                alt=""
                aria-hidden
                loading="lazy"
                decoding="async"
                className={`${i.className} transition-transform duration-300 hover:scale-110`}
              />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
