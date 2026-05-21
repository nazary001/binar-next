/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Button } from "@/components/ui/Button";

const ARROW_WHITE = "/figma-export/hero/arrow-up-right.svg";

type Category =
  | { kind: "image"; label: string; image: string; tall?: boolean }
  | { kind: "outline"; label: string; tall?: boolean }
  | { kind: "cta"; label: string };

// Figma reference: 1327:4509 (CLEANING / "Основні рішення для прибирання").
// The grid is 1180 px wide x 786 tall at lg, three columns of 393 px:
//   col 0: image (h=393) + 3 outlines (h=131 each) = 786
//   col 1: 2 outlines (h=196.5 each) + image (h=393) = 786
//   col 2: image (h=655 tall) + CTA (h=131) = 786
// `tall: true` on an outline switches it to the col-1 height variant.
const COLUMNS: Category[][] = [
  [
    {
      kind: "image",
      label: "Хімія для прибирання",
      image: "/figma-export/cleaning/card-chemistry.png",
    },
    { kind: "outline", label: "Хімія для кухні та харчових зон (HoReCa)" },
    { kind: "outline", label: "Супутні витратні матеріали" },
    { kind: "outline", label: "Диспенсери та дозатори" },
  ],
  [
    { kind: "outline", label: "Дезінфекція та санітарія", tall: true },
    { kind: "outline", label: "Мийні засоби та пральні рішення", tall: true },
    {
      kind: "image",
      label: "Паперова гігієна",
      image: "/figma-export/cleaning/card-paper.png",
    },
  ],
  [
    {
      kind: "image",
      label: "Інвентар для прибирання",
      image: "/figma-export/cleaning/card-equipment.png",
      tall: true,
    },
    { kind: "cta", label: "Переглянути каталог" },
  ],
];

function ImageCard({ label, image, tall }: { label: string; image: string; tall?: boolean }) {
  // `tall` = the col-3 hero image at 655 px high. Regular image cards
  // are 393 px (= one row of the 786 px column grid). Mobile / tablet
  // sizes scale down proportionally.
  const heightClass = tall
    ? "h-[400px] sm:h-[500px] lg:h-[655px]"
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

function OutlineCard({ label, tall }: { label: string; tall?: boolean }) {
  // Figma has two outline-card heights inside this grid:
  //   * 131 px = col-1 thin row (3 stacked outlines fill the bottom 393 px of the column)
  //   * 197 px = col-2 tall row (2 stacked outlines fill the top 393 px of the column)
  const heightClass = tall
    ? "h-[150px] sm:h-[180px] lg:h-[197px]"
    : "h-[100px] sm:h-[120px] lg:h-[131px]";
  return (
    <div
      className={`group flex w-full flex-col justify-end overflow-clip rounded-[28px] border border-stroke-default bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-neutral-900 hover:shadow-md sm:rounded-[36px] sm:p-8 lg:rounded-[40px] lg:p-10 ${heightClass}`}
    >
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
      className="pointer-events-none absolute inset-0 hidden overflow-hidden rounded-t-[40px] sm:rounded-t-[56px] lg:rounded-t-[68px] xl:block"
    >
      {/* Cross — solid white with a linear-gradient fade on the LEFT
          half of the horizontal arm only (same treatment as /protect
          since this is the same cap composition reused). */}
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

export function CleaningSolutions() {
  return (
    <section className="flex flex-col">
      {/* Figma 1327:4510 — dark cap, 392 px tall on lg with the same
          asymmetric padding as /protect / hotels Solutions (pt-68 +
          pb-128 keeps the cap at 392 px and the -mb-72 pulls the
          light grid card up so its rounded top eats into the bottom
          of the dark cap). */}
      <div
        className="lg-pad-x relative -mb-12 overflow-hidden rounded-t-[40px] px-6 pb-20 pt-10 sm:-mb-14 sm:rounded-t-[56px] sm:px-10 sm:pb-24 sm:pt-14 lg:-mb-[72px] lg:rounded-t-[68px] lg:pb-[128px] lg:pt-[68px]"
        style={{ background: "#2d2d2f" }}
      >
        <div className="relative z-10 flex max-w-[571px] flex-col gap-8 sm:gap-12">
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
          <Button href="/#contact-form" variant="outlined" arrow>
            Підібрати рішення
          </Button>
        </div>
        <CleaningDecorCluster />
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
