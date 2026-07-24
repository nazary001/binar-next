/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { MobileCapCross } from "@/components/ui/MobileCapCross";
import { crossClips } from "@/components/ui/crossClips";

const ARROW_WHITE = "/figma-export/hero/arrow-up-right.svg";
const ARROW_DARK = "/figma-export/directions/arrow-up-right-dark.svg";

type Category =
  | { kind: "image"; label: string; image: string; short?: boolean; fill?: boolean }
  | { kind: "outline"; label: string; tall?: boolean }
  | { kind: "cta"; label: string };

// Figma reference: 3677:36105 / grid 3677:36114 (updated CLEANING master
// — supersedes the old two-row 2532:7590 bento). The grid is now a
// SINGLE 1180 x 393 row of three columns:
//   col 0: image (h=393, "Інвентар для прибирання")
//   col 1: 2 outlines (h=196.5 each, "Професійна хімія" / "Інші товари")
//   col 2: image (h=262, "Паперові вироби та диспенсери") + CTA (h=131)
// Every card carries the hotels/protect label + 52-px arrow-circle row
// (Button/Large 18px); cards are CLICKABLE links to the contact form
// with the shared hover treatment.
const COLUMNS: Category[][] = [
  [
    {
      kind: "image",
      label: "Інвентар для прибирання",
      image: "/figma-export/cleaning/card-equipment.png",
      // Figma squeezes the whole 395x556 portrait photo into the 393px
      // square card (stretch fill - verified against the node render);
      // object-cover would crop the mop handles off the top.
      fill: true,
    },
  ],
  [
    { kind: "outline", label: "Професійна хімія", tall: true },
    { kind: "outline", label: "Інші товари", tall: true },
  ],
  [
    {
      kind: "image",
      label: "Паперові вироби та диспенсери",
      image: "/figma-export/cleaning/card-paper.png",
      short: true,
    },
    { kind: "cta", label: "Переглянути каталог" },
  ],
];

// 6-px brand border that fades in on card hover — the same HoverRing
// the hotels ZonesGrid and protect Solutions cards use.
function HoverRing() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[28px] border-[6px] border-brand opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:rounded-[36px] lg:rounded-[40px]"
    />
  );
}

