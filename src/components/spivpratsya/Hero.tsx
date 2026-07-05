/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import type { CSSProperties } from "react";

// Spivpratsya hero — Figma 1870:6001.
//
// Layout mirrors the Hotels/Protect/Cleaning hero pattern:
// left card (575-px content column inside a 837-px frame) holds the H1,
// subtitle and CTA; right photo column (603 px on 1440 → grows on wider
// viewports via .hero-photo) shows the textile/amenities still life on
// a deep-blue background.
export function SpivpratsyaHero() {
  return (
    <section className="w-full">
      {/* Below lg the Figma MOBILE master (3166:7439/7441) stacks the two
          as an alternating-corner pair: photo band on TOP (rounded LEFT),
          text in a bordered card BELOW (border t/r/b, rounded RIGHT).
          flex-col-reverse puts the photo (2nd child) above the text. */}
      <div className="flex flex-col-reverse items-stretch lg:flex-row">
        {/* py-[47px]: Figma mobile (3166:7441) pads the text card 48px
            top/bottom with the stroke INSIDE; CSS border-box adds the
            1px border on top of the padding, so 47+1 = 48. */}
        <div className="hero-left flex flex-1 flex-col justify-between gap-8 rounded-br-[32px] rounded-tr-[32px] border-b border-r border-t border-stroke-default px-6 py-[47px] sm:gap-16 sm:px-10 sm:py-14 lg:gap-[88px] lg:rounded-br-[48px] lg:rounded-tr-[48px] lg:border lg:border-stroke-default lg:pb-20 lg:pr-8 lg:pt-20">
          <div className="flex w-full flex-col gap-8 sm:gap-12 lg:max-w-[575px] lg:gap-14">
            <div className="flex flex-col gap-4 sm:gap-9 lg:gap-6">
              {/* Figma 1870:6005 enforces a 3-line stack with explicit
                  <br> after "Партнер" and after "готелів". The bare
                  "Партнер" on line 1 is a typographic accent — keep it
                  exact. */}
              <Reveal as="h1" className="text-h1 text-neutral-900">
                Партнер
                <br aria-hidden="true" />
                у&nbsp;комплектації готелів
                <br aria-hidden="true" />
                та&nbsp;комерційних об{"’"}єктів
              </Reveal>
              <Reveal
                as="p"
                delay={120}
                className="max-w-[575px] text-body-md text-neutral-800"
              >
                {`Підключаємось до проєктів дизайнерів, архітекторів, девелоперів і консультантів. Закриваємо комплектацію, кастомізацію та постачання — з прогнозованими термінами, контрольованою якістю та зрозумілою логікою роботи.`}
              </Reveal>
            </div>
            <Reveal delay={240}>
              <Button href="#contact-form" size="responsive" arrow>
                {`Домовитись про зустріч`}
              </Button>
            </Reveal>
          </div>
        </div>

        {/* Photo column — design master is 603×744 but on the spivpratsya
            frame the photo block is 603 px wide × 744 px tall sitting at
            x=837. .hero-photo grows the column to (vw-1440)/2 + 603 on
            viewports > 1440 so the photo runs to the right edge.

            Figma 1870:6008 has NO fill on the photo container — the photo
            itself defines the colour palette. The previous `#2c3a52`
            underlay was invented and only ever shows if the image fails
            to load. Keep the container transparent so the photo controls
            the chrome. */}
        {/* Below lg the photo runs full-width and uses the design's
            603/744 aspect ratio so the textile/amenities composition
            stays framed identically across every phone width
            (360 / 390 / 412 / 430). Clamps cap the height so it never
            becomes a postcard on small phones nor takes the entire
            screen on tablets. */}
        <div
          className="hero-photo relative h-[320px] w-full sm:h-[420px] lg:aspect-auto lg:h-auto lg:min-h-[744px] lg:w-auto lg:shrink-0"
          style={{ "--hero-photo-w": "603px" } as CSSProperties}
        >
          <div
            className="absolute inset-0 overflow-clip rounded-bl-[32px] rounded-tl-[32px] sm:rounded-bl-[40px] sm:rounded-tl-[40px] lg:rounded-bl-[48px] lg:rounded-tl-[48px] lg:rounded-br-none"
            style={{ background: "#c34924" }}
          >
            {/* === Mobile band (Figma 3166:7439) === The phone master uses
                its OWN still-life render (towel / gloves / minis / spray on
                deep blue), not the desktop hero photo: #c34924 stage + 20%
                texture, scene image in a 481px box centred at
                calc(50% - 14.07px), inner crop 107.69% x 107.51%. */}
            <div className="absolute inset-0 lg:hidden">
              <img
                src="/figma-export/hero/bg-texture.png"
                alt=""
                aria-hidden
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-cover opacity-20"
              />
              <div
                className="absolute overflow-hidden"
                style={{
                  left: "-0.39px",
                  right: "0.39px",
                  top: "calc(50% - 14.07px)",
                  transform: "translateY(-50%)",
                  height: "481px",
                }}
              >
                <img
                  src="/figma-export/spivpratsya/hero-mobile-scene.png"
                  alt="Готельний текстиль, амениті та засоби догляду в композиції на темно-синьому фоні"
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                  className="absolute max-w-none"
                  style={{
                    left: "-0.06%",
                    top: 0,
                    width: "107.69%",
                    height: "107.51%",
                  }}
                />
              </div>
            </div>
            {/* Desktop keeps the 603x744 master photo. */}
            <img
              src="/figma-export/spivpratsya/hero-photo.png"
              alt="Готельний текстиль, амениті та засоби догляду в композиції на темно-синьому фоні"
              fetchPriority="high"
              loading="eager"
              decoding="async"
              className="absolute inset-0 hidden size-full max-w-none object-cover lg:block"
              style={{ objectPosition: "50% 50%" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
