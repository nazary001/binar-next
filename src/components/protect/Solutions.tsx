/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Button } from "@/components/ui/Button";

const ARROW_WHITE = "/figma-export/hero/arrow-up-right.svg";

type Category =
  | { kind: "image"; label: string; image: string; tall?: boolean }
  | {
      kind: "outline";
      label: string;
      icon?: string;
      // Vertical gap between the illustration and the label inside
      // the card. Figma assigns distinct gaps per card to keep each
      // illustration centred in its native frame:
      //   - "tight" (=  11 px at lg, Figma 1327:4027 "Одноразова
      //     білизна") → illustration container 313 × 274.
      //   - "loose" (=  40 px at lg, Figma 1327:4045 "Бахіли,
      //     шапочки, нарукавники") → illustration container 313 × 217
      //     with a taller two-line label.
      gap?: "tight" | "loose";
    }
  | { kind: "cta"; label: string };

const COLUMNS: Category[][] = [
  [
    { kind: "image", label: "Маски та респіратори", image: "/figma-export/protect/cat-masks.png" },
    {
      kind: "outline",
      label: "Одноразова білизна",
      // 313x274 PNG = exact Figma Frame 1010106796 dimensions, so it
      // fills the card's 313-wide content area 1:1 at lg.
      icon: "/figma-export/protect/icon-bilizna.png",
      gap: "tight",
    },
  ],
  [
    {
      kind: "outline",
      label: "Бахіли, шапочки, нарукавники",
      // 313x217 PNG = exact Figma Frame 1010106793 dimensions.
      icon: "/figma-export/protect/icon-bahily.png",
      gap: "loose",
    },
    // cat-gowns.png in this folder is actually the bedroom photo
    // intended for Hotels (mislabeled when the assets were
    // exported). The real medical-gown render lives in
    // cat-gowns-2.png - keeping that path until the asset folder is
    // re-organised so the card actually shows a gown.
    { kind: "image", label: "Одноразові халати та комбінезони", image: "/figma-export/protect/cat-gowns-2.png" },
  ],
  [
    // Figma column 3: Рукавички image is 655 px tall (Frame
    // 1010106778) with the catalog CTA filling the remaining 131 px
    // so the total height (786) matches the 393+393 stacks in col
    // 0/1. `tall: true` switches ImageCard into the tall variant
    // (lg:h-[655px]).
    { kind: "image", label: "Рукавички", image: "/figma-export/protect/cat-gloves.png", tall: true },
    { kind: "cta", label: "Переглянути каталог" },
  ],
];

function ImageCard({ label, image, tall }: { label: string; image: string; tall?: boolean }) {
  // `tall` mirrors Figma's bento layout - the third column's image
  // card is taller so the cluster reads as an asymmetric grid rather
  // than a uniform 3x2. Heights scale across breakpoints in the same
  // proportion the regular card uses: tall ≈ 1.67x regular (655/393
  // at lg -> 467 at sm -> 393 on mobile).
  const heightClass = tall
    ? "h-[393px] sm:h-[467px] lg:h-[655px]"
    : "h-[280px] sm:h-[340px] lg:h-[393px]";
  return (
    <div
      className={`group relative flex w-full flex-col items-center justify-end overflow-clip rounded-[28px] border border-stroke-default p-6 sm:rounded-[36px] sm:p-8 lg:rounded-[40px] lg:p-10 ${heightClass}`}
    >
      <img
        src={image}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full rounded-[28px] object-cover sm:rounded-[36px] lg:rounded-[40px]"
      />
      {/* Figma 1327:4022/4056/4061 — soft blurred dark ellipse anchored
          bottom-left, mirrors the hotels ZonesGrid + cleaning Solutions
          treatment so all image cards across the site share the same
          label-legibility halo. Figma uses `mix-blend-mode: multiply`
          so the dark blob multiplies into the photo behind instead of
          painting a flat black wash over it; we mirror that with the
          mixBlendMode style. */}
      <div
        aria-hidden
        className="pointer-events-none absolute opacity-60"
        style={{
          background: "rgba(0, 0, 0, 1)",
          filter: "blur(22.15px)",
          bottom: "-61.5px",
          left: "-57.5px",
          width: "507px",
          height: "138.311px",
          mixBlendMode: "multiply",
        }}
      />
      <p className="relative w-full max-w-[313px] text-title-lg text-white">
        {label}
      </p>
    </div>
  );
}

