/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/Button";

// Decorative cluster on the dark CTA — cross pattern + orange tag
// (shared with home TeamCta) PLUS the 4 hotels-specific silhouette
// shapes from Figma Group 73 (slippers), Group 76 (bottle), Group 69
// (flower) and Group 77. These are flattened vector SVGs exported
// straight from the Figma groups (node.exportAsync SVG_STRING) so they
// stay crisp at any DPI — the earlier 1x PNG exports were blurry on
// retina because they were rasterised at the exact display pixel size.
// Coordinates are right-anchored pixel offsets
// inside the 1440-wide dark cap so the cluster stays glued to the
// design's right edge as the cap grows on viewports > 1440.
function HotelsDecorCluster() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden overflow-hidden rounded-t-[40px] sm:rounded-t-[56px] lg:rounded-t-[68px] lg:block"
    >
      {/* Cross pattern: 4 quadrant L-shapes meeting at (77.4 %, 42.86 %).
          Each quadrant draws only the two borders facing the cross
          centre, with a 48-px rounded inner corner where they meet.
          Identical math to the home TeamCta DecorCluster — the design
          uses the same composition for both dark CTA caps.

          Left arms (UL + LL) fade from transparent at the heading side
          to fully opaque around 64 % of the arm's width, matching the
          Figma cap (the cross dissolves under the 2-line heading
          instead of cutting through the text). Same `mask-image`
          treatment as /protect and /cleaning. */}
      <div className="absolute inset-0">
        <div
          className="absolute rounded-br-[48px] border-b border-r border-white"
          style={{
            left: "35.93%",
            right: "22.59%",
            top: 0,
            bottom: "57.14%",
            maskImage: "linear-gradient(to right, transparent 0%, #000 64%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 64%)",
          }}
        />
        <div
          className="absolute rounded-bl-[48px] border-b border-l border-white"
          style={{ left: "77.41%", right: 0, top: 0, bottom: "57.14%" }}
        />
        <div
          className="absolute rounded-tr-[48px] border-t border-r border-white"
          style={{
            left: "35.93%",
            right: "22.59%",
            top: "42.86%",
            bottom: 0,
            maskImage: "linear-gradient(to right, transparent 0%, #000 64%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 64%)",
          }}
        />
        <div
          className="absolute rounded-tl-[48px] border-t border-l border-white"
          style={{ left: "77.41%", right: 0, top: "42.86%", bottom: 0 }}
        />
      </div>

      {/* Orange tag (Ellipse 50 stroke, Figma 1384:11969) - sits in
          the upper-LEFT quadrant of the cross. SVG viewBox is 70.24 x
          149.68 (vertical); rotated -90 to a horizontal 149.68 x 70.24.
          Figma renders the rotated bbox at x=819.41 in the 1440 cap so
          the right-anchored offset is 1440 - 819.41 - 149.68 = 470.91.
          (Earlier code used right=425, copy-pasted from the home
          TeamCta DecorCluster where the tag sits in a different spot.) */}
      <div
        className="absolute flex items-center justify-center"
        style={{ right: "470.91px", top: "98px", width: "149.683px", height: "70.236px" }}
      >
        <img
          src="/figma-export/decor/ellipse50-stroke.svg"
          alt=""
          className="block -rotate-90"
          style={{ width: "70.236px", height: "149.683px" }}
        />
      </div>

      {/* Figma 1384:11970 Group 73 - slippers silhouette pair, in the
          lower-LEFT quadrant of the cross. Plugin MCP design-context
          places Group 73's bbox at left=66.29%=954.58, top=45.65%=
          178.95 of the 1440 x 392 cap; right = 1440-954.58-141.14 =
          344.28. (Earlier code derived right from the misleading frame-
          metadata x=1095.74, which is actually the rotated bbox's right
          edge, putting the slippers one whole icon-width too far right.) */}
      <img
        src="/figma-export/hotels/solutions/decor/slippers.svg"
        alt=""
        className="absolute"
        style={{ right: "344.28px", top: "178.95px", width: "141.14px", height: "138.07px" }}
      />
      {/* Figma 1384:11977 Group 76 - bottle / hair-dryer silhouette in
          the lower-RIGHT quadrant. left=82.92%=1194, top=53.65%=210.30,
          w=99.93, h=126.30. Already matches the design. */}
      <img
        src="/figma-export/hotels/solutions/decor/bottle.svg"
        alt=""
        className="absolute"
        style={{ right: "146px", top: "210.30px", width: "100px", height: "126px" }}
      />
      {/* Figma 1384:11981 Group 69 - four-point sparkle cluster between
          the slippers and the bottle. left=78.89%=1136.02, top=50%=196
          so right = 1440-1136.02-44.76 = 259.22. (Earlier code's
          right=214.48 was off by ~45 px, same metadata mismatch as the
          slippers.) */}
      <img
        src="/figma-export/hotels/solutions/decor/flower.svg"
        alt=""
        className="absolute"
        style={{ right: "259.22px", top: "196px", width: "44.76px", height: "45.79px" }}
      />
      {/* Figma 1384:11985 Group 77 - service bell on the right edge.
          Design-context anchors it at left=1290px so right = 1440-1290-
          89 = 61. Already matches the design. */}
      <img
        src="/figma-export/hotels/solutions/decor/group77.svg"
        alt=""
        className="absolute"
        style={{ right: "61px", top: "257px", width: "89px", height: "63px" }}
      />
    </div>
  );
}

