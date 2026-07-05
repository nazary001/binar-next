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
      {/* Below lg the Figma MOBILE master (3176:4374/4376) stacks the two
          as an alternating-corner pair: the collage band (with the
          floating featured-article card) on TOP, rounded LEFT; the text
          in a bordered card BELOW, rounded RIGHT. flex-col-reverse puts
          the collage (2nd child) above the text (1st child) on mobile. */}
      <div className="flex flex-col-reverse items-stretch lg:flex-row">
        {/* Left bordered card. py-[47px]: Figma mobile (3176:4376) pads the
            content 48px with the stroke INSIDE; border-box adds the 1px
            border, so 47+1 = 48. */}
        <div className="hero-left flex flex-1 flex-col gap-8 rounded-br-[32px] rounded-tr-[32px] border-b border-r border-t border-stroke-default px-6 py-[47px] sm:gap-14 sm:px-10 sm:py-14 lg:min-h-[648px] lg:gap-14 lg:rounded-br-[48px] lg:rounded-tr-[48px] lg:border lg:border-stroke-default lg:pb-20 lg:pr-8 lg:pt-20">
          <div className="flex w-full flex-col gap-4 lg:max-w-[575px] lg:gap-6">
            <h1 className="text-h1 text-neutral-900">
              Простір для тих, хто будує відповідальний бізнес
            </h1>
            <p className="text-body-md text-neutral-800">
              Практичні матеріали про стратегічні закупівлі, управління
              готельним сервісом, безпеку праці та оптимізацію процесів без
              води — тільки те, що підсилює ваш бренд.
            </p>
          </div>
          <Button href="/#contact-form" size="responsive" arrow>
            Домовитись про зустріч
          </Button>
        </div>

        {/* Right collage + floating featured-article card. Below lg the
            band is the Figma 390-px mobile photo (rounded LEFT, #c34924
            backdrop) with the card centred at its bottom (w-342). */}
        <div
          className="relative h-[390px] w-full overflow-hidden rounded-bl-[32px] rounded-tl-[32px] sm:h-[440px] sm:rounded-bl-[40px] sm:rounded-tl-[40px] lg:aspect-auto lg:h-auto lg:w-[603px] lg:shrink-0 lg:self-stretch lg:rounded-bl-[48px] lg:rounded-br-none lg:rounded-tl-[48px] lg:rounded-tr-none"
          style={{ background: "#c34924" }}
        >
          {/* === Mobile band (Figma 3176:4374) === #c34924 stage + 20%
              texture; the flat-lay scene sits in a 481px box centred at
              calc(50% - 14.07px) and object-covers it (the master shows a
              ZOOMED crop of the square photo, not the full frame). */}
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
                src="/figma-export/blog/hero-collage.png"
                alt="Брендована гостьова косметика та аксесуари Binar"
                fetchPriority="high"
                decoding="async"
                className="absolute inset-0 size-full max-w-none object-cover"
              />
            </div>
          </div>
          {/* Desktop keeps the full-bleed collage. */}
          <img
            src="/figma-export/blog/hero-collage.png"
            alt="Брендована гостьова косметика та аксесуари Binar"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 hidden size-full object-cover lg:block"
          />

          <Link
            href="/blog/hostova-kosmetyka-formaty-ta-brenduvannya"
            className="group absolute bottom-6 left-1/2 flex w-[342px] max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-[40px] rounded-[40px] bg-white p-6 sm:w-[420px] lg:bottom-[32px] lg:left-[32px] lg:right-auto lg:w-[539px] lg:max-w-none lg:translate-x-0 lg:gap-[40px] lg:p-[24px]"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
              <span className="text-[12px] font-medium uppercase leading-5 text-brand lg:text-[14px] lg:leading-6">
                Готелі
              </span>
              <span className="text-[16px] font-semibold leading-[22px] tracking-[0.16px] text-neutral-900 lg:text-[18px] lg:tracking-[0.18px]">
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