// Arrow circle from the updated Figma master (2532:7591 "Icon button"):
// a 40/48/52-px bordered circle that fills brand on card hover, with the
// arrow crossfading. `light` (over photos) keeps a white arrow; `dark`
// (white cards) swaps the dark arrow for the white one as the circle
// turns orange. Identical to the protect Solutions CardArrow.
function CardArrow({ tone }: { tone: "light" | "dark" }) {
  const border = tone === "light" ? "border-white" : "border-neutral-900";
  const restArrow = tone === "light" ? ARROW_WHITE : ARROW_DARK;
  return (
    <span
      aria-hidden
      className={`relative flex size-[40px] shrink-0 items-center justify-center rounded-[20px] border transition-[background-color,border-color] duration-300 group-hover:border-brand group-hover:bg-brand sm:size-[48px] sm:rounded-[24px] lg:size-[52px] lg:rounded-[26px] ${border}`}
    >
      <img
        src={restArrow}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute size-[13px] transition-opacity duration-300 group-hover:opacity-0 sm:size-[15px] lg:size-[16.5px]"
      />
      <img
        src={ARROW_WHITE}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute size-[13px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:size-[15px] lg:size-[16.5px]"
      />
    </span>
  );
}

function ImageCard({
  label,
  image,
  short,
  fill,
}: {
  label: string;
  image: string;
  short?: boolean;
  fill?: boolean;
}) {
  // Updated master 3677:36114: the grid is a single 393-px row, so the
  // image heights are 393 (col-1 square) and 262 (col-3, sitting above
  // the 131-px CTA). Mobile / tablet sizes scale down proportionally.
  const heightClass = short
    ? "h-[200px] sm:h-[240px] lg:h-[262px]"
    : "h-[280px] sm:h-[340px] lg:h-[393px]";
  // The card is a link with the shared label + arrow-circle row
  // (Button/Large 18px) and the hotels/protect hover treatment (brand
  // ring + photo desaturation + arrow fill). `fill` reproduces the
  // Figma stretch fill (whole photo squeezed into the box) - without
  // it the photo covers the box with a centred crop.
  return (
    <Link
      href="/#contact-form"
      className={`group relative flex w-full cursor-pointer flex-col items-center justify-end overflow-clip rounded-[28px] border border-stroke-default p-6 sm:rounded-[36px] sm:p-8 lg:rounded-[40px] lg:p-10 ${heightClass}`}
    >
      <img
        src={image}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className={`absolute inset-0 size-full ${fill ? "" : "object-cover"}`}
      />
      {/* On hover the photo desaturates — a dark #151511 square painted
          with mix-blend-mode: saturation drains the colour, matching
          the hotels / protect image-card hover. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-6px] bottom-[-6px] left-1/2 aspect-square -translate-x-1/2 bg-[#151511] opacity-0 transition-opacity duration-300 [mix-blend-mode:saturation] group-hover:opacity-100"
      />
      {/* Figma 1327:4536 — soft blurred rectangle behind the label:
          bg-[rgba(21,21,17,0.7)] blur-[22.15px] opacity-80 sitting at
          bottom: -61.5px, left: -57.5px, w=507, h=137. The blur halo
          radiates beyond the card edges and is clipped by overflow-clip
          on the parent so only the soft fall-off is visible. */}
      <div
        aria-hidden
        className="pointer-events-none absolute opacity-80"
        style={{
          background: "rgba(21, 21, 17, 0.7)",
          filter: "blur(22.15px)",
          bottom: "-61.5px",
          left: "-57.5px",
          width: "507px",
          height: "137px",
        }}
      />
      <HoverRing />
      <div className="relative flex w-full max-w-[313px] items-center gap-4 sm:gap-8">
        <p className="flex-1 text-button-lg text-white">{label}</p>
        <CardArrow tone="light" />
      </div>
    </Link>
  );
}

function OutlineCard({ label, tall }: { label: string; tall?: boolean }) {
  // Figma has two outline-card heights inside this grid:
  //   * 131 px = col-1 thin row (3 stacked outlines fill the bottom 393 px of the column)
  //   * 197 px = col-2 tall row (2 stacked outlines fill the top 393 px of the column)
  // Updated Figma master 2532:7595..7600: the label row (Button/Large
  // 18px + 52-px arrow circle) is pinned to the BOTTOM of the card
  // (`justify-end`, p-40), the card links to the contact form and gets
  // the shared hover treatment (brand ring + brand label + arrow fill).
  const heightClass = tall
    ? "h-[150px] sm:h-[180px] lg:h-[197px]"
    : "h-[100px] sm:h-[120px] lg:h-[131px]";
  return (
    <Link
      href="/#contact-form"
      className={`group relative flex w-full cursor-pointer flex-col justify-end overflow-clip rounded-[28px] border border-stroke-default bg-white p-6 sm:rounded-[36px] sm:p-8 lg:rounded-[40px] lg:p-10 ${heightClass}`}
    >
      <HoverRing />
      <div className="relative flex w-full items-center gap-4 sm:gap-8">
        <p className="flex-1 text-button-lg text-neutral-900 transition-colors group-hover:text-brand">
          {label}
        </p>
        <CardArrow tone="dark" />
      </div>
    </Link>
  );
}

function CtaCard({ label }: { label: string }) {
  // Updated Figma master uses the shared "Button catalog" component
  // (1217:2497) — bg `--backgroud/deep` (#343435 = neutral-800), label
  // is Button/Large (18/22 SemiBold) pinned LEFT with the orange circle
  // pinned RIGHT (justify-between, px-40) instead of the old centred
  // pill+circle group. Hover: the deep pill inverts to white with a
  // stroke border and the label flips to neutral-900; the filled-brand
  // arrow circle stays. Border starts transparent so the hover border
  // does not shift layout. Arrow circle scales 40/48/52.
  return (
    <Link
      href="/#contact-form"
      className="group flex h-[100px] w-full cursor-pointer items-center justify-between rounded-[28px] border border-transparent bg-neutral-800 px-6 transition-colors duration-300 hover:border-stroke-default hover:bg-white sm:h-[120px] sm:rounded-[36px] sm:px-8 lg:h-[131px] lg:rounded-[40px] lg:px-10"
    >
      <span className="text-button-lg text-white transition-colors duration-300 group-hover:text-neutral-900">
        {label}
      </span>
      <span className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-[20px] bg-brand sm:size-[48px] sm:rounded-[24px] lg:size-[52px] lg:rounded-[26px]">
        <img src={ARROW_WHITE} alt="" aria-hidden loading="lazy" decoding="async" className="size-[13px] sm:size-[15px] lg:size-[16.5px]" />
      </span>
    </Link>
  );
}

function CategoryRenderer({ card }: { card: Category }) {
  switch (card.kind) {
    case "image":
      return <ImageCard label={card.label} image={card.image} short={card.short} fill={card.fill} />;
    case "outline":
      return <OutlineCard label={card.label} tall={card.tall} />;
    case "cta":
      return <CtaCard label={card.label} />;
  }
}

// Figma 1327:4510 — the dark cap on /cleaning. Same cross + asymmetric
// fade as /protect (long left arm fades from transparent at the
// headline side to opaque toward the cross center; the other 3 arms
// are uniform solid white). Decorations on the right side are a
// cluster of 4 product-themed icons:
//   * Union  (orange `+` badge)            x=996.3,  y=57.7,  69x83
//   * Spark  (small 3-point ornament)      x=1158.5, y=191.3, 58x59
//   * Spray  (orange spray bottle)         x=1249.1, y=212.7, 61x119
//   * Rolls  (paper rolls, rotated -90)    x=916.1,  y=227.6, 135x95
// X is anchored as `Figma master x / 1440` so the cluster keeps the
// same composition at every viewport. Y/sizes are fixed pixels
// because the cap height is locked to 392.
function CleaningDecorCluster() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden overflow-hidden rounded-t-[40px] sm:rounded-t-[56px] lg:block lg:rounded-t-[68px]"
    >
      {/* Cross — solid white with a linear-gradient fade on the LEFT
          half of the horizontal arm only (same treatment as /protect
          since this is the same cap composition reused). Hairlines are
          de-duplicated (see crossClips): UL owns the top V-line + left
          H-line (edges pushed 1px past the shared axes), UR the right
          H-line, LL the bottom V-line; UR/LL/LR keep only their arcs. */}
      <div
        className="absolute rounded-br-[48px] border-b border-r border-white"
        style={{
          left: "35.93%",
          right: "calc(22.59% - 1px)",
          top: 0,
          bottom: "calc(57.14% - 1px)",
          maskImage: "linear-gradient(to right, transparent 0%, black 64%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 64%)",
        }}
      />
      <div
        className="absolute rounded-bl-[48px] border-b border-l border-white"
        style={{
          left: "77.41%",
          right: 0,
          top: 0,
          bottom: "calc(57.14% - 1px)",
          clipPath: crossClips(48).ur,
        }}
      />
      <div
        className="absolute rounded-tr-[48px] border-t border-r border-white"
        style={{
          left: "35.93%",
          right: "calc(22.59% - 1px)",
          top: "42.86%",
          bottom: 0,
          maskImage: "linear-gradient(to right, transparent 0%, black 64%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 64%)",
          clipPath: crossClips(48).ll,
        }}
      />
      <div
        className="absolute rounded-tl-[48px] border-t border-l border-white"
        style={{
          left: "77.41%",
          right: 0,
          top: "42.86%",
          bottom: 0,
          clipPath: crossClips(48).lr,
        }}
      />

      {/* Decorations. Figma master positions / 1440 (cap width):
            union  996.3 / 1440 = 69.19%
            spark 1158.5 / 1440 = 80.45%
            spray 1249.1 / 1440 = 86.74%
            rolls (post-rotation bbox left) 916.1 / 1440 = 63.62%      */}
      <img
        src="/figma-export/cleaning/decor-badge.svg"
        alt=""
        className="absolute block"
        style={{ left: "69.19%", top: "58px", width: "69px", height: "83px" }}
      />
      <img
        src="/figma-export/cleaning/decor-spark.svg"
        alt=""
        className="absolute block"
        style={{ left: "80.45%", top: "191px", width: "58px", height: "59px" }}
      />
      <img
        src="/figma-export/cleaning/decor-spray.svg"
        alt=""
        className="absolute block"
        style={{ left: "86.74%", top: "213px", width: "61px", height: "119px" }}
      />
      {/* Rolls live in a 135x95 box (after the -90 rotation) - Figma
          wraps the underlying 95x135 vector in a flex container that
          centers it so the visible bbox lands exactly at 916.1, 227.6.
          Replicated here with the same outer/inner sizing so the
          rotated centre matches Figma's centre to the pixel. */}
      <div
        className="absolute flex items-center justify-center"
        style={{ left: "63.62%", top: "228px", width: "135px", height: "95px" }}
      >
        <img
          src="/figma-export/cleaning/decor-rolls.svg"
          alt=""
          className="block -rotate-90"
          style={{ width: "95px", height: "135px" }}
        />
      </div>
    </div>
  );
}