function OutlineCard({
  label,
  icon,
  gap = "tight",
}: {
  label: string;
  icon?: string;
  gap?: "tight" | "loose";
}) {
  // Figma 1327:4027 / 1327:4045 — outline card with the illustration
  // pinned to the top region of the card and the title pinned at
  // bottom-left. Figma uses card-specific gaps between illustration
  // and label so each PNG fills its native frame size exactly:
  //   - Bilizna  Frame 1010106796: 313 × 274 → gap-11
  //   - Bahily   Frame 1010106793: 313 × 217 → gap-40 (label is 2 lines)
  // The PNGs are sized to those exact dimensions (see file metadata),
  // so the illustration container is `absolute inset-0 size-full`
  // with `object-contain` — at lg+ the container aspect matches the
  // PNG aspect exactly and the icon fills the container 1:1 (no
  // scale-down via the old `max-w-[60%]` cap which was shrinking the
  // visible icon to ~60 % of the Figma design).
  const gapClass =
    gap === "loose"
      ? "gap-4 sm:gap-6 lg:gap-[40px]"
      : "gap-3 sm:gap-4 lg:gap-[11px]";
  return (
    <div
      className={`group flex h-[280px] w-full flex-col ${gapClass} overflow-clip rounded-[28px] border border-stroke-default bg-white p-6 sm:h-[340px] sm:rounded-[36px] sm:p-8 lg:h-[393px] lg:rounded-[40px] lg:p-10`}
    >
      {icon && (
        <div className="relative w-full flex-1">
          <img
            src={icon}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-contain"
          />
        </div>
      )}
      <p className="w-full text-title-lg text-neutral-900 transition-colors duration-300 group-hover:text-brand">
        {label}
      </p>
    </div>
  );
}

function CtaCard({ label }: { label: string }) {
  // Figma 1327:4065 — bg uses backgroud/deep (#343435, neutral-800),
  // label is Title/Large (24/28 SemiBold) not the smaller Button/Large
  // (18/22) used elsewhere.
  return (
    <Link
      href="/#contact-form"
      className="group flex h-[100px] w-full cursor-pointer items-center justify-center rounded-[28px] bg-neutral-800 sm:h-[120px] sm:rounded-[36px] lg:h-[131px] lg:rounded-[40px]"
    >
      <span className="inline-flex items-center gap-2">
        <span className="text-title-lg text-white">
          {label}
        </span>
        <span className="inline-flex size-[52px] items-center justify-center rounded-[26px] bg-brand">
          <img src={ARROW_WHITE} alt="" aria-hidden loading="lazy" decoding="async" className="size-[16.5px]" />
        </span>
      </span>
    </Link>
  );
}

function CategoryRenderer({ card }: { card: Category }) {
  switch (card.kind) {
    case "image":
      return <ImageCard label={card.label} image={card.image} tall={card.tall} />;
    case "outline":
      return <OutlineCard label={card.label} icon={card.icon} gap={card.gap} />;
    case "cta":
      return <CtaCard label={card.label} />;
  }
}

