/* eslint-disable @next/next/no-img-element */
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Reveal } from "@/components/ui/Reveal";

const FACTS = [
  "Національне покриття\nпо Україні",
  "Власні виробничі потужності\nв Україні",
  "Партнерські виробництва в ЄС\nта інших країнах",
  "Сертифікована система\nякості ISO 9001",
];

const STATS = [
  { value: 20, suffix: "+", label: "років досвіду" },
  { value: 800, suffix: "+", label: "активних B2B клієнтів" },
  { value: 150, suffix: "+", label: "реалізованих проєктів кастомізації" },
];

function MissionIcon() {
  return (
    <span className="flex size-[52px] shrink-0 items-center justify-center rounded-xl border border-stroke-default">
      <img
        src="/figma-export/about-us/icon-mission.svg"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="size-[34px]"
      />
    </span>
  );
}

function ValuesIcon() {
  return (
    <span className="flex size-[52px] shrink-0 items-center justify-center rounded-xl border border-stroke-default">
      <img
        src="/figma-export/about-us/icon-values.svg"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="size-[28px]"
      />
    </span>
  );
}

export function AboutUs() {
  return (
    // Figma frame About Us (1384:12694) is 1692 tall and sits flush with
    // its neighbours - no extra outer padding. The internal pt/pb on the
    // grey panel handles all vertical rhythm.
    <section className="py-12 sm:py-20 lg:py-0">
      {/* Upper rounded grey card — Figma "About Us txt" frame
          (1384:12695) is 1296 tall with rounded-[48px] corners and a
          bg-subtle fill. The card holds the heading + 2-col facts
          area. The bottom Stats/Shape sit OUTSIDE this card on the
          page's white bg, with the eco image + orange L positioned to
          straddle the boundary. lg:pb-[167px] adds the empty buffer
          area Figma reserves between the facts card's bottom (y=1126)
          and the bg-subtle card's bottom (y=1296) — the bottom row
          uses lg:-mt-[167px] to overlap into this buffer. */}
      <div className="overflow-hidden bg-bg-subtle lg:rounded-[48px] lg:pb-[167px]">
        <div className="px-6 pt-12 sm:px-12 sm:pt-16 lg-pad-x lg:pt-[160px]">
          <h2 className="max-w-[574px] text-h2-light text-neutral-900">
            <span className="text-h2-light">Binar 2000 - постачання для готелів </span>
            <span className="text-h2">по всій Україні з 2000 року</span>
          </h2>
        </div>

        {/* Two-col area — drop lg-pad-x on the container so the right
            card can reach the viewport's right edge (Figma master has
            facts card at x=736..1440 with no right gutter). Each column
            carries its own padding instead: left col adds the global
            lg-pad-x left padding so its content lands at x=130 like
            the heading, and the right card scales its right padding
            with --lg-pad-x so the inner content area stays anchored
            on ultra-wide viewports.

            lg:min-h-[742px] mirrors Figma Frame 1010106618 — the two-col
            band is 742 px tall in the master with deliberate empty space
            below each column's content. items-stretch (the flex default)
            ensures both cols share that height so the rounded card's
            left border can reach all the way down. */}
        <div className="flex flex-col gap-12 pt-12 sm:gap-16 sm:pt-16 lg:flex-row lg:min-h-[742px] lg:gap-20 lg:pt-[78px]">
          <div className="flex flex-col gap-10 px-6 sm:gap-16 sm:px-12 lg:flex-[1_1_656px] lg:px-0 lg:pl-[var(--lg-pad-x)] lg:pr-8">
            <div className="flex flex-col gap-3 sm:gap-4">
              <MissionIcon />
              <h3 className="text-title-lg text-neutral-900">Наша місія</h3>
              <p className="text-body-sm text-neutral-500">
                Ми допомагаємо клієнтам ефективно вести бізнес: впроваджуємо
                комплексні рішення та відкриваємо доступ до кращих
                інноваційних продуктів і практик.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:gap-4">
              <ValuesIcon />
              <h3 className="text-title-lg text-neutral-900">Наші цінності</h3>
              <p className="text-body-sm text-neutral-500">
                Відповідальність у кожній поставці, швидкість у комунікації,
                прозорі умови співпраці та контроль якості - щоб закупівлі
                були передбачуваними, а результат відчувався в роботі персоналу
              </p>
            </div>
          </div>

          <div className="relative border-t border-stroke-default px-6 py-10 sm:px-12 sm:py-12 lg:flex-[1_1_704px] lg:rounded-tl-[48px] lg:border-l lg:border-t lg:px-0 lg:py-12 lg:pl-20 lg:pr-[var(--lg-pad-x)]">
            {/* Orange hexagon pins — Figma 1384:12722-12725 (Polygon10).
                Each is an 8-px box containing a 6.9282×8 hexagon (the
                Figma asset has 6.7% horizontal inset). Positions on the
                facts card (704×742):
                  • top edge: left=140 → 19.89%
                  • top edge: left=592 → 84.09%
                  • left edge: top=330 → 44.47%
                  • left edge: top=587 → 79.11%
                Each polygon is positioned `left=-4` or `top=-5` so its
                centre lands on the border line. */}
            {[
              { top: -4, left: "19.89%", horizontal: true },
              { top: -4, left: "84.09%", horizontal: true },
              { left: -4, top: "44.47%", horizontal: false },
              { left: -4, top: "79.11%", horizontal: false },
            ].map((pin, i) => (
              <svg
                key={i}
                aria-hidden
                viewBox="0 0 6.9282 8"
                className={`absolute hidden h-2 w-[6.9282px] fill-brand lg:block ${
                  pin.horizontal ? "-translate-x-1/2" : "-translate-y-1/2"
                }`}
                style={{ top: pin.top, left: pin.left }}
              >
                <path d="M3.4641 0L6.9282 2V6L3.4641 8L0 6V2L3.4641 0Z" />
              </svg>
            ))}
            {/* Fact items — Figma spaces fact 01 → fact 02 by 148 px
                top-to-top (40 + divider + 40 around each divider).
                lg:gap-10 between <li> + lg:mt-10 before divider gives
                40 + 40 + 1px line = 81 px, matching the Figma layout to
                within a pixel of rounding. */}
            <ul className="flex flex-col gap-6 sm:gap-8 lg:gap-10">
              {FACTS.map((text, i) => {
                const [first, ...rest] = text.split("\n");
                return (
                  <Reveal as="li" key={i} delay={i * 90} direction="left">
                    <div className="flex items-center gap-4 sm:gap-6">
                      <span
                        aria-hidden
                        className="w-[64px] shrink-0 text-h1 text-neutral-900 sm:w-[95px]"
                      >
                        {String(i + 1).padStart(2, "0")}.
                      </span>
                      <p className="flex-1 text-body-lg text-neutral-900">
                        {first}
                        {rest.length > 0 && (
                          <>
                            <br aria-hidden />
                            {rest.join(" ")}
                          </>
                        )}
                      </p>
                    </div>
                    {i < FACTS.length - 1 && (
                      // Divider extends past the li's right edge by the
                      // card's right padding (= --lg-pad-x) so the line
                      // reaches the card's right border (= viewport
                      // right edge), matching Figma Vector 70/69/68
                      // which run x=80..704 inside the 704-wide card.
                      <div className="mt-6 h-px w-full bg-stroke-subtle sm:mt-8 lg:mt-10 lg:w-[calc(100%+var(--lg-pad-x))]" />
                    )}
                  </Reveal>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom area — OUTSIDE the bg-subtle card, on the page's
          white bg. In Figma the Shape frame (image + orange L) starts
          at y=1129 (within About Us), 3px below where the facts card's
          left border ends at y=1126. The bg-subtle card extends down
          to y=1296, so the image's top ~167px and the orange L's top
          ~167px overlap with the grey card's lower buffer area, then
          both shapes extend below onto white. lg:-mt-[167px] pulls
          this whole row up to recreate that overlap. Stats (numbers
          20+/800+/150+) sit below the orange L in the orange's notch
          area, entirely on the white bg in Figma.

          Tiered layout (no element ever overlaps another):
            • mobile/sm: image, orange and stats all stacked vertically
            • lg (1024–1279): image + orange side-by-side in a row,
              stats grid sits BELOW the row in normal flow
            • xl (1280+): full Figma L-composition — wrapper is
              aspect-locked to 1180×445; image is a 20.085% square
              pinned top-left; orange L-shape fills the right + top;
              stats are absolutely positioned in the L's bottom-left
              cutout with right offset = 46%. */}
      <div className="relative mt-10 px-6 pb-10 sm:mt-12 sm:px-12 sm:pb-12 lg:-mt-[167px] lg-pad-x lg:pb-[120px]">
          <div className="relative xl:aspect-[1180/445]">
            <div className="flex flex-col items-stretch gap-4 sm:gap-6 lg:flex-row lg:items-start lg:gap-[1.356%] xl:h-full">
              <div
                className="relative h-[200px] w-full shrink-0 overflow-hidden rounded-[32px] sm:h-[237px] sm:rounded-[48px] lg:aspect-square lg:h-auto lg:w-[clamp(140px,20.085%,237px)] lg:rounded-[48px]"
                style={{ background: "#474747" }}
              >
                <img
                  src="/figma-export/about-us/img-eco-products.png"
                  alt=""
                  aria-hidden
                  loading="lazy"
                  decoding="async"
                  className="absolute h-[130%] w-[129%] max-w-none object-cover"
                  style={{ left: "-18.1%", top: "-17.5%" }}
                />
              </div>
              {/* Below lg, the Figma orange L-shape (Vector75) renders as
                  an awkward squashed horizontal band because the SVG's
                  natural aspect (927/445 ≈ 2.08) doesn't suit mobile
                  widths. Replace it with a clean rounded brand-colored
                  card carrying the same texture image so the bottom
                  area still has a recognisable orange accent on mobile.
                  The full L-shape returns at lg+ where the column layout
                  actually exists. */}
              <div className="relative flex-1 xl:h-full">
                <div
                  className="relative block h-[160px] w-full overflow-hidden rounded-[32px] sm:h-[200px] sm:rounded-[48px] lg:hidden"
                  style={{ background: "#F7580C" }}
                >
                  <img
                    src="/figma-export/about-us/img-shape-content.png"
                    alt=""
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 size-full object-cover opacity-70 mix-blend-soft-light"
                  />
                  {/* Brand-accent watermark — gives the card a clear
                      visual identity instead of a flat orange swatch.
                      Big "20+" mirrors the years-of-experience stat
                      below, reinforcing the section's headline number
                      with a softer typographic accent. */}
                  <p
                    aria-hidden
                    className="absolute bottom-4 right-5 text-[64px] font-semibold leading-none tracking-[-1.6px] text-white/30 sm:bottom-6 sm:right-7 sm:text-[88px] sm:tracking-[-2.2px]"
                  >
                    20<span className="text-white/60">+</span>
                  </p>
                </div>
                <svg
                  viewBox="0 0 927 445"
                  preserveAspectRatio="xMidYMid meet"
                  className="hidden h-auto w-full lg:block xl:h-full"
                  aria-hidden
                >
                  <defs>
                    <clipPath id="aboutOrangeWave" clipPathUnits="userSpaceOnUse">
                      <path d="M480.753 0C506.47 3.64687e-06 527.318 20.9047 527.318 46.6919V133.267C527.318 150.458 541.217 164.394 558.362 164.394H880.435C906.152 164.394 927 185.299 927 211.086V398.308C927 424.095 906.152 445 880.435 445H503.066C477.349 445 456.501 424.095 456.501 398.308V261.669C456.501 244.478 442.602 230.541 425.458 230.541H46.5649C20.8478 230.541 6.32893e-07 209.637 0 183.849V46.6919C0 20.9047 20.8478 0 46.5649 0H480.753Z" />
                    </clipPath>
                  </defs>
                  <g clipPath="url(#aboutOrangeWave)">
                    <rect width="927" height="445" fill="#F7580C" />
                    <image
                      href="/figma-export/about-us/img-shape-content.png"
                      x="-30"
                      y="-30"
                      width="990"
                      height="510"
                      preserveAspectRatio="xMidYMid slice"
                    />
                  </g>
                </svg>
              </div>
            </div>

            {/* On mobile the 3-col grid squeezed each stat's label
                column to ~98 px and the long "реалiзованих проєктiв
                кастомiзацii" string broke mid-word due to the
                global `overflow-wrap: anywhere` rule. Stack to a
                single column on the narrowest viewports (<sm), and
                let the 3-col Figma master grid resume on sm+ where
                there's enough room (sm/3 = ~256 px per column).
                Mobile stats render as a horizontal row inside a
                top-bordered band so each metric reads as a peer in
                the trio rather than three loose blocks. */}
            <ul className="mt-8 flex flex-row items-start justify-between gap-3 border-t border-stroke-subtle pt-8 sm:mt-10 sm:grid sm:grid-cols-3 sm:gap-x-10 sm:gap-y-2 sm:border-t-0 sm:pt-0 lg:mt-12 lg:gap-x-12 lg:pr-[8%] xl:absolute xl:bottom-0 xl:left-0 xl:right-[46%] xl:mt-0 xl:gap-x-[clamp(20px,3vw,48px)] xl:pr-0">
              {STATS.map((s, i) => (
                <Reveal
                  key={s.label}
                  as="li"
                  delay={i * 120}
                  className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none sm:gap-3"
                >
                  <p className="whitespace-nowrap text-[36px] font-semibold leading-[1.03] tracking-[-0.8px] text-neutral-900 sm:text-[60px] sm:tracking-[-1.3px] lg:text-[80px] lg:tracking-[-1.6px]">
                    <AnimatedNumber value={s.value} />
                    <span className="text-brand">{s.suffix}</span>
                  </p>
                  <p className="text-[13px] leading-[18px] text-neutral-500 sm:max-w-[200px] sm:text-body-sm sm:leading-snug">
                    {s.label}
                  </p>
                </Reveal>
              ))}
            </ul>
          </div>
      </div>
    </section>
  );
}
