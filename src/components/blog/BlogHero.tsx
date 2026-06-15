/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowUpRight } from "./icons";

// Figma «Blog::Hero» (2749:6544): a full-bleed split hero — a bordered card
// on the left (heading + lede + CTA, rounded only on its inner/right edge)
// butting against a full-height collage on the right (rounded only on its
// inner/left edge), with a featured-article card floating over the photo.
//
// The left/right corner rounding meets at the seam exactly like the home
// Hero. `.hero-left` (globals.css) pins the left padding to the 130-px
// design gutter at lg; the page is zoom-scaled from the 1440 master so the
// fixed photo width (603) and left border land edge-to-edge on any desktop.
export function BlogHero() {
  return (
    <section className="w-full">
      <div className="flex flex-col items-stretch lg:flex-row">
        {/* Left bordered card */}
        <div className="hero-left flex flex-1 flex-col gap-10 px-5 pb-10 pt-10 sm:gap-14 sm:px-10 sm:py-14 lg:min-h-[648px] lg:gap-14 lg:rounded-br-[48px] lg:rounded-tr-[48px] lg:border lg:border-stroke-default lg:pb-20 lg:pr-8 lg:pt-20">
          <div className="flex w-full flex-col gap-6 lg:max-w-[575px]">
            <h1 className="text-h1 text-neutral-900">
              Простір для тих, хто будує відповідальний бізнес
            </h1>
            <p className="text-body-md text-neutral-800">
              Практичні матеріали про стратегічні закупівлі, управління
              готельним сервісом, безпеку праці та оптимізацію процесів без
              води — тільки те, що підсилює ваш бренд.
            </p>
          </div>
          <Button href="/#contact-form" arrow>
            Домовитись про зустріч
          </Button>
        </div>

        {/* Right collage + floating featured-article card */}
        <div className="relative aspect-[603/620] w-full overflow-hidden rounded-bl-[32px] rounded-br-[32px] sm:rounded-bl-[40px] sm:rounded-br-[40px] lg:aspect-auto lg:w-[603px] lg:shrink-0 lg:self-stretch lg:rounded-bl-[48px] lg:rounded-br-none lg:rounded-tl-[48px] lg:rounded-tr-none">
          <img
            src="/figma-export/blog/hero-collage.png"
            alt="Брендована гостьова косметика та аксесуари Binar"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />

          <Link
            href="/blog/hostova-kosmetyka-formaty-ta-brenduvannya"
            className="group absolute inset-x-4 bottom-4 flex items-center gap-4 rounded-[28px] bg-white p-4 sm:inset-x-auto sm:bottom-6 sm:left-6 sm:right-6 sm:gap-6 sm:rounded-[32px] sm:p-5 lg:bottom-[32px] lg:left-[32px] lg:right-auto lg:w-[539px] lg:gap-[40px] lg:rounded-[40px] lg:p-[24px]"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
              <span className="text-[14px] font-medium uppercase leading-6 text-brand">
                Готелі
              </span>
              <span className="text-[18px] font-semibold leading-[22px] tracking-[0.18px] text-neutral-900">
                Еко-косметика в номерах: тренд чи необхідність
              </span>
            </span>
            <span
              aria-hidden
              className="flex size-[52px] shrink-0 items-center justify-center rounded-[26px] border border-neutral-900 text-neutral-900 transition-colors duration-300 group-hover:border-brand group-hover:bg-brand group-hover:text-white"
            >
              <ArrowUpRight className="size-[16.5px]" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