// Decorative cluster for the protect dark cap (Figma 1327:3993). Same
// pattern as home/TeamCta and hotels/Solutions DecorClusters: a single
// absolutely-positioned wrapper holds four L-shaped <div>s that build
// the cross and four <img> icons sitting in the cross quadrants. All
// offsets are FIXED design pixels relative to the Figma 1440 x 392
// master. `html { zoom: 100vw / 1440px }` (globals.css) keeps the cap
// at 1440 CSS px on every lg+ viewport, so pixel offsets render as
// designed on every laptop and desktop width.
//
// Cross center: (1114, 168) on the 1440 x 392 master, i.e. right=326,
// top=168. Inner-corner radius 48 px. Identical geometry to the home
// TeamCta DecorCluster.
//
// Protect-only addition: the LEFT cross arms (upper-left + lower-left)
// fade from transparent on the left to fully opaque around x=900
// (~64% of the arm), so the cross dissolves under the 3-line heading
// instead of running through the text. Implemented with a CSS
// `mask-image: linear-gradient(...)` on just the two left-arm divs.
//
// Icon coordinates (Plugin MCP design-context, cap is 1440 x 392):
//   Mask     1327:4003  x=890     y=66     175    x 72
//   Gloves   1327:4009  x=904.90  y=158.30 194.19 x 192.17  (inset-left
//                                                            62.84%)
//   Shirt    1327:4014  x=1140.68 y=191.45 120.37 x 101.86
//   Sparkles 1327:4015  x=1257.68 y=254.68 44.76  x 45.79   (inset-left
//                                                            87.34%)
// The earlier code used Figma frame-metadata x values for Gloves
// (971.31) and Sparkles (1302.44), which are not the rendered bbox
// left edges - they are the rotated-bbox right edges. The design-
// context CSS (and pixel-scan of the Figma render) put gloves at x=905
// and sparkles at x=1258. Mask + Shirt were already at the rendered
// positions.
const CROSS_RIGHT = 326;
const CROSS_TOP = 168;
const CROSS_BOTTOM_HEIGHT = 224;
const CROSS_LEFT_ARM_WIDTH = 598;
const CROSS_RIGHT_ARM_WIDTH = 326;
const CROSS_RADIUS = 48;
// Fade ends at x=900 in the 1440 master. The left arm spans x=516 to
// x=1114, so x=900 is (900-516)/598 = 64.2% of the arm's width.
const LEFT_ARM_FADE = "linear-gradient(to right, transparent 0%, #000 64%, #000 100%)";

