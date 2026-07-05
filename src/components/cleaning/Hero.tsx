/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export function CleaningHero() {
  return (
    // overflow-x-clip mirrors hotels/protect heroes: at lg the two
    // columns are FIXED-width (text 837 + photo 721 = 1558) and bleed
    // 118 px past the 1440 canvas on the right. Clipping at the section
    // hides that bleed so the photo's right-most slice (which Figma
    // also crops at the 1440 frame edge) is never visible.
    <section className="w-full overflow-x-clip">
      {/* Below lg the Figma MOBILE master (3165:6670/6672) stacks the
          two as an alternating-corner pair: the photo band on TOP
          (rounded LEFT — tl+bl) and the text in a bordered card BELOW
          (border t/r/b, rounded RIGHT — tr+br). `flex-col-reverse`
          puts the photo (2nd child) above the text (1st child) on
          mobile while `lg:flex-row` restores the desktop row. */}
      <div className="flex flex-col-reverse items-stretch lg:flex-row">
        {/* Left card - Figma 1327:4438: w 837 h 640. The card HAS a
            full solid border #8e8e8f on all 4 sides AND rounded-tr
            rounded-br [48px], producing the curved-right "card" edge
            that meets the photo column's curved-left edge. Padding
            pt 80 / pl 130 / pr 32 / pb 40 mirrors Figma's inner
            content frame at (130, 80) w=575. */}
        <div className="flex flex-col gap-8 rounded-br-[32px] rounded-tr-[32px] border-b border-r border-t border-stroke-default px-6 py-[47px] sm:gap-12 sm:px-10 sm:py-14 lg:h-[640px] lg:w-[837px] lg:shrink-0 lg:gap-14 lg:rounded-br-[48px] lg:rounded-tr-[48px] lg:border lg:border-stroke-default lg:pb-10 lg:pl-[130px] lg:pr-8 lg:pt-20">
          <div className="flex w-full flex-col gap-8 sm:gap-12 lg:w-[575px] lg:gap-14">
            <div className="flex flex-col gap-4 sm:gap-6">
              <Reveal as="h1" className="text-h1 text-neutral-900">
                Засоби та інвентар для прибирання
              </Reveal>
              <Reveal
                as="p"
                delay={120}
                className="text-body-md text-neutral-800 max-w-[575px]"
              >
                Професійна хімія, інвентар та гігієна для бізнесу — стабільні
                поставки і контроль якості.
              </Reveal>
            </div>
            <Reveal delay={240}>
              <Button href="/#contact-form" size="responsive" arrow>
                Підібрати рішення
              </Button>
            </Reveal>
          </div>
        </div>

        {/* Photo column - Figma 1327:4444: w 721 h 640, bg #726053,
            rounded-bl-[48] rounded-tl-[48]. Fixed-width at lg so the
            column sits flush against the text card. Its right 118 px
            bleeds past the 1440 canvas (clipped by the section's
            overflow-x-clip) so the inner image rectangle's positive
            offsets stay anchored to Figma's master, exactly as the
            designer framed it. */}
        <div
          className="relative h-[320px] overflow-clip rounded-bl-[32px] rounded-tl-[32px] sm:h-[420px] sm:rounded-bl-[40px] sm:rounded-tl-[40px] md:h-[480px] lg:h-[640px] lg:w-[721px] lg:shrink-0 lg:rounded-bl-[48px] lg:rounded-br-none lg:rounded-tl-[48px]"
          style={{ background: "#c34924" }}
        >
          {/* Figma 1327:4445 - image rectangle is 856.45 x 750.65,
              positioned (-85.59, -6.06) inside the 721 x 640 photo
              column with rounded-[40px]. At lg we recreate that
              wrapper with `lg:inset-auto lg:left-[-86px] lg:top-[-6px]
              lg:w-[856px] lg:h-[750px] lg:rounded-[40px]`; below lg the
              wrapper full-bleeds the column via inset-0 + no border
              radius so the image just fills the mobile/tablet slot.
              The image inside fills the wrapper with object-cover so
              the composition (mop + brush + spray bottle) renders the
              same on every viewport. */}
          {/* === Mobile band (Figma 3165:6670) === #c34924 + 20% texture,
              the mop/brush/spray photo in a full-width box 385.27 tall
              centred at calc(50% - 15.48px), inner crop 101.95% x
              114.95% at left -1.95% / top 7.06%. */}
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
              className="absolute inset-x-0 overflow-hidden"
              style={{
                top: "calc(50% - 15.48px)",
                transform: "translateY(-50%)",
                height: "385.273px",
              }}
            >
              <img
                src="/figma-export/directions/card-cleaning.png"
                alt="Засоби для прибирання"
                fetchPriority="high"
                loading="eager"
                decoding="async"
                className="absolute max-w-none"
                style={{
                  left: "-1.95%",
                  top: "7.06%",
                  width: "101.95%",
                  height: "114.95%",
                }}
              />
            </div>
          </div>
          {/* Desktop: the Figma master's 856x750 wrapper at (-86, -6). */}
          <div className="absolute hidden overflow-clip lg:left-[-86px] lg:top-[-6px] lg:block lg:h-[750px] lg:w-[856px] lg:rounded-[40px]">
            <img
              src="/figma-export/directions/card-cleaning.png"
              alt="Засоби для прибирання"
              fetchPriority="high"
              loading="eager"
              decoding="async"
              className="absolute inset-0 size-full max-w-none object-cover object-center"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