// === Mobile-only solutions stack (Figma 3165:6802 / 3165:6803) ===
// Below lg the desktop bento grid collapses to a single column of
// uniform 190-px cards (16-px gaps -> 206-px pitch, matching the Figma
// frames) capped by the dark catalog CTA. Image cards carry a photo +
// dark blur halo + white label/arrow; the outline cards are plain white
// with a dark label/arrow (no illustration on the phone master); the
// CTA is a #343435 pill with the brand-orange arrow.
type MobileSolution =
  | { kind: "image"; label: string; image: string; objectPosition?: string }
  | { kind: "outline"; label: string }
  | { kind: "cta"; label: string };

// Card set mirrors the updated desktop master 3677:36114 in the desktop
// column order.
const MOBILE_SOLUTIONS: MobileSolution[] = [
  {
    kind: "image",
    label: "Інвентар для прибирання",
    image: "/figma-export/cleaning/card-equipment.png",
    // The 206-px tile crops the portrait mop-bucket photo with
    // object-bottom (a stretch would flatten it badly at 342x206).
    objectPosition: "50% 100%",
  },
  { kind: "outline", label: "Професійна хімія" },
  { kind: "outline", label: "Інші товари" },
  { kind: "image", label: "Паперові вироби та диспенсери", image: "/figma-export/cleaning/card-paper.png" },
  { kind: "cta", label: "Переглянути каталог" },
];

