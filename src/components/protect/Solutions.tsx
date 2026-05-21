/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Button } from "@/components/ui/Button";

const ARROW_WHITE = "/figma-export/hero/arrow-up-right.svg";

type Category =
  | { kind: "image"; label: string; image: string; tall?: boolean }
  | { kind: "outline"; label: string; icon?: string }
  | { kind: "cta"; label: string };

const COLUMNS: Category[][] = [
  [
    { kind: "image", label: "Маски та респіратори", image: "/figma-export/protect/cat-masks.png" },
    {
      kind: "outline",
      label: "Одноразова білизна",
      // 313x274 PNG - Figma Frame 1010106796, sized to exactly the
      // card's content-area width at lg so w-full renders at 1:1.
      icon: "/figma-export/protect/icon-bilizna.png",
    },
  ],
  [
    {
      kind: "outline",
      label: "Бахіли, шапочки, нарукавники",
      // 313x217 PNG - Figma Frame 1010106793.
      icon: "/figma-export/protect/icon-bahily.png",
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
      className={`group relative flex w-full flex-col items-center justify-end overflow-clip rounded-[28px] border border-stroke-default p-6 transition-transform duration-500 ease-out hover:-translate-y-1 sm:rounded-[36px] sm:p-8 lg:rounded-[40px] lg:p-10 ${heightClass}`}
    >
      <img
        src={image}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full rounded-[28px] object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06] sm:rounded-[36px] lg:rounded-[40px]"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[160px] sm:h-[200px]"
        style={{
          background:
            "linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0) 100%)",
        }}
      />
      <p className="relative w-full max-w-[313px] text-title-lg text-white transition-transform duration-500 group-hover:-translate-y-1">
        {label}
      </p>
    </div>
  );
}

