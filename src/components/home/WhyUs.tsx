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
    <span aria-hidden className="relative block size-[96px] overflow-clip lg:size-[120px]">
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
 *   below lg — a card. `bg-bg-subtle` panel with rounded corners,
 *   icon at the top, title + body below, number badge floating in the
 *   top-right. Hover lifts the card and swaps to a white surface with
 *   a soft shadow so the cards feel tactile on a phone tap. This was
 *   added because the mobile section was previously six unframed
 *   blocks with nothing separating them visually.
 *
 *   lg and up — the original Figma layout. Transparent, no padding,
 *   icon at the bottom-right of the cell, title on top, vertical
 *   dividers between columns and a horizontal divider above the
 *   second row (driven by the `[&>li]:lg:*` selectors on the ul).
 *
 * Order classes flip the visual stack between the two layouts without
 * duplicating DOM: on mobile the icon is shown ABOVE the text
 * (`flex-col-reverse` + reading flow Icon → Title → Body), on lg
 * `lg:flex-col` + `lg:justify-between` returns to the title-top /
 * icon-bottom Figma layout. */
function FeatureBlock({
  title,
  body,
  icon,
  index,
  total,
}: Feature & { index: number; total: number }) {
  return (
    <article
      className="
        group relative flex h-full w-full min-w-0 flex-col-reverse items-start gap-5
        rounded-[24px] bg-bg-subtle p-6
        transition-[transform,background-color,box-shadow,color] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]
        hover:-translate-y-1.5 hover:bg-white hover:shadow-[0_24px_50px_-22px_rgba(29,29,31,0.22)]
        sm:gap-6 sm:rounded-[28px] sm:p-7
        lg:flex-col lg:items-end lg:justify-between lg:gap-10
        lg:min-h-[344px] lg:rounded-none lg:bg-transparent lg:p-0 lg:py-4
        lg:shadow-none lg:hover:translate-y-0 lg:hover:bg-transparent lg:hover:shadow-none
      "
    >
      {/* Mono-style index badge — only on the card layout. Pairs with
          the AboutUs "01./02./..." pattern for a consistent rhythm. */}
      <span
        aria-hidden
        className="absolute right-5 top-5 font-mono text-[12px] font-medium tracking-[0.18em] text-neutral-300 transition-colors duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-brand sm:right-6 sm:top-6 sm:text-[13px] lg:hidden"
      >
        {String(index + 1).padStart(2, "0")}
        <span className="text-neutral-200"> / {String(total).padStart(2, "0")}</span>
      </span>

      <div className="flex w-full min-w-0 max-w-full flex-col gap-3 sm:gap-4">
        <h3 className="max-w-full text-title-lg text-neutral-900 transition-colors duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-brand">
          {title}
        </h3>
        <p className="max-w-full text-body-sm text-neutral-500 transition-colors duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-neutral-700">{body}</p>
      </div>
      <span className="transition-transform duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1 group-hover:scale-[1.08]">
        {icon}
      </span>
    </article>
  );
}

export function WhyUs() {
  return (
    <section className="lg-pad-x px-5 py-12 sm:px-10 sm:py-20 lg:py-[120px]">
      <div className="flex flex-col gap-10 sm:gap-16 lg:gap-[120px]">
        <div className="flex flex-col items-start justify-between gap-6 sm:gap-8 lg:flex-row lg:items-center">
          <h2 className="max-w-[574px] text-h2-light text-neutral-900">
            <span className="text-h2-light">Чому </span>
            <span className="text-h2">Binar 2000</span>
            <span className="text-h2-light"> обирають як постачальника</span>
          </h2>
          <Button href="/#contact-form" arrow>
            Отримати пропозицію
          </Button>
        </div>

        {/* gap-y-4 on the card layout matches the visible 16 px gutter
            between the 6 cards. On lg the grid is wrapped in a relative
            container so we can paint the dividers separately from the
            cards: ONE long horizontal line between the two rows, and
            short vertical lines between columns INSIDE each row that
            don't reach the row's top/bottom (their height is reduced
            with inset-y padding). Matches the Figma reference. */}
        <div className="relative lg:py-2">
          <ul className="relative z-10 grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-4 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-20">
            {FEATURES.map((f, i) => (
              <Reveal
                as="li"
                key={f.title}
                delay={(i % 3) * 100}
                className="flex min-w-0"
              >
                <FeatureBlock {...f} index={i} total={FEATURES.length} />
              </Reveal>
            ))}
          </ul>

          {/* Decorative dividers — lg+ only. The horizontal line sits at
              the grid's vertical mid-line (between row 1 and row 2). The
              four vertical lines split each row into 3 columns at the
              1/3 and 2/3 marks; inset-y trims them so they don't touch
              the section edges (the "обрезанные" look from the Figma). */}
          <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
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
