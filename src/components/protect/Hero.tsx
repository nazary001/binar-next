/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import type { CSSProperties } from "react";

export function ProtectHero() {
  return (
    <section className="w-full">
      {/* Figma 1327:3867 — two columns at 837 + 721 (overflows the 1440
          master by 118 px so the photo bleeds past the viewport's right
          edge; html { overflow-x: clip } absorbs the overflow). On <lg
          the columns stack and the photo becomes a full-bleed card. */}
      <div className="flex flex-col items-stretch lg:flex-row">
        <div className="hero-left flex flex-col gap-10 px-5 pb-8 pt-10 sm:gap-12 sm:px-10 sm:pb-10 sm:pt-14 lg:w-[837px] lg:shrink-0 lg:gap-14 lg:rounded-br-[48px] lg:rounded-tr-[48px] lg:border lg:border-stroke-default lg:pb-10 lg:pr-8 lg:pt-20">
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

        {/* Photo column — Figma 1327:3874: 721×640 with bg #726053, only
            the LEFT corners rounded (48 px). The image card inside
            (660×652, rounded-40) sits flush-left + vertically centred so
            a 61-px brown strip is visible to the right of the image on
            viewports wide enough to render the column unclipped, and the
            image's top/bottom 6 px overflow is absorbed by overflow-clip
            on the column. */}
        <div
          className="hero-photo relative h-[320px] sm:h-[420px] md:h-[500px] lg:h-auto lg:min-h-[640px] lg:shrink-0"
          style={{ "--hero-photo-w": "721px" } as CSSProperties}
        >
          <div
            className="absolute inset-0 overflow-clip rounded-bl-[32px] rounded-br-[32px] sm:rounded-bl-[40px] sm:rounded-br-[40px] lg:rounded-bl-[48px] lg:rounded-tl-[48px] lg:rounded-br-none"
            style={{ background: "#726053" }}
          >
            {/* Below lg the image fills the column edge-to-edge (no
                Figma mobile spec exists). At lg+ it switches to the
                Figma master's 660×652 card pinned to left-0 and
                vertically centred via top-1/2 + -translate-y-1/2. */}
            <div className="absolute inset-0 lg:inset-auto lg:left-0 lg:top-1/2 lg:h-[652px] lg:w-[660px] lg:-translate-y-1/2 lg:rounded-[40px] lg:overflow-clip">
              <img
                src="/figma-export/directions/card-protect.png"
                alt="Засоби індивідуального захисту"
                fetchPriority="high"
                loading="eager"
                decoding="async"
                className="absolute inset-0 size-full max-w-none object-cover"
                style={{ objectPosition: "50% 50%" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