function ProtectDecorCluster() {
  return (
    // Cluster shows at lg+ — the page applies `html { zoom: 100vw /
    // 1440px }` at the same breakpoint, so the fixed Figma-master pixel
    // offsets below scale uniformly to physical pixels at every laptop
    // and desktop width. Below lg the dark cap collapses to a narrow
    // mobile layout and the cluster is hidden (the cap reads cleanly
    // as just heading + button on small screens). Earlier `xl:block`
    // was too strict — at lg/standard laptops (1024-1279 px wide) the
    // cap was decoration-less, which made the page feel incomplete.
    //
    // Cross border opacity is `white/40` (was `/30`). On the dark
    // #2d2d2f cap the 30 % white read as a barely-visible gray that
    // the user reported as missing; 40 % matches the Figma master's
    // visible-but-subtle gray hairline.
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden overflow-hidden rounded-t-[40px] sm:rounded-t-[56px] lg:block lg:rounded-t-[68px]"
    >
      {/* Icons render FIRST so the cross arms can sit on top (later
          in DOM = higher in the stacking order). The icon PNGs were
          exported with a baked-in #2d2d2f rectangular background that
          matches the cap — that background hid the cross lines wherever
          an icon overlapped them (gloves bbox crosses the horizontal
          arm at top=168). Drawing the cross AFTER the icons makes the
          1-px hairline visible across the icon area, matching Figma's
          rendering where the cross reads as continuous through the
          gloves frame.

          Cross color is `border-white` (100% white, matching Figma
          1327:3993 — the design-context for the cap shows every cross
          piece as `border border-solid border-white` with no opacity
          modifier). Earlier `border-white/30` and `/40` were guesses
          to "match the gray-looking cross" in the static Figma render,
          but Figma actually draws the cross at full white — the lines
          read as light gray only because they're 1 px hairlines on a
          #2d2d2f background. Browsers anti-alias them the same way, so
          full opacity gives the correct visual at lg+. */}

      {/* Mask (Figma 1327:4003) - sits above the cross horizontal
          line, just left of the cross center. right = 1440-890-175 = 375. */}
      <img
        src="/figma-export/protect/decor-mask.png"
        alt=""
        className="absolute"
        style={{ right: "375px", top: "66px", width: "175px", height: "72px" }}
      />
      {/* Gloves (Figma 1327:4009) - lower-LEFT quadrant of the cross.
          right = 1440-904.90-194.19 = 340.91. */}
      <img
        src="/figma-export/protect/decor-gloves.png"
        alt=""
        className="absolute"
        style={{ right: "340.91px", top: "158.30px", width: "194.19px", height: "192.17px" }}
      />
      {/* Shirt (Figma 1327:4014) - lower-right quadrant. right =
          1440-1140.68-120.37 = 178.95. */}
      <img
        src="/figma-export/protect/decor-shirt.png"
        alt=""
        className="absolute"
        style={{ right: "178.95px", top: "191.45px", width: "120.37px", height: "101.86px" }}
      />
      {/* Sparkles (Figma 1327:4015) - tucked against the right edge of
          the shirt. right = 1440-1257.68-44.76 = 137.56. */}
      <img
        src="/figma-export/protect/decor-sparkles.png"
        alt=""
        className="absolute"
        style={{ right: "137.56px", top: "254.68px", width: "44.76px", height: "45.79px" }}
      />

      {/* Cross arms — drawn AFTER icons so the 1-px hairline stays
          visible across the entire cap, including over the gloves /
          shirt frames where it would otherwise be hidden by the
          icons' opaque export backgrounds. */}
      {/* Upper-left quadrant - bottom + right borders, rounded br
          inner corner. Masked with the fade so the bottom border
          dissolves into the dark cap under the heading. */}
      <div
        className="absolute border-b border-r border-white"
        style={{
          top: 0,
          right: `${CROSS_RIGHT}px`,
          width: `${CROSS_LEFT_ARM_WIDTH}px`,
          height: `${CROSS_TOP}px`,
          borderBottomRightRadius: `${CROSS_RADIUS}px`,
          maskImage: LEFT_ARM_FADE,
          WebkitMaskImage: LEFT_ARM_FADE,
        }}
      />
      {/* Upper-right quadrant - bottom + left borders, rounded bl
          inner corner. No fade (sits over empty dark band). */}
      <div
        className="absolute border-b border-l border-white"
        style={{
          top: 0,
          right: 0,
          width: `${CROSS_RIGHT_ARM_WIDTH}px`,
          height: `${CROSS_TOP}px`,
          borderBottomLeftRadius: `${CROSS_RADIUS}px`,
        }}
      />
      {/* Lower-left quadrant - top + right borders, rounded tr. Also
          faded on the left (same gradient stop as the UL arm). */}
      <div
        className="absolute border-t border-r border-white"
        style={{
          top: `${CROSS_TOP}px`,
          right: `${CROSS_RIGHT}px`,
          width: `${CROSS_LEFT_ARM_WIDTH}px`,
          height: `${CROSS_BOTTOM_HEIGHT}px`,
          borderTopRightRadius: `${CROSS_RADIUS}px`,
          maskImage: LEFT_ARM_FADE,
          WebkitMaskImage: LEFT_ARM_FADE,
        }}
      />
      {/* Lower-right quadrant - top + left borders, rounded tl. */}
      <div
        className="absolute border-t border-l border-white"
        style={{
          top: `${CROSS_TOP}px`,
          right: 0,
          width: `${CROSS_RIGHT_ARM_WIDTH}px`,
          height: `${CROSS_BOTTOM_HEIGHT}px`,
          borderTopLeftRadius: `${CROSS_RADIUS}px`,
        }}
      />
    </div>
  );
}

