/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

type Feature = {
  title: string;
  body: string;
  icon: ReactNode;
};

/* All feature icons share the same outer footprint so the cards line
   up visually — 96 px on mobile/tablet, 120 px on lg (Figma master).
   The Guarantee icon used to be composed from six absolutely-positioned
   sub-SVGs which made it look subtly off (eyes were downturned crescents,
   sparkle positions drifted on rendering). Now it's a single self-
   contained SVG that matches the Figma reference: speech bubble with
   a round happy face inside (dot eyes + clear ∪ smile) plus two
   orange sparkles, top-right and bottom-left. */
function SimpleIcon({ src }: { src: string }) {
  return (
    <span aria-hidden className="relative block size-[120px] overflow-clip lg:size-[120px]">
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-contain"
      />
    </span>
  );
}

const FEATURES: Feature[] = [
  {
    title: "Один партнер для більшості регулярних закупівель",
    body: "Ми закриваємо закупівлі бізнесу системно, прогнозовано і без зайвої рутини.",
    icon: <SimpleIcon src="/figma-export/why-us/icon-purchases.svg" />,
  },
  {
    title: "Складська наявність та безперебійні поставки",
    body: "Допомагаємо підтримувати оптимальні запаси на вашому складі без дефіциту та перевантаження.",
    icon: <SimpleIcon src="/figma-export/why-us/icon-warehouse.svg" />,
  },
  {
    title: "Надійність і контроль якості",
    body: "Працюємо тільки з перевіреними позиціями та контролюємо якість поставок.",
    icon: <SimpleIcon src="/figma-export/why-us/icon-quality.svg" />,
  },
  {
    title: "Міжнародні поставки з ЄС та інших країн під ваші потреби",
    body: "Працюємо з перевіреними виробниками та забезпечуємо рішення під ваші вимоги, обсяги й терміни.",
    icon: <SimpleIcon src="/figma-export/why-us/icon-international.svg" />,
  },
  {
    title: "Кастомізовані рішення для готелів",
    body: "Виготовляємо продукцію під ваш бренд і стандарти обслуговування — від дизайну до готового результату.",
    icon: <SimpleIcon src="/figma-export/why-us/icon-custom.svg" />,
  },
  {
    title: "Гарантія задоволеності",
    body: "Якщо товар не відповідає очікуванням — ми оперативно вирішуємо питання та пропонуємо альтернативу.",
    icon: <SimpleIcon src="/figma-export/why-us/icon-guarantee.svg" />,
  },
];

/**
 * FeatureBlock has two looks selected by breakpoint:
 *
 *   below lg — Figma mobile Block (3085:3974): a `bg-bg-subtle`
 *   rounded-[32px] card, p-[24px], with the 120 px icon at the TOP,
 *   then Title (22/28 SemiBold) + body (14/20) below, gap-[40px]
 *   between icon and text. No index badge.
 *
 *   lg and up — the original Figma layout. Transparent, no padding,
 *   icon at the bottom-right of the cell, title on top, vertical
 *   dividers between columns and a horizontal divider above the
 *   second row (driven by the `[&>li]:lg:*` selectors on the ul).
 *
 * Order classes flip the visual stack between the two layouts without
 * duplicating DOM: on mobile the icon is shown ABOVE the text
 * (`flex-col-reverse` + reading flow Icon -> Title -> Body), on lg
 * `lg:flex-col` + `lg:justify-between` returns to the title-top /
 * icon-bottom Figma layout. */
function FeatureBlock({ title, body, icon }: Feature) {
  return (
    <article
      className="
        relative flex h-full w-full min-w-0 flex-col-reverse items-start gap-10
        rounded-[32px] bg-bg-subtle p-6
        lg:flex-col lg:items-end lg:justify-between lg:gap-0
        lg:min-h-[344px] lg:rounded-none lg:bg-transparent lg:p-0 lg:py-6
      "
    >
      <div className="flex w-full min-w-0 max-w-full flex-col gap-3 lg:gap-4">
        <h3 className="max-w-full text-title-lg text-neutral-900">{title}</h3>
        <p className="max-w-full text-body-sm text-neutral-500">{body}</p>
      </div>
      <span>{icon}</span>
    </article>
  );
}

