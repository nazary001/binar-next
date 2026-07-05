/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

// Figma node 1384:11587 (Hotels Hero, 1440 x 678).
// Each 52-px bordered "Info icon" tile nests a 34-px zone (9-px inset =
// 17.31%) whose SVG export carries the glyph's own padding baked in, so
// every icon renders at exactly the master's size with one uniform
// inset — no per-icon percentage math.
const FEATURES = [
  {
    label: "Набір позицій",
    icon: "/figma-export/info-icons/hh-positions.svg",
  },
  {
    label: "Зрозумілий прорахунок",
    icon: "/figma-export/info-icons/hh-calculator.svg",
  },
  {
    label: "Стабільні поставки",
    icon: "/figma-export/info-icons/hh-product.svg",
  },
  {
    label: "Кастомізацію рішень",
    icon: "/figma-export/info-icons/hh-customize.svg",
  },
];

export function HotelsHero() {
  return (
    <section className="w-full overflow-x-clip">
      {/* Figma 1384:11587 — at lg the two columns are FIXED-width
          (card 837 + photo 721 = 1558) and overflow the 1440 canvas
          by 118 px on the right. The section's overflow-x-clip hides
          the bleed (the right slice of the bg-#726053 photo column),
          mirroring Figma's frame-clipped rendering. The html zoom in
          globals.css scales the whole 1440 design proportionally to
          every desktop viewport, so the same 837/721 fixed numbers
          render identically at 1024, 1440, 1920, 2560+. */}
      <div className="flex flex-col items-stretch lg:flex-row">
        {/* Left card — Figma 1384:11588: w 837 h 678, border solid
            #8e8e8f on all four sides, rounded only on the right
            (tr 48, br 48), padding 130/32/80/40. The left border
            bleeds past the visible viewport on >1440 monitors so the
            screen edge always looks like a flush card. */}
        {/* At lg+ the Hero card draws border only on TOP, LEFT, RIGHT
            (no border-b) and keeps just `lg:rounded-tr-[48px]` on its
            outer corner. The seam between Hero and the next section is
            painted ENTIRELY by the next section's border-t — so the
            user sees one uniformly thin hairline curving with the
            ZonesGrid rounded-tl/tr, instead of two parallel strokes +
            corner cutouts that read as a thick gap. Square bottom
            corners + open bottom edge let the next section's border
            "cap" the Hero cleanly. */}
        {/* Mobile (Figma 3117:14366): full-bleed text card with a border on
            top/right/bottom + rounded RIGHT corners, sitting BELOW the photo
            band (order-2). px-24 py-48. Desktop (lg) restores the original
            837-wide hero card unchanged. */}
        <div className="order-2 flex flex-col gap-12 rounded-tr-[32px] rounded-br-[32px] border-y border-r border-stroke-default px-6 py-[47px] sm:gap-16 sm:px-8 sm:py-14 lg:order-none lg:h-[678px] lg:w-[837px] lg:shrink-0 lg:gap-[88px] lg:rounded-br-[48px] lg:rounded-tr-[48px] lg:border lg:border-stroke-default lg:pb-10 lg:pl-[130px] lg:pr-8 lg:pt-20">
          {/* Top block — Figma 1384:11589: w 575, gap-[56] between
              the heading column and the CTA button. */}
          <div className="flex w-full flex-col gap-8 sm:gap-12 lg:w-[575px] lg:gap-14">
            {/* Heading column — Figma 1384:11590: w 575, gap-[24]
                between h1 and body copy. */}
            <div className="flex flex-col gap-4 sm:gap-6">
              <Reveal as="h1" className="text-h1 text-neutral-900">
                Усе для готелів
              </Reveal>
              {/* Body color = Figma Text/Medium #343435 → text-neutral-800.
                  Figma typo "під під ваш бюджет" corrected to single "під". */}
              <Reveal
                as="p"
                delay={120}
                className="text-body-md text-neutral-800"
              >
                B2B постачання одноразової продукції та комплектація номерів під ваш бюджет, формат та стандарти.
              </Reveal>
            </div>
            <Reveal delay={240}>
              {/* Mobile: Figma Button/Small in a 240-px pill (label fills).
                  Desktop keeps the large CTA. */}
              <Button
                href="/#contact-form"
                size="small"
                arrow
                className="w-[240px] [&>span:last-child]:flex-1 lg:hidden"
              >
                Підібрати рішення
              </Button>
              <Button
                href="/#contact-form"
                arrow
                className="max-lg:hidden"
              >
                Підібрати рішення
              </Button>
            </Reveal>
          </div>

          {/* Bottom block — Figma 1384:11594: w 575, gap-[40] between
              the "Ви отримуєте" header row and the 2x2 features grid. */}
          <div className="flex w-full flex-col gap-10 lg:w-[575px]">
            {/* Header row — Figma 1384:11595: w 575, gap-[16] between
                title and hairline divider. */}
            <div className="flex flex-col gap-4">
              <p className="text-title-sm text-neutral-900">Ви отримуєте</p>
              {/* Figma 1384:11597 — divider Vector 59 is 711 px wide
                  while the parent column is 575. The extra 136 px
                  bleeds past the card's pr-8 (32) so the line ends
                  ~4 px past the card's right border, kissing the
                  bg-#726053 photo column. */}
              <div
                className="h-px w-full max-lg:-mb-px lg:w-[711px] lg:max-w-none"
                style={{ background: "var(--color-stroke-subtle)" }}
              />
            </div>
            {/* Features grid — Figma 1384:11598: w 575, gap-y-[8],
                two rows of two cells with gap-x-[40] inside each row. */}
            <ul className="grid grid-cols-1 gap-y-2 lg:grid-cols-2 lg:gap-x-10">
              {FEATURES.map((f, idx) => (
                <Reveal
                  as="li"
                  key={f.label}
                  delay={idx * 90}
                  className="flex items-center gap-4 py-1 lg:gap-2"
                >
                  {/* Figma 1384:11601 — outer "Icon placeholder" is
                      64x64 rounded-[8.267px] with no border; the
                      visible 52x52 bordered tile lives 6 px inside it.
                      On mobile the Figma master shows just the 52-px
                      bordered tile, so the outer placeholder collapses
                      to 52 too (no extra cell padding) and grows to 64
                      only at sm+/desktop. */}
                  <span className="relative flex size-[52px] shrink-0 items-center justify-center overflow-clip rounded-[8.267px] sm:size-16">
                    <span className="relative flex size-[52px] items-center justify-center overflow-clip rounded-[12px] border border-stroke-default sm:size-[52px]">
                      <img
                        src={f.icon}
                        alt=""
                        aria-hidden
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-[17.31%] size-[65.38%] max-w-none"
                      />
                    </span>
                  </span>
                  <span className="text-[16px] leading-[24px] text-neutral-900">
                    {f.label}
                  </span>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>

        {/* Photo column — Figma 1384:11617: w 721 h 678, bg-#726053,
            rounded-bl-[48px] rounded-tl-[48px], overflow-clip. At lg+
            the column is fixed-width and lives flush against the
            card's right edge. Its right 118 px bleeds past the 1440
            canvas (and gets clipped by the section's overflow-x-clip)
            so the image positioned right-[33px] inside stays anchored
            to the design frame, exactly as Figma renders the master. */}
        <div
          className="relative order-first h-[320px] overflow-clip rounded-tl-[32px] rounded-bl-[32px] bg-[#c34924] sm:rounded-tl-[40px] sm:rounded-bl-[40px] lg:order-none lg:h-[678px] lg:w-[721px] lg:shrink-0 lg:rounded-bl-[48px] lg:rounded-br-none lg:rounded-tl-[48px] lg:bg-[#726053]"
        >
          {/* === Mobile band (Figma 3117:14361) === Same master pattern
              as the home hero: #c34924 fill + 20% texture, then the
              amenities photo in the exact Figma box (left -2.53 / right
              -14.39 / centred at 50% - 22.48px, aspect 406.92/448.785)
              with the inner crop at 96.82% x 88.28%, top 15.21%. */}
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
                left: "-2.53px",
                right: "-14.39px",
                top: "calc(50% - 22.48px)",
                transform: "translateY(-50%)",
                aspectRatio: "406.92 / 448.785",
              }}
            >
              <div
                className="absolute"
                style={{
                  left: "-0.08%",
                  top: "15.21%",
                  width: "96.82%",
                  height: "88.28%",
                  backgroundImage:
                    "url(/figma-export/hotels/hero-hotel.png)",
                  backgroundSize: "100% 100%",
                }}
              />
            </div>
          </div>
          {/* Figma 1384:11618 — `hotel03 1` is a 718 x 721 wrapper at
              (-30, -21) relative to the 721 x 678 column. We recreate
              the wrapper with right-[33px] (= 721 - 30 - 718) and
              top-[-21px] (= (678 - 721)/2, Figma's rounded value).
              The `<img>` inside scales to fill the wrapper via
              size-full + object-cover, so the 1620 x 1629 master
              renders at the same effective composition as Figma's
              master file. Desktop-only; mobile uses the master band
              composition above. */}
          <div className="absolute hidden lg:right-[33px] lg:top-[-21px] lg:block lg:h-[721px] lg:w-[718px]">
            <img
              src="/figma-export/hotels/hero-hotel.png"
              alt="Готельний номер з продукцією Binar"
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
