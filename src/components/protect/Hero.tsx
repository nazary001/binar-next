/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import type { CSSProperties } from "react";

export function ProtectHero() {
  return (
    <section className="w-full">
      {/* Same full-bleed pattern as the home and hotels heroes: section
          is full-width, the left card-border bleeds to the screen's
          left edge on viewports > 1440, the photo placeholder grows to
          the screen's right edge. items-stretch (default) keeps both
          columns the same height for bottom alignment. */}
      <div className="flex flex-col items-stretch lg:flex-row">
        <div className="hero-left flex flex-1 flex-col justify-between gap-10 px-5 pb-8 pt-10 sm:gap-12 sm:px-10 sm:pb-10 sm:pt-14 lg:gap-14 lg:rounded-r-[48px] lg:border lg:border-stroke-default lg:pb-10 lg:pr-8 lg:pt-20">
          <div className="flex w-full flex-col gap-10 sm:gap-12 lg:max-w-[575px] lg:gap-14">
            <div className="flex flex-col gap-5 sm:gap-6">
              <Reveal as="h1" className="text-h1 text-neutral-900">
                Засоби індивідуального захисту та одяг одноразовий
              </Reveal>
              <Reveal
                as="p"
                delay={120}
                className="text-body-md text-neutral-800 max-w-[575px]"
              >
                Постачаємо ЗІЗ і одноразовий спецодяг для виробництв, медичних
                закладів, салонів краси та сервісних компаній.
              </Reveal>
            </div>
            <Reveal delay={240}>
              <Button href="/#contact-form" arrow>
                Підібрати рішення
              </Button>
            </Reveal>
          </div>
        </div>

        {/* Photo placeholder: 721 × 640 on lg per Figma; the .hero-photo
            class grows it to (vw - 1440)/2 + 721 on viewports > 1440 so
            the photo runs to the screen's right edge. */}
        <div
          className="hero-photo relative h-[280px] sm:h-[400px] md:h-[480px] lg:h-auto lg:min-h-[640px] lg:shrink-0"
          style={{ "--hero-photo-w": "721px" } as CSSProperties}
        >
          <div
            className="absolute inset-0 overflow-clip rounded-bl-[32px] rounded-br-[32px] sm:rounded-bl-[40px] sm:rounded-br-[40px] lg:rounded-bl-[48px] lg:rounded-tl-[48px] lg:rounded-br-none"
            style={{ background: "#726053" }}
          >
            {/* Full-bleed image — replaces the previous "card-in-frame"
                layout (p-3/p-5/lg:p-0 + lg:h-[652px] lg:w-[660px]) which
                left a #726053 frame around the photo on every viewport.
                Now object-cover crops the photo to fill the full column,
                so the backdrop is only ever a fallback colour and never
                a visible stripe. */}
            <img
              src="/figma-export/directions/card-protect.png"
              alt="Засоби індивідуального захисту"
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
