/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";

// Figma Frame 1010106678 lays the 9 partner brands as a 6-column × 3-row
// mosaic of 240×240 cells. The "puzzle" look comes from each cell having
// just SOME corners rounded — the flat edges are where one cell touches
// its neighbour, so the round corners point only to empty space.
//
// Filled cells (col, row) and which corners are rounded:
//
//   .  .  .  X1 X2 .
//   X3 .  X4 X5 .  X6
//   X7 X8 .  .  X9 .
//
//   X1 (4,1) — all 4 corners (free-floating).
//   X2 (5,1) — tl, tr, bl     (br is flat: aims at empty 6,1).
//   X3 (1,2) — tr, br         (left edge flat: aims at section edge).
//   X4 (3,2) — tl, tr, br     (bl flat: aims at empty 2,2).
//   X5 (4,2) — tl, tr, bl     (br flat: aims at empty 5,2).
//   X6 (6,2) — none           (square: edges touch section edge / empties).
//   X7 (1,3) — tr, br         (mirrors X3).
//   X8 (2,3) — tl, bl, br     (tr flat: aims at empty 3,3).
//   X9 (5,3) — bl, br         (top flat: aims at empty 5,2).
//
// Logo dimensions are taken verbatim from each cell's logo asset in Figma
// so the inner SVGs sit at the exact size the designer drew them.
type Partner = {
  src: string;
  imgClass: string;
  /** lg-only grid placement (col-start-N row-start-N) */
  pos: string;
  /** lg-only rounded corners; below lg every cell uses a uniform 24px */
  lgRounded: string;
};

const DEFAULT_PARTNERS: Partner[] = [
  {
    src: "/figma-export/hotels/partners/p2.svg",
    imgClass: "lg:h-[83px] lg:w-[124px]",
    pos: "lg:col-start-4 lg:row-start-1",
    lgRounded: "lg:rounded-[48px]",
  },
  {
    src: "/figma-export/hotels/partners/p4.svg",
    imgClass: "lg:h-[46px] lg:w-[188px]",
    pos: "lg:col-start-5 lg:row-start-1",
    lgRounded: "lg:rounded-tl-[48px] lg:rounded-tr-[48px] lg:rounded-bl-[48px]",
  },
  {
    src: "/figma-export/hotels/partners/p6.svg",
    imgClass: "lg:h-[79px] lg:w-[202px]",
    pos: "lg:col-start-1 lg:row-start-2",
    lgRounded: "lg:rounded-tr-[48px] lg:rounded-br-[48px]",
  },
  {
    src: "/figma-export/hotels/partners/p9.svg",
    imgClass: "lg:h-[65px] lg:w-[202px]",
    pos: "lg:col-start-3 lg:row-start-2",
    lgRounded: "lg:rounded-tl-[48px] lg:rounded-tr-[48px] lg:rounded-br-[48px]",
  },
  {
    src: "/figma-export/hotels/partners/p8.svg",
    imgClass: "lg:h-[44px] lg:w-[176px]",
    pos: "lg:col-start-4 lg:row-start-2",
    lgRounded: "lg:rounded-tl-[48px] lg:rounded-tr-[48px] lg:rounded-bl-[48px]",
  },
  {
    src: "/figma-export/hotels/partners/p5.svg",
    imgClass: "lg:h-[82px] lg:w-[124px]",
    pos: "lg:col-start-6 lg:row-start-2",
    lgRounded: "",
  },
  {
    src: "/figma-export/hotels/partners/p1.svg",
    imgClass: "lg:h-[57px] lg:w-[166px]",
    pos: "lg:col-start-1 lg:row-start-3",
    lgRounded: "lg:rounded-tr-[48px] lg:rounded-br-[48px]",
  },
  {
    src: "/figma-export/hotels/partners/p7.svg",
    imgClass: "lg:h-[71px] lg:w-[202px]",
    pos: "lg:col-start-2 lg:row-start-3",
    lgRounded: "lg:rounded-tl-[48px] lg:rounded-bl-[48px] lg:rounded-br-[48px]",
  },
  {
    src: "/figma-export/hotels/partners/p3.svg",
    imgClass: "lg:h-[62px] lg:w-[202px]",
    pos: "lg:col-start-5 lg:row-start-3",
    lgRounded: "lg:rounded-bl-[48px] lg:rounded-br-[48px]",
  },
];

type PartnerBrandsProps = {
  heading?: ReactNode;
  body?: ReactNode;
  partners?: Partner[];
};

export function PartnerBrands({ heading, body, partners = DEFAULT_PARTNERS }: PartnerBrandsProps = {}) {
  return (
    <section className="bg-white py-16 sm:py-20 lg:py-[160px]">
      {/* Heading row uses the same adaptive padding as other lg sections
          so the text aligns with the design's x=130 column. */}
      <div className="lg-pad-x px-5 sm:px-10">
        <div className="flex flex-col gap-6 sm:gap-8 lg:flex-row lg:items-start lg:gap-8">
          <h2 className="flex-1 text-neutral-900">
            {heading ?? (
              <>
                <span className="text-h2-light">Партнери-виробники </span>
                <br aria-hidden className="hidden lg:inline" />
                <span className="text-h2-light">та бренди, </span>
                <br aria-hidden className="hidden lg:inline" />
                <span className="text-h2">з якими ми працюємо</span>
              </>
            )}
          </h2>
          <div className="flex-1 max-w-[574px] text-body-md text-neutral-500">
            {body ?? (
              <p>
                Ми постачаємо продукцію перевірених виробників. Це дає вам
                прогнозовану якість, стабільні характеристики та можливість
                працювати з брендами, які вже є стандартом у своїх категоріях.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mosaic — padded on mobile/sm, edge-to-edge on lg. lg uses an
          explicit 6×3 grid with each tile placed via col-start/row-start
          and lg:rounded-none resets the mobile 24-px corners before the
          per-tile lg corners (lgRounded) apply. */}
      <ul className="mt-10 grid grid-cols-2 gap-2 px-5 sm:mt-12 sm:grid-cols-3 sm:gap-3 sm:px-10 lg:mt-[80px] lg:grid-cols-6 lg:grid-rows-3 lg:gap-0 lg:px-0">
        {partners.map((p, i) => (
          <li
            key={i}
            className={`group flex aspect-square items-center justify-center rounded-[24px] border border-stroke-default bg-white p-3 transition-all duration-500 hover:z-10 hover:border-neutral-900 hover:bg-bg-subtle hover:shadow-md sm:p-4 lg:rounded-none ${p.lgRounded} ${p.pos}`}
          >
            <img
              src={p.src}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              className={`object-contain grayscale transition-[filter,transform] duration-500 group-hover:scale-110 group-hover:grayscale-0 ${p.imgClass}`}
              style={{ maxWidth: "70%", maxHeight: "60%" }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