const CUSTOMIZATIONS = [
  {
    title: "Дизайн",
    tags: ["логотип", "кольори"],
    icon: "/figma-export/hotels/solutions/icon-design.svg",
  },
  {
    title: "Матеріали",
    tags: ["економ", "стандарт", "преміум"],
    icon: "/figma-export/hotels/solutions/icon-materials.svg",
  },
  {
    title: "Формати і розміри",
    tags: ["під ваші стандарти"],
    icon: "/figma-export/hotels/solutions/icon-size.svg",
  },
  {
    title: "Аромати",
    tags: ["стандарт", "преміум"],
    icon: "/figma-export/hotels/solutions/icon-aroma.svg",
  },
];

const PRODUCTS = [
  "/figma-export/hotels/solutions/img-product-1.png",
  "/figma-export/hotels/solutions/img-product-2.png",
  "/figma-export/hotels/solutions/img-product-3.png",
  "/figma-export/hotels/solutions/img-product-4.png",
];

// REPEATS copies of PRODUCTS render in a single flat ul. The seamless-
// wraparound math requires the shift per cycle to equal an integer
// number of source copies, AND for the track width to be N_copies x
// (item + trailing margin) exactly. So every li carries its own
// `mr-*` (no `gap-*` on the ul), which gives the last item of each
// copy the same trailing space as items inside a copy -- then the
// track is exactly N_copies x period and `-100/REPEATS%` lands the
// translate at a copy boundary. At -25% shift on a 4-copy track, the
// content rotating into view at x=0 after restart is visually
// identical to the content that was there before restart, so the
// wrap-around is invisible.
//
// N must also be large enough that `track_width - 1_copy >= viewport`,
// otherwise a blank gap shows on the right at the moment the shift
// completes. At lg one copy is 4 * 309 + 4 * 32 = 1364 px; 4 copies
// give a 5456-px track which clears viewports up to 4092 px (covers
// every realistic desktop including 4K at 100 % zoom).
const REPEATS = 4;
const PRODUCT_DURATION = "30s";

