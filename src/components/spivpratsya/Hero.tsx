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
      <div className="flex flex-col items-stretch lg:flex-row">
        <div className="hero-left flex flex-1 flex-col justify-between gap-12 px-5 pb-10 pt-10 sm:gap-16 sm:px-10 sm:pb-14 sm:pt-14 lg:gap-[88px] lg:rounded-r-[48px] lg:border lg:border-stroke-default lg:pb-20 lg:pr-8 lg:pt-20">
          <div className="flex w-full flex-col gap-10 sm:gap-12 lg:max-w-[575px] lg:gap-14">
            <div className="flex flex-col gap-7 sm:gap-9">
              <Reveal as="h1" className="text-h1 text-neutral-900">
                Партнер у&nbsp;комплектації готелів та&nbsp;комерційних
                об{"’"}єктів
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
              <Button href="#contact-form" arrow>
                {`Домовитись про зустріч`}
              </Button>
            </Reveal>
          </div>
        </div>

        {/* Photo column — design master is 603×744 but on the spivpratsya
            frame the photo block is 603 px wide × 744 px tall sitting at
            x=837. .hero-photo grows the column to (vw-1440)/2 + 603 on
            viewports > 1440 so the photo runs to the right edge. */}
        <div
          className="hero-photo relative h-[320px] sm:h-[420px] md:h-[520px] lg:h-auto lg:min-h-[744px] lg:shrink-0"
          style={{ "--hero-photo-w": "603px" } as CSSProperties}
        >
          <div
            className="absolute inset-0 overflow-clip rounded-bl-[32px] rounded-br-[32px] sm:rounded-bl-[40px] sm:rounded-br-[40px] lg:rounded-bl-[48px] lg:rounded-tl-[48px] lg:rounded-br-none"
            style={{ background: "#2c3a52" }}
          >
            <img
              src="/figma-export/spivpratsya/hero-photo.png"
              alt="Готельний текстиль, амениті та засоби догляду в композиції на темно-синьому фоні"
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