export function WhyUs() {
  return (
    <section className="lg-pad-x px-6 py-[60px] sm:px-10 sm:py-20 lg:py-[160px]">
      <div className="flex flex-col gap-12 sm:gap-16 lg:gap-[120px]">
        <div className="flex flex-col items-start justify-between gap-6 sm:gap-8 lg:flex-row lg:items-center">
          <h2 className="max-w-[574px] text-h2-light text-neutral-900">
            <span className="text-h2-light">Чому </span>
            <span className="text-h2">Binar 2000</span>
            <span className="text-h2-light"> обирають як постачальника</span>
          </h2>
          {/* Heading-row button is the DESKTOP placement only. On mobile
              Figma 3085:3956 moves the CTA to the bottom of the column
              (see the centered button after the grid), so it's hidden
              here below lg. */}
          <Button href="/#contact-form" arrow className="max-lg:hidden">
            Отримати пропозицію
          </Button>
        </div>

        {/* lg layout matches Figma Frame 1010106616 exactly: 3 cards x
            340 px wide with 80 px between cards (divider sits in the
            middle of each 80 px gap, like Figma's `w-0` divider siblings
            inside flex gap-[40]+gap-[40]). To get that 340/80 layout
            from a CSS grid we use `lg:gap-x-20` (80 px), which makes
            each column = (100% - 2*80px) / 3 = 340 px on the 1180 px
            master. The divider container is positioned absolute over
            the same wrapper so the dividers paint on the grid's
            vertical/horizontal axes without disturbing the card flow.
            gap-y-20 (80) matches Figma's 80 px row gap; the horizontal
            line then lands exactly on the wrapper's vertical mid-line. */}
        <div className="relative">
          <ul className="relative z-10 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-4 lg:grid-cols-3 lg:gap-x-20 lg:gap-y-20">
            {FEATURES.map((f, i) => (
              <Reveal
                as="li"
                key={f.title}
                delay={(i % 3) * 100}
                className="flex min-w-0"
              >
                <FeatureBlock {...f} />
              </Reveal>
            ))}
          </ul>

          {/* Decorative dividers - lg+ only, matching Figma 1384:12676.
              Position math (for the 340 / 80 / 340 / 80 / 340 row): each
              vertical line sits at the center of its 80 px gap, i.e.
              card-width + half-gap = (100% - 160px) / 3 + 40px, which
              simplifies to `calc(33.333% - 13.333px)` (and the mirrored
              `calc(66.667% + 13.333px)` for the second gap). The
              horizontal line lands on the wrapper's 50% mid-line because
              the two 344 px rows are perfectly symmetrical around it.

              COLORS — Figma uses TWO different stroke tokens for these
              hairlines, which is easy to miss:
                * Vector67 (verticals) = #D2D2D2 = stroke-subtle
                * Vector68 (horizontal) = #8E8E8F = stroke-default
              The horizontal is intentionally darker so it reads as the
              "primary" separator between the two rows, while the
              verticals are a softer hint of column structure.

              WIDTH — 1 px stroke (h-px / w-px) matches Figma's SVG
              stroke-width: 1. At sub-pixel positions both line types
              anti-alias to ~50 % opacity over 2 device pixels, which
              gives the exact perceived colors Figma's renderer
              produces: ~#c7c7c7 for the horizontal and ~#e8e8e8 for
              the verticals. A wider 2 px solid line would be crisper
              but no longer match Figma's anti-aliased look. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
            {/* Horizontal: full-width line at the wrapper's vertical
                mid-line (= centre of the 80 px row gap). */}
            <span className="absolute left-0 right-0 top-1/2 block h-px -translate-y-1/2 bg-stroke-default" />
            {/* Verticals: span exactly one row height each, NOT the full
                half-wrapper. With gap-y-20 (80 px) between rows the
                horizontal line sits 40 px from each row's edge, so each
                vertical ends `bottom: calc(50% + 40px)` (top row) or
                starts `top: calc(50% + 40px)` (bottom row). That leaves
                a visible 40 px gap above and below the horizontal -
                exactly the cross-free intersection Figma uses. */}
            <span className="absolute left-[calc(33.333%_-_13.333px)] top-0 bottom-[calc(50%+40px)] block w-px -translate-x-1/2 bg-stroke-subtle" />
            <span className="absolute left-[calc(66.667%_+_13.333px)] top-0 bottom-[calc(50%+40px)] block w-px -translate-x-1/2 bg-stroke-subtle" />
            <span className="absolute left-[calc(33.333%_-_13.333px)] top-[calc(50%+40px)] bottom-0 block w-px -translate-x-1/2 bg-stroke-subtle" />
            <span className="absolute left-[calc(66.667%_+_13.333px)] top-[calc(50%+40px)] bottom-0 block w-px -translate-x-1/2 bg-stroke-subtle" />
          </div>
        </div>

        {/* Mobile CTA — Figma 3085:3956 places the button at the BOTTOM
            of the column, centered, ~240px wide (small size). Hidden on
            lg where the CTA lives in the heading row instead. */}
        <div className="flex justify-end -mt-6 lg:mt-0 lg:hidden">
          <Button href="/#contact-form" size="small" arrow>
            Отримати пропозицію
          </Button>
        </div>
      </div>
    </section>
  );
}