export function Solutions() {
  const productLoop = Array.from({ length: REPEATS }, () => PRODUCTS).flat();

  return (
    <section className="flex flex-col">
      {/* Figma 1384:11958 — dark CTA cap is exactly 392 px tall on lg
          (pt-68 + 196 content + pb-128 = 392) and overlaps the light
          "Кастомізація" card below by 72 px (the card's rounded top
          eats into the dark band). Same pattern as the home TeamCta:
          rounded-t corners + negative bottom margin pulls the next
          sibling up so it covers the cap's bottom 72 px. */}
      <div
        className="lg-pad-x relative -mb-12 overflow-hidden rounded-t-[40px] px-6 pb-20 pt-10 sm:-mb-14 sm:rounded-t-[56px] sm:px-10 sm:pb-24 sm:pt-14 lg:-mb-[72px] lg:rounded-t-[68px] lg:pb-[128px] lg:pt-[68px]"
        style={{ background: "#2d2d2f" }}
      >
        <div className="relative z-10 flex max-w-[571px] flex-col gap-8 sm:gap-12 lg:gap-12">
          <h2 className="text-white">
            <span className="text-h2-light">Основні рішення</span>
            <br aria-hidden />
            <span className="text-h2">для готелів</span>
          </h2>
          <Button href="/#contact-form" variant="outlined" arrow>
            Підібрати рішення
          </Button>
        </div>
        <HotelsDecorCluster />
      </div>

      <div className="relative rounded-[40px] bg-bg-subtle pb-16 pt-12 sm:rounded-[56px] sm:pb-24 sm:pt-16 lg:rounded-[68px] lg:pb-[225px] lg:pt-0">
        <div className="lg-pad-x px-5 sm:px-10">
          {/* Figma 1384:11993 header band - frame is exactly 384 px
              tall on the 1440 master: pt=160 + 96 content + pb=128
              (the 96-px h2 sets the content height; the description
              paragraph is 72 px / 3 lines and sits beside it). The
              inner Frame 1010106569 (1384:11994) is `flex items-start
              gap-32` between h2 and p. */}
          <div className="flex flex-col gap-6 pt-8 sm:gap-8 sm:pt-12 lg:flex-row lg:items-start lg:gap-[32px] lg:pb-[128px] lg:pt-[160px]">
            <h3 className="flex-1 text-neutral-900">
              <span className="text-h2">Кастомізація</span>
              <br aria-hidden />
              <span className="text-h2-light">під ваш бренд</span>
            </h3>
            <p className="flex-1 max-w-[574px] text-body-sm text-neutral-500">
              Кастомізовані деталі — це не просто витратні матеріали, а частина
              сервісу, яку гість помічає одразу. Саме вони формують відчуття
              рівня готелю, уваги до деталей і турботи.
            </p>
          </div>
          {/* Figma 1384:11997 list — 4 row frames stacked, each
              `flex-col gap-[40px] pt-[40px]` containing a 96-px
              content row + a 1-px Vector 60 divider (omitted on the
              last row, which is also pb-0 so the list ends 40 px
              shorter than the others). Content row is `flex
              items-center justify-between` with the left subgroup
              (title 574 + 33 gap + tags) and a 96×96 icon at the
              right. The big visual gap between tags and icon at the
              1440 master (≈ 277 px when tags are 200 wide) is
              produced by `justify-between` + the left subgroup's
              fixed `w-877`; we reproduce it with `lg:ml-auto` on the
              icon, which absorbs the same free space at any cap
              width. */}
          <ul className="flex flex-col">
            {CUSTOMIZATIONS.map((c, i) => {
              const isLast = i === CUSTOMIZATIONS.length - 1;
              return (
                <li
                  key={c.title}
                  className={`flex flex-col gap-4 py-6 sm:gap-6 sm:py-10 lg:flex-row lg:items-center lg:gap-[33px] lg:pt-10 ${
                    i > 0 ? "border-t border-stroke-subtle" : ""
                  } ${isLast ? "lg:pb-0" : "lg:pb-10"}`}
                >
                  {/* Mobile / sm: title + icon stack in a single row
                      at the top, tags wrap onto a row below. lg
                      restores Figma's title → tags → icon-right
                      layout via `lg:contents` + per-item
                      `lg:order-1/2/3` so the title and icon become
                      direct flex children of the li. */}
                  <div className="flex items-center justify-between gap-4 lg:contents">
                    <p className="flex-1 text-h2 text-neutral-900 lg:order-1 lg:w-[574px] lg:flex-none">
                      {c.title}
                    </p>
                    {/* Figma 1384:12008 Info icon — 96×96 outer
                        `border-[#8e8e8f] rounded-[18px]` with the SVG
                        asset filled at 81 % of the outer box.
                        `lg:ml-auto` pushes the icon to the row's
                        right edge so the gap between tags and icon
                        expands like Figma's justify-between layout. */}
                    <span className="flex size-[56px] shrink-0 items-center justify-center overflow-clip rounded-[12px] border border-stroke-default sm:size-[72px] sm:rounded-[14px] lg:order-3 lg:ml-auto lg:size-[96px] lg:rounded-[18px]">
                      <img
                        src={c.icon}
                        alt=""
                        aria-hidden
                        loading="lazy"
                        decoding="async"
                        className="size-[81%] object-contain"
                      />
                    </span>
                  </div>
                  {/* Figma 1384:12003 tags row — `flex gap-[16px]
                      items-center` with each chip at intrinsic width
                      (no flex-1). `lg:flex-none` keeps the chips at
                      their natural width so the icon's `ml-auto` can
                      push it to the right; below lg the chips wrap
                      freely inside the available row width. */}
                  <ul className="flex flex-wrap items-center gap-2 sm:gap-4 lg:order-2 lg:flex-none lg:gap-[16px]">
                    {c.tags.map((t) => (
                      <li
                        key={t}
                        // Figma chip 1384:12004 — `border #343435 px-16
                        // py-12 rounded-60` with text `Manrope Regular
                        // 16 / leading-16 #343435`. The `leading-16`
                        // is critical: text-body-sm's default 24-px
                        // line height made the chip 48 tall instead
                        // of 40.
                        className="rounded-full border border-neutral-800 px-3 py-2 text-[16px] leading-[16px] text-neutral-800 whitespace-nowrap sm:px-4 sm:py-3"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Figma 1384:12044 "Cases" marquee - a fixed 720-px block on
            the 1440 master with the 370-px card row centred +30 px, so
            the design leaves 205 px above the cards and 145 px below;
            the card then adds its own 80-px bottom pad (145 + 80 = 225
            px from the cards to the card's rounded bottom edge). We put
            the 205 above as this block's `lg:pt` and fold the 225 below
            into the card's `lg:pb`. Mobile/tablet scale down to 64/96 px. */}
        <div className="relative overflow-hidden pt-16 sm:pt-24 lg:pt-[205px]">
          <ul
            className="animate-marquee flex w-max items-center"
            style={
              {
                "--marquee-shift": `${-100 / REPEATS}%`,
                "--marquee-duration": PRODUCT_DURATION,
              } as React.CSSProperties
            }
          >
            {productLoop.map((src, i) => (
              <li
                key={i}
                aria-hidden={i >= PRODUCTS.length || undefined}
                className="group/product mr-4 h-[260px] w-[220px] shrink-0 cursor-pointer overflow-hidden rounded-[28px] bg-white sm:mr-6 sm:h-[320px] sm:w-[270px] sm:rounded-[36px] lg:mr-8 lg:h-[370px] lg:w-[309px] lg:rounded-[48px]"
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