function OutlineCard({
  label,
  icon,
}: {
  label: string;
  icon?: string;
}) {
  return (
    // Figma 1327:4027 / 1327:4045 - outline card with a soft
    // neutral-100 illustration occupying the upper area (Frame
    // 1010106796 = 313x274 for Bilizna, Frame 1010106793 = 313x217
    // for Bahily - both exactly the width of the card's 313-px
    // content area at lg) and the title at the bottom-left.
    //
    // Layout uses `justify-between` so the icon pins to the top of
    // the content area and the title pins to the bottom, matching
    // Figma exactly:
    //   * icon top = card top + p-10 (40 px) padding
    //   * title bottom = card bottom + p-10 padding
    //   * the remaining vertical space sits between them
    //
    // The illustration is decorative (aria-hidden) and grows
    // slightly on hover for a subtle interaction without altering
    // the icon-less variant.
    <div className="group flex h-[280px] w-full flex-col justify-between overflow-clip rounded-[28px] border border-stroke-default bg-white p-6 transition-all duration-500 hover:-translate-y-1 hover:border-neutral-900 hover:shadow-md sm:h-[340px] sm:rounded-[36px] sm:p-8 lg:h-[393px] lg:rounded-[40px] lg:p-10">
      {icon && (
        <img
          src={icon}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="block h-auto w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      )}
      <p className="w-full text-title-lg text-neutral-900 transition-colors duration-300 group-hover:text-brand">
        {label}
      </p>
    </div>
  );
}

function CtaCard({ label }: { label: string }) {
  return (
    <Link
      href="/#contact-form"
      className="group flex h-[100px] w-full cursor-pointer items-center justify-center rounded-[28px] bg-neutral-800 transition-colors hover:bg-neutral-900 sm:h-[120px] sm:rounded-[36px] lg:h-[131px] lg:rounded-[40px]"
    >
      <span className="inline-flex items-center gap-2">
        <span className="text-button-lg text-white transition-transform duration-300 group-hover:-translate-x-1">
          {label}
        </span>
        <span className="inline-flex size-[52px] items-center justify-center rounded-[26px] bg-brand transition-transform duration-300 group-hover:rotate-12 group-hover:scale-105">
          <img src={ARROW_WHITE} alt="" aria-hidden loading="lazy" decoding="async" className="size-6" />
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
      return <OutlineCard label={card.label} icon={card.icon} />;
    case "cta":
      return <CtaCard label={card.label} />;
  }
}

// Figma Frame 1010106680 - the dark cap's decorative cluster:
//
//   * Cross-pattern of 4 rounded-corner rectangles drawn with thin
//     white-30% strokes, dividing the right portion of the cap into
//     a 2x2 grid. Each rectangle reuses Figma Group 38 (Rectangle
//     104/105/106).
//   * Orange medical mask icon in the top-right of the upper row
//     (Figma OBJECTS frame 1327:4003, 175x72).
//   * Gray gloves illustration straddling the cross's centre
//     (Figma Group 43, 1327:4009, 194x192).
//   * Gray T-shirt to the right of the gloves (Figma Vector "Union"
//     1327:4014, 120x102).
//   * Orange sparkles next to the shirt (Figma Group 69, 1327:4015,
//     44x46).
//
// Each decoration is anchored to the cap's RIGHT edge via `right`
// in pixels matching Figma (cap_right - figma.x - figma.width). That
// way the cluster always hugs the right side regardless of how wide
// the viewport gets - the cap is full-bleed at lg+, so the
// composition stays correct on ultra-wide screens too. The whole
// cluster is `pointer-events-none` and `xl:block` so it only paints
// at the design viewport (>=1280 px), matching the Figma master.
function ProtectDecorCluster() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden overflow-hidden rounded-t-[40px] sm:rounded-t-[56px] lg:rounded-t-[68px] xl:block"
    >
      {/* Cross + decor positioned with PERCENT coords across the full
          cap (no 922-wide inner wrapper). This matches Figma's
          intent: the cluster scales proportionally with cap width
          (cap is full-bleed at lg+, so the proportion is constant).

          Earlier this used a fixed 922 px wrapper anchored to the
          cap right (or worse: to a virtual 1440 content column with
          dead space on the right). At wide viewports both broke the
          visual:
          * Cluster glued to cap right -> cross center landed at ~83%
            of viewport (was 77.4% in Figma 1440 master); cluster
            looked compressed in the right corner.
          * Cluster anchored to content column -> empty dark band on
            the right of the cluster, since the cap continues past
            the cluster to the viewport edge.

          Percent-based positioning fixes both: the cross horizontal
          arm stretches to match cap width, decor sits at the same
          Figma-master percentage of cap width, and the inner cross
          corners always meet at 77.41% / 42.86% no matter how wide
          the viewport gets.

          Cap height is locked to 392 px (pt-43/pb-105) so y-values
          are kept as fixed pixels - they're already correct against
          Figma's 392-tall master. */}
      {/* Figma applies a linear fade ONLY to the left horizontal
          arm (the long arm that extends into the headline area) -
          starts ~1% white at the outer end (x~525) and ramps up to
          full white by ~64% of the arm's length (x~900), then stays
          solid through the rounded corner into the cross center. The
          other 3 arms (right horizontal, vertical top, vertical
          bottom) are uniform full white. We use a mask-image linear
          gradient on the two LEFT-cell rectangles only - it leaves
          their right border (the vertical arm half) fully opaque
          since that border lives at the gradient's solid (right)
          end. */}
      <div
        className="absolute rounded-br-[48px] border-b border-r border-white"
        style={{
          left: "35.93%",
          right: "22.59%",
          top: 0,
          bottom: "57.14%",
          maskImage: "linear-gradient(to right, transparent 0%, black 64%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 64%)",
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
          maskImage: "linear-gradient(to right, transparent 0%, black 64%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 64%)",
        }}
      />
      <div
        className="absolute rounded-tl-[48px] border-t border-l border-white"
        style={{ left: "77.41%", right: 0, top: "42.86%", bottom: 0 }}
      />
      {/* Decorations: horizontal POSITION as Figma master percent of
          cap width so each icon stays in the same quadrant of the
          (stretching) cross at every viewport. Figma master x
          positions / 1440 (from Figma metadata, node 1327:3993):
            mask     890.00 / 1440 = 61.806%
            shirt   1140.68 / 1440 = 79.214%
            sparkles 1302.44 / 1440 = 90.447%

          GLOVES note: the Figma group bbox for `1327:4009` is
          194x192, but Figma's actual vector renders the gloves at
          a wider-than-tall visible extent (~160x158 in the cap). The
          PNG export currently in `decor-gloves.png` fills the entire
          194x192 bbox with the gloves shape stretched to be near-
          square - so rendering it at width=194 makes the gloves
          oversized and bleed past the vertical cross arm at 77.41%
          (= 1115px) into the bottom-right cell, on top of the t-
          shirt. Until the asset is re-exported, we render it at the
          Figma vector's visible size (160 wide) and pin its left
          edge to where the Figma children leftmost vector sits
          (x=940 = 65.28%) so it stays inside the bottom-left cell. */}
      <img
        src="/figma-export/protect/decor-mask.png"
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute block"
        style={{ left: "61.806%", top: "66px", width: "175px", height: "72px" }}
      />
      <img
        src="/figma-export/protect/decor-gloves.png"
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute block"
        style={{ left: "65.28%", top: "185px", width: "160px", height: "158px" }}
      />
      <img
        src="/figma-export/protect/decor-shirt.png"
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute block"
        style={{ left: "79.214%", top: "191px", width: "120px", height: "102px" }}
      />
      <img
        src="/figma-export/protect/decor-sparkles.png"
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute block"
        style={{ left: "90.447%", top: "255px", width: "44px", height: "46px" }}
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

      <div className="relative rounded-[40px] bg-bg-subtle pb-12 pt-12 sm:rounded-[56px] sm:pb-16 sm:pt-16 lg:rounded-[68px] lg:pb-[80px] lg:pt-[120px]">
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