// 52-px arrow circle for the mobile cards. tone="light" over photos,
// tone="dark" on the white outline cards. Static (touch — no hover).
function MobileSolutionArrow({ tone }: { tone: "light" | "dark" }) {
  return (
    <span
      className={`flex size-[52px] shrink-0 items-center justify-center rounded-[26px] border ${
        tone === "light" ? "border-white" : "border-neutral-900"
      }`}
    >
      <img
        src={tone === "light" ? ARROW_WHITE : ARROW_DARK}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="size-[16.5px]"
      />
    </span>
  );
}

function MobileSolutionCard({ card, first }: { card: MobileSolution; first?: boolean }) {
  if (card.kind === "cta") {
    // Figma 3165:6813 — #343435 pill, label left, brand-orange 52-px
    // arrow right, vertically centred in the 131-px card.
    return (
      <Link
        href="/#contact-form"
        className="flex h-[131px] w-full items-center justify-between rounded-[40px] bg-neutral-800 px-[40px] py-[15px]"
      >
        {/* max-w forces the master's 2-line "Переглянути / каталог" */}
        <p className="max-w-[140px] text-[16px] font-semibold leading-[22px] tracking-[0.16px] text-white">
          {card.label}
        </p>
        <span className="inline-flex size-[52px] shrink-0 items-center justify-center rounded-[26px] bg-brand">
          <img
            src={ARROW_WHITE}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="size-[16.5px]"
          />
        </span>
      </Link>
    );
  }
  const isImage = card.kind === "image";
  // rounded-40 card, border, p-40, label+arrow row pinned to the bottom.
  return (
    <Link
      href="/#contact-form"
      className={`relative flex h-[206px] w-full flex-col justify-end overflow-clip rounded-[40px] border border-stroke-default p-[40px] ${
        first ? "" : "-mt-px"
      } ${isImage ? "" : "bg-white"}`}
    >
      {isImage && (
        <>
          <img
            src={card.image}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
            style={card.objectPosition ? { objectPosition: card.objectPosition } : undefined}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute opacity-80"
            style={{
              background: "rgba(21, 21, 17, 0.7)",
              filter: "blur(22.15px)",
              bottom: "-61.5px",
              left: "-57.5px",
              width: "507px",
              height: "137px",
            }}
          />
        </>
      )}
      <div className="relative flex w-full items-center gap-8">
        <p
          className={`flex-1 text-[16px] font-semibold leading-[22px] tracking-[0.16px] ${
            isImage ? "text-white" : "text-neutral-900"
          }`}
        >
          {card.label}
        </p>
        <MobileSolutionArrow tone={isImage ? "light" : "dark"} />
      </div>
    </Link>
  );
}

// The mobile cap cross is the shared <MobileCapCross /> — the master's
// Group 84 (3165:8056) is the same full-cross composition used by the
// hotels and home caps (vertical at right-33, horizontal at 44%, 30px
// concave corner arcs, left arm dissolving toward the heading).

