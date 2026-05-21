/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import type { CSSProperties } from "react";

const FEATURES = [
  {
    label: "Набір позицій",
    icon: "/figma-export/hotels/hero-icon-set.svg",
    iconClass: "size-[78%]",
  },
  {
    label: "Зрозумілий прорахунок",
    icon: "/figma-export/hotels/hero-icon-calc.svg",
    iconClass: "h-[88%] w-[55%]",
  },
  {
    label: "Стабільні поставки",
    icon: "/figma-export/hotels/hero-icon-product.svg",
    iconClass: "size-[68%]",
  },
  {
    label: "Кастомізацію рішень",
    icon: "/figma-export/hotels/hero-icon-customize.svg",
    iconClass: "size-[80%]",
  },
];

export function HotelsHero() {
  return (
    <section className="w-full">
      {/* Same full-bleed pattern as the home hero: section is full-width,
          left card border bleeds to the screen's left edge on viewports
          > 1440, photo placeholder grows to the screen's right edge.
          items-stretch (default) keeps both columns the same height so
          their bottom edges line up. */}
      <div className="flex flex-col items-stretch lg:flex-row">
        <div className="hero-left flex flex-1 flex-col gap-12 px-5 pb-8 pt-10 sm:gap-16 sm:px-10 sm:pb-10 sm:pt-14 lg:gap-[88px] lg:rounded-r-[48px] lg:border lg:border-stroke-default lg:pb-10 lg:pr-8 lg:pt-20">
          <div className="flex w-full flex-col gap-10 sm:gap-12 lg:max-w-[575px] lg:gap-14">
            <div className="flex flex-col gap-5 sm:gap-6">
              <Reveal as="h1" className="text-h1 text-neutral-900">
                Усе для готелів
              </Reveal>
              <Reveal
                as="p"
                delay={120}
                className="text-body-md text-neutral-800 max-w-[575px]"
              >
                B2B постачання одноразової продукції та комплектація номерів під ваш бюджет, формат та стандарти.
              </Reveal>
            </div>
            <Reveal delay={240}>
              <Button href="/#contact-form" arrow>
                Підібрати рішення
              </Button>
            </Reveal>
          </div>

          <div className="flex w-full flex-col gap-8 sm:gap-10 lg:max-w-[575px]">
            <div className="flex flex-col gap-4">
              <p className="text-title-sm text-neutral-900">Ви отримуєте</p>
              {/* Separator line extends past lg:pr-8 to reach the photo's
                  left edge, matching the home hero's pattern. */}
              <div
                className="h-px w-full lg:w-[calc(100%+32px)]"
                style={{ background: "var(--color-stroke-subtle)" }}
              />
            </div>
            {/* Figma 1384:11598 — each cell is 64-px-square icon + 8-px gap +
                label, two columns × two rows with 40-px column gap and
                8-px row gap. lg sizing matches the design exactly; we
                scale down to 48/56 on smaller viewports. */}
            <ul className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-2">
              {FEATURES.map((f, idx) => (
                <Reveal
                  as="li"
                  key={f.label}
                  delay={idx * 90}
                  className="flex items-center gap-3 sm:gap-2"
                >
                  <span className="group flex size-[48px] shrink-0 items-center justify-center overflow-clip rounded-xl border border-stroke-default transition-colors duration-300 hover:border-neutral-900 hover:bg-bg-subtle sm:size-[56px] lg:size-[64px]">
                    <img
                      src={f.icon}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      decoding="async"
                      className={`${f.iconClass} transition-transform duration-300 group-hover:scale-110`}
                    />
                  </span>
                  <span className="text-body-sm text-neutral-900">{f.label}</span>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>

        {/* Photo placeholder: 721 px wide on lg per Figma; the .hero-photo
            class grows it to (vw - 1440)/2 + 721 on viewports > 1440 so
            the photo always runs to the screen's right edge. */}
        <div
          className="hero-photo relative h-[320px] sm:h-[420px] md:h-[520px] lg:h-auto lg:min-h-[678px] lg:shrink-0"
          style={{ "--hero-photo-w": "721px" } as CSSProperties}
        >
          <div
            className="absolute inset-0 overflow-clip rounded-bl-[32px] rounded-br-[32px] sm:rounded-bl-[40px] sm:rounded-br-[40px] lg:rounded-bl-[48px] lg:rounded-tl-[48px] lg:rounded-br-none"
            style={{ background: "#726053" }}
          >
            {/* Full-bleed: inset-0 + object-cover so the photo fills the
                entire photo column at any viewport. The previous fixed
                lg:h-[721px] lg:w-[718px] right-anchored layout left a
                stripe of #726053 backdrop visible to the left of the
                image on viewports > 1440. */}
            <img
              src="/figma-export/hotels/hero-hotel.png"
              alt="Гостиничный номер с продукцией Binar"
              fetchPriority="high"
              loading="eager"
              decoding="async"
              className="animate-ken-burns absolute inset-0 size-full max-w-none object-cover"
              style={{ objectPosition: "50% 50%" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