export function ProtectSolutions() {
  return (
    <section className="flex flex-col">
      {/* Dark cap shell - same overlap pattern as home/TeamCta etc.
          (negative bottom margin pulls the light grid card up so its
          rounded top eats into the bottom of the dark cap).

          Padding is page-specific: this heading wraps to 3 lines
          (144 px) so the standard lg:pt-[68px] / lg:pb-[128px] would
          balloon the cap to 440 px and push the decor cluster's
          gloves/shirt/sparkles BELOW the cap's visible band (the
          white card hides the bottom 72 px). Figma frame 1327:3993
          keeps the cap at 392 px regardless of heading length by
          centering content vertically with a -31 px offset, which is
          equivalent to lg:pt-[43px] / lg:pb-[105px] for this
          3-line heading (43 + 144 + 48 + 52 + 105 = 392). The decor
          cluster uses fixed-pixel offsets from the cap's top/right
          edge (matching Figma's master), so locking the cap height
          to 392 also keeps decorations in their designed positions. */}
      {/* Dark cap shell. At lg+ the page is rendered through
          `html { zoom: calc(100vw / 1440px) }` (see globals.css), so
          the cap's intrinsic CSS dimensions are always Figma master
          (1440 × 392 design px) regardless of physical laptop /
          desktop width. Inside `ProtectDecorCluster` we therefore use
          FIXED design-px coordinates that html-zoom scales uniformly
          to physical pixels — no container queries (cqw was confusing
          Chrome when combined with `zoom` at non-integer factors like
          1.201 on a 1729-wide laptop, producing visibly shifted icons
          because `cqw` measured the post-zoom container size while
          siblings measured pre-zoom). The cluster stays hidden below
          lg where the cap collapses onto the heading anyway. */}
      <div
        className="lg-pad-x relative -mb-12 overflow-hidden rounded-t-[40px] px-6 pb-20 pt-10 sm:-mb-14 sm:rounded-t-[56px] sm:px-10 sm:pb-24 sm:pt-14 lg:-mb-[72px] lg:rounded-t-[68px] lg:pb-[105px] lg:pt-[43px]"
        style={{ background: "#2d2d2f" }}
      >
        <div className="relative z-10 flex max-w-[571px] flex-col gap-8 sm:gap-12">
          {/* Figma 1327:3995 - heading reads "Основні рішення для /
              Засобів індивідуального / захисту" on 3 lines (text
              node is 571x144 = 3 lines at 48 line-height). The
              break point after "для" is the designer's, not the
              natural wrap point - Manrope's pixel widths happen to
              let "Засобів" squeeze onto line 1 in the browser
              (different kerning vs Figma's renderer), so we have to
              force the break with an explicit <br>. The split
              styles are: "Основні рішення для" light, "Засобів
              індивідуального захисту" bold. text-h2-light goes on
              the h2 itself so its strut line-height matches the
              48 px line-height of the inner spans (without this the
              h2 inherits body line-height 24 and the first baseline
              anchors to that smaller strut, lifting rendered caps
              ~6 px above the padding-top edge). The inner span
              overrides only weight (700) via text-h2. */}
          <h2 className="text-h2-light text-white">
            Основні рішення для
            <br aria-hidden />
            <span className="text-h2">Засобів індивідуального захисту</span>
          </h2>
          <Button href="/#contact-form" variant="outlined" arrow>
            Підібрати рішення
          </Button>
        </div>
        <ProtectDecorCluster />
      </div>

      <div className="relative rounded-[40px] bg-bg-subtle pb-12 pt-12 sm:rounded-[56px] sm:pb-16 sm:pt-16 lg:rounded-[68px] lg:pb-[144px] lg:pt-[144px]">
        <div className="lg-pad-x px-5 sm:px-10">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:items-start lg:gap-0">
            {COLUMNS.map((col, i) => (
              <div key={i} className="flex flex-col gap-3 sm:gap-4 lg:gap-0">
                {col.map((card, j) => (
                  <CategoryRenderer key={j} card={card} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
