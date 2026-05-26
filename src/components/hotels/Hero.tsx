/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

// Figma node 1384:11587 (Hotels Hero, 1440 x 678).
// Each icon tile in Figma is a 64-px placeholder containing a 52-px
// bordered "Info icon", which in turn nests a 34-px frame (9-px inset)
// holding the SVG at a per-icon inset percentage. The `iconClass`
// below encodes the effective SVG size as a percentage of the 52-px
// inner tile — derived from Figma's nested-inset math so the rendered
// glyph hits the same visual size as the master.
const FEATURES = [
  {
    label: "Набір позицій",
    icon: "/figma-export/hotels/hero-icon-set.svg",
    // Figma 1256:6127: inset 6.25% inside the 34-px frame → 29.75 / 52 = 57%.
    iconClass: "size-[57%]",
  },
  {
    label: "Зрозумілий прорахунок",
    icon: "/figma-export/hotels/hero-icon-calc.svg",
    // Figma 1104:6088: inset 2.16% top/bottom, 16.59% left/right of 34-px
    // → h 32.53 / 52 = 63%, w 22.72 / 52 = 44%.
    iconClass: "h-[63%] w-[44%]",
  },
  {
    label: "Стабільні поставки",
    icon: "/figma-export/hotels/hero-icon-product.svg",
    // Figma 604:5322: inset 14.09% top/bottom, 16.29% left/right of 34-px
    // → h 24.42 / 52 = 47%, w 22.92 / 52 = 44%.
    iconClass: "h-[47%] w-[44%]",
  },
  {
    label: "Кастомізацію рішень",
    icon: "/figma-export/hotels/hero-icon-customize.svg",
    // Figma 1105:6245: inset 7.72% inside the 34-px frame → 28.75 / 52 = 55%.
    iconClass: "size-[55%]",
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
        <div className="flex flex-col gap-12 px-5 pb-8 pt-10 sm:gap-16 sm:px-10 sm:pb-10 sm:pt-14 lg:h-[678px] lg:w-[837px] lg:shrink-0 lg:gap-[88px] lg:rounded-br-[48px] lg:rounded-tr-[48px] lg:border lg:border-stroke-default lg:pb-10 lg:pl-[130px] lg:pr-8 lg:pt-20">
          {/* Top block — Figma 1384:11589: w 575, gap-[56] between
              the heading column and the CTA button. */}
          <div className="flex w-full flex-col gap-10 sm:gap-12 lg:w-[575px] lg:gap-14">
            {/* Heading column — Figma 1384:11590: w 575, gap-[24]
                between h1 and body copy. */}
            <div className="flex flex-col gap-5 sm:gap-6">
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
              <Button href="/#contact-form" arrow>
                Підібрати рішення
              </Button>
            </Reveal>
          </div>

          {/* Bottom block — Figma 1384:11594: w 575, gap-[40] between
              the "Ви отримуєте" header row and the 2x2 features grid. */}
          <div className="flex w-full flex-col gap-8 sm:gap-10 lg:w-[575px]">
            {/* Header row — Figma 1384:11595: w 575, gap-[16] between
                title and hairline divider. */}
            <div className="flex flex-col gap-3 sm:gap-4">
              <p className="text-title-sm text-neutral-900">Ви отримуєте</p>
              {/* Figma 1384:11597 — divider Vector 59 is 711 px wide
                  while the parent column is 575. The extra 136 px
                  bleeds past the card's pr-8 (32) so the line ends
                  ~4 px past the card's right border, kissing the
                  bg-#726053 photo column. */}
              <div
                className="h-px w-full lg:w-[711px] lg:max-w-none"
                style={{ background: "var(--color-stroke-subtle)" }}
              />
            </div>
            {/* Features grid — Figma 1384:11598: w 575, gap-y-[8],
                two rows of two cells with gap-x-[40] inside each row. */}
            <ul className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-2">
              {FEATURES.map((f, idx) => (
                <Reveal
                  as="li"
                  key={f.label}
                  delay={idx * 90}
                  className="flex items-center gap-2"
                >
                  {/* Figma 1384:11601 — outer "Icon placeholder" is
                      64x64 rounded-[8.267px] with no border; the
                      visible 52x52 bordered tile lives 6 px inside it.
                      This nested structure preserves the 64-px cell
                      height the design lays out against, while the
                      bordered tile renders at the right visual size. */}
                  <span className="relative flex size-12 shrink-0 items-center justify-center overflow-clip rounded-[8.267px] sm:size-16">
                    <span className="flex size-[42px] items-center justify-center overflow-clip rounded-[12px] border border-stroke-default sm:size-[52px]">
                      <img
                        src={f.icon}
                        alt=""
                        aria-hidden
                        loading="lazy"
                        decoding="async"
                        className={f.iconClass}
                      />
                    </span>
                  </span>
                  <span className="text-body-sm text-neutral-900">
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
          className="relative h-[320px] overflow-clip rounded-bl-[32px] rounded-br-[32px] sm:h-[420px] sm:rounded-bl-[40px] sm:rounded-br-[40px] md:h-[520px] lg:h-[678px] lg:w-[721px] lg:shrink-0 lg:rounded-bl-[48px] lg:rounded-br-none lg:rounded-tl-[48px]"
          style={{ background: "#726053" }}
        >
          {/* Figma 1384:11618 — `hotel03 1` is a 718 x 721 wrapper at
              (-30, -21) relative to the 721 x 678 column. We recreate
              the wrapper with right-[33px] (= 721 - 30 - 718) and
              top-[-21px] (= (678 - 721)/2, Figma's rounded value).
              The `<img>` inside scales to fill the wrapper via
              size-full + object-cover, so the 1620 x 1629 master
              renders at the same effective composition as Figma's
              master file. Below lg the wrapper full-bleeds the
              column with inset-0. */}
          <div className="absolute inset-0 lg:inset-auto lg:right-[33px] lg:top-[-21px] lg:h-[721px] lg:w-[718px]">
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