export function CleaningSolutions() {
  return (
    <section className="flex flex-col">
      {/* Figma 1327:4510 — dark cap, 392 px tall on lg with the same
          asymmetric padding as /protect / hotels Solutions (pt-68 +
          pb-128 keeps the cap at 392 px and the -mb-72 pulls the
          light grid card up so its rounded top eats into the bottom
          of the dark cap). */}
      <div
        className="lg-pad-x relative -mb-[72px] overflow-hidden rounded-t-[32px] bg-[#343435] px-6 pb-[120px] pt-[60px] sm:-mb-14 sm:rounded-t-[56px] sm:px-10 sm:pb-24 sm:pt-14 lg:-mb-[72px] lg:min-h-[392px] lg:rounded-t-[68px] lg:bg-[#2d2d2f] lg:pb-[96px] lg:pt-[68px]"
      >
        <div className="relative z-10 flex max-w-[571px] flex-col gap-6 sm:gap-12">
          {/* Figma 1327:4512 — "Основні рішення для прибирання" wraps
              naturally inside the 571-px-wide heading frame, breaking
              after "для": line 1 = "Основні рішення для" (light +
              start of bold), line 2 = "прибирання". The two weights
              come from the inline spans, no manual <br>. Matching
              that layout means the line break MUST be natural here —
              an explicit <br aria-hidden /> after "Основні рішення"
              forces a wrong break ("…рішення / для прибирання") so
              we don't insert one. text-h2-light on the h2 itself
              gives the line-strut the 48-px line height it needs to
              avoid baseline lift between weights. */}
          <h2 className="text-h2-light text-white">
            Основні рішення
            <span className="text-h2"> для прибирання</span>
          </h2>
          <Button href="/#contact-form" variant="outlined" size="responsive" arrow>
            Підібрати рішення
          </Button>
        </div>
        {/* Desktop cross cluster (lg+) and the mobile cross (lg:hidden).
            The mobile master's Group 84 (3165:8056) renders the SAME
            full cross as the hotels/home caps — vertical at right-33,
            horizontal at 44% of the 318px cap, 30px concave corner arcs,
            left arm dissolving — so the shared MobileCapCross is the
            exact match (the old 4-rect "spark" reconstruction drew a
            stray bottom line and no right arms). */}
        <CleaningDecorCluster />
        <MobileCapCross className="lg:hidden" />
      </div>

      {/* max-lg:pb-[63px]: the 5-card stack collapses 3 seams by 1px each
          (-mt-px between the 4 bordered tiles; the CTA does not overlap),
          the extra 3px on the bottom padding compensates the collapsed
          seams. At lg the updated master 3677:36105 centres the single
          393-px grid row in a 681-px light card: 144 + 393 + 144. */}
      <div className="relative rounded-t-[32px] bg-bg-subtle pb-[60px] pt-[60px] max-lg:pb-[63px] sm:rounded-t-[56px] lg:rounded-[68px] lg:pb-[144px] lg:pt-[144px]">
        {/* MOBILE (<lg) — a single column of uniform 206-px cards that
            TOUCH (0 gap, borders de-doubled via -mt-px) followed by the
            131-px catalog CTA, mirroring the updated desktop card set. */}
        <div className="flex flex-col gap-0 px-6 lg:hidden">
          {MOBILE_SOLUTIONS.map((card, i) => (
            <MobileSolutionCard key={card.label} card={card} first={i === 0} />
          ))}
        </div>

        {/* DESKTOP (lg+) — the Figma 1440 bento grid, hidden below lg
            where the mobile stack above takes over.
            lg grid is edge-to-edge (gap-0). To stop adjacent 1px card
            borders from doubling to 2px where cards touch, columns 2+
            overlap the previous column's right border via `lg:-ml-px`,
            and each non-first card overlaps the card above via
            `lg:-mt-px`. Same de-doubling trick as the hotels ZonesGrid. */}
        <div className="hidden lg-pad-x px-6 sm:px-10 lg:block">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:items-start lg:gap-0">
            {COLUMNS.map((col, i) => (
              <div
                key={i}
                className={`flex flex-col gap-3 sm:gap-4 lg:gap-0${i > 0 ? " lg:-ml-px" : ""}`}
              >
                {col.map((card, j) => (
                  <div key={j} className={`contents lg:block${j > 0 ? " lg:-mt-px" : ""}`}>
                    <CategoryRenderer card={card} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
