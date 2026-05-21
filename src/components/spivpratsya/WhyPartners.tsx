/* eslint-disable @next/next/no-img-element */
import { Reveal } from "@/components/ui/Reveal";
import type { ReactNode } from "react";

// Figma 1870:6139 — "Чому партнери обирають нас?".
//
// Title (574-px column, two-tone) on the left, then a 1180×560 grid of
// 6 feature blocks split into 2 rows × 3 cols by vertical dividers
// between cols and a single horizontal divider between rows. Each block
// has a 24-px SemiBold title on top and a 120-px outline-style icon
// pinned to its bottom-right.

// Most icons are a single SVG file, but the calculator (Block 1) is
// authored in Figma as a 6-layer composition: outline + four operator
// glyphs + a small sparkle. Rendering it as a single asset would lose
// the inner symbols (Figma exports them as separate frames). So the
// icon prop accepts either a string (single asset) or a ReactNode
// (composed JSX). The container is always 96/120 px square with
// `object-contain` semantics — the composition just lives inside that
// box at the same scale as Figma's `Block icons` master.
type Feature = {
  title: string;
  icon: string | ReactNode;
};

// Calculator icon — 120×120 frame matching Figma's `Block icons`
// master. Positions / sizes are pulled verbatim from the
// `I1870:6143;230:1665` design context (base body at (13,13), small
// glyphs at exact px offsets). Coordinates are expressed as % of 120
// so the SAME composition scales identically to the 96-px mobile box.
const PCT = (px: number) => `${(px / 120) * 100}%`;
function CalcIcon() {
  return (
    <>
      <img
        src="/figma-export/spivpratsya/why-calc.svg"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute block"
        style={{ left: PCT(13), top: PCT(13), width: PCT(94), height: PCT(94) }}
      />
      <img
        src="/figma-export/spivpratsya/why-calc-plus.svg"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute block"
        style={{
          left: PCT(26.36),
          top: PCT(26.69),
          width: PCT(20.5),
          height: PCT(20.5),
        }}
      />
      <img
        src="/figma-export/spivpratsya/why-calc-minus.svg"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute block -rotate-45"
        style={{
          left: PCT(26.36),
          top: PCT(72.72),
          width: PCT(20.5),
          height: PCT(20.5),
        }}
      />
      {/* Minus stroke in the top-right quadrant. The Figma original is a
          0-width vertical SVG rotated -90° — when forced into a square
          box it stretches into a black block. Render directly as a
          1-px-thick rounded line at the same position instead. */}
      <span
        aria-hidden
        className="absolute block rounded-full bg-neutral-900"
        style={{
          left: PCT(73.07),
          top: PCT(46.94),
          width: PCT(20.5),
          height: "1px",
        }}
      />
      <img
        src="/figma-export/spivpratsya/why-calc-eq.svg"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute block"
        style={{
          left: PCT(73.07),
          top: PCT(77.45),
          width: PCT(20.5),
          height: PCT(11.02),
        }}
      />
      <img
        src="/figma-export/spivpratsya/why-calc-spark.svg"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute block"
        style={{
          right: PCT(4.35),
          bottom: PCT(27.61),
          width: PCT(15.55),
          height: PCT(18.85),
        }}
      />
    </>
  );
}

const FEATURES: Feature[] = [
  {
    title: "Швидкі прорахунки без затягувань",
    icon: <CalcIcon />,
  },
  {
    title: "Чіткий процес роботи",
    icon: "/figma-export/spivpratsya/why-process.svg",
  },
  {
    title: "Контроль якості (ISO 9001)",
    icon: "/figma-export/spivpratsya/why-iso.svg",
  },
  {
    title: "Гнучкість по MOQ",
    icon: "/figma-export/spivpratsya/why-moq.svg",
  },
  {
    title: "Імпорт під проєкти",
    icon: "/figma-export/spivpratsya/why-import.svg",
  },
  {
    title: "Підтримка після поставки",
    icon: "/figma-export/spivpratsya/why-support.svg",
  },
];

function Block({ title, icon }: Feature) {
  return (
    <article className="group/why flex h-full w-full min-w-0 flex-col-reverse items-start gap-5 rounded-[24px] bg-bg-subtle p-6 transition-[transform,background-color,box-shadow] duration-500 hover:-translate-y-1.5 hover:bg-white hover:shadow-[0_24px_50px_-22px_rgba(29,29,31,0.22)] sm:gap-6 sm:rounded-[28px] sm:p-7 lg:flex-col lg:items-end lg:justify-between lg:gap-10 lg:min-h-[240px] lg:rounded-none lg:bg-transparent lg:p-0 lg:py-6 lg:hover:translate-y-0 lg:hover:bg-transparent lg:hover:shadow-none">
      <h3 className="w-full text-title-lg text-neutral-900 transition-colors duration-300 group-hover/why:text-brand">
        {title}
      </h3>
      <span
        aria-hidden
        className="relative block size-[96px] overflow-clip transition-transform duration-500 ease-out group-hover/why:-translate-y-1 group-hover/why:scale-[1.06] lg:size-[120px]"
      >
        {typeof icon === "string" ? (
          <img
            src={icon}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-contain"
          />
        ) : (
          icon
        )}
      </span>
    </article>
  );
}

export function WhyPartners() {
  return (
    <section className="lg-pad-x w-full bg-white px-5 py-16 sm:px-10 sm:py-20 lg:py-[120px]">
      <div className="flex flex-col gap-10 sm:gap-14 lg:gap-[120px]">
        <Reveal
          as="h2"
          className="text-neutral-900 lg:max-w-[574px]"
        >
          <span className="text-h2-light">Чому партнери </span>
          <span className="text-h2">обирають нас?</span>
        </Reveal>

        <div className="relative lg:py-2">
          <ul className="relative z-10 grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-4 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-20">
            {FEATURES.map((f, i) => (
              <Reveal
                as="li"
                key={f.title}
                delay={(i % 3) * 100}
                className="flex min-w-0"
              >
                <Block {...f} />
              </Reveal>
            ))}
          </ul>

          {/* lg dividers — single horizontal between row 1 and row 2,
              two vertical lines at 1/3 and 2/3 marks in each row,
              insets trim them so they don't touch the section edges
              (Figma Vector 67/68). */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden lg:block"
          >
            <span className="absolute left-0 right-0 top-1/2 block h-px -translate-y-1/2 bg-stroke-subtle" />
            <span className="absolute left-1/3 top-[8%] bottom-[58%] block w-px -translate-x-1/2 bg-stroke-subtle" />
            <span className="absolute left-2/3 top-[8%] bottom-[58%] block w-px -translate-x-1/2 bg-stroke-subtle" />
            <span className="absolute left-1/3 top-[58%] bottom-[8%] block w-px -translate-x-1/2 bg-stroke-subtle" />
            <span className="absolute left-2/3 top-[58%] bottom-[8%] block w-px -translate-x-1/2 bg-stroke-subtle" />
          </div>
        </div>
      </div>
    </section>
  );
}
