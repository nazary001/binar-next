/* eslint-disable @next/next/no-img-element */
"use client";
import { useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";

// Decorative icon row in the FAQ header (Figma 1384:12939). The four
// squared tiles each contain a small dark glyph. They are NOT filter
// controls — Figma renders them as static "Info icons" alongside the
// heading, so we keep them purely visual with title-attribute tooltips
// for screen-reader users.
//
// Each SVG is the Figma "Info icon" 34px-zone export (the glyph's own
// padding is baked into the asset), so a uniform 17.31% inset (= 9/52)
// reproduces the master exactly at every tile size (52 / 72 / 96).
const HEADER_ICONS = [
  { src: "/figma-export/info-icons/faq-product.svg", label: "Товари" },
  { src: "/figma-export/info-icons/faq-time.svg", label: "Терміни" },
  { src: "/figma-export/info-icons/faq-work.svg", label: "Робота" },
  { src: "/figma-export/info-icons/faq-question.svg", label: "Питання" },
];

// An answer is one or more paragraphs. Single-paragraph answers stay a
// plain string; multi-paragraph answers (the extra questions below) are
// an array, rendered as stacked <p> blocks.
export type FaqEntry = { q: string; a: string | string[] };

// Question copy and order from Figma instances 1384:12945–12948.
const DEFAULT_FAQS: FaqEntry[] = [
  {
    q: "Які терміни постачання?",
    a: "Терміни залежать від типу продукції. Стандартні позиції зі складу постачаємо оперативно. Кастомізовані або замовні рішення мають індивідуальні строки, які погоджуємо перед підтвердженням КП.",
  },
  {
    q: "Чи є мінімальне замовлення?",
    a: "Мінімальний обсяг залежить від категорії товару та формату постачання. Ми підбираємо оптимальні обсяги під ваші реальні потреби, щоб закупівля була економічно обґрунтованою.",
  },
  {
    q: "Чи можна замовити регулярні поставки за графіком?",
    a: "Так, ми працюємо з регулярними постачаннями. Узгоджуємо обсяги, періодичність і фіксуємо логіку співпраці, щоб уникнути перебоїв і позапланових закупівель.",
  },
  {
    q: "Як формується комерційна пропозиція та ціна?",
    a: "Комерційна пропозиція формується на основі вашого запиту: тип обʼєкта, продукція, обсяги та формат постачання. Це дозволяє отримати прозорий прорахунок без зайвих позицій і прихованих умов.",
  },
];

// The four questions revealed by "Показати більше" on the home page.
// They belong to the DEFAULT question set only (the other landing pages
// override `faqs`, so they never get these — see `extraFaqs` below).
const EXTRA_FAQS: FaqEntry[] = [
  {
    q: "Що робити, якщо товар не підійшов по якості або виникла спірна ситуація?",
    a: [
      "Ми системно працюємо з якістю, тому більшість ризиків закриваємо ще до поставки. Працюємо з перевіреними постачальниками та узгоджуємо характеристики на етапі замовлення. Якщо замовлення складне — за потреби замовляємо зразки до запуску партії.",
      "Ми також зберігаємо референтні зразки кожної поставленої партії в архіві, щоб у разі спірної ситуації можна було обʼєктивно перевірити відповідність. Компанія працює за сертифікованою системою якості ISO 9001.",
      "Для нас репутація важливіша за короткострокові вигоди, тому якщо виникає проблема — ми не перекладаємо відповідальність, а оперативно вирішуємо питання та готові компенсувати втрати або запропонувати заміну/альтернативу.",
    ],
  },
  {
    q: "Чи можна отримати взірці перед замовленням?",
    a: [
      "Так. Ми можемо надати безкоштовні зразки стандартних позицій, щоб ви могли оцінити якість до закупівлі.",
      "Для кастомізованих проєктів ми також можемо виготовити зразки з вашим брендом перед запуском партії (умови узгоджуємо індивідуально).",
    ],
  },
  {
    q: "Чи працюєте ви з мережами та великими компаніями?",
    a: [
      "Так. Ми маємо досвід співпраці з мережевими клієнтами та великими компаніями, де важливі стандарти, стабільність, контроль якості та передбачувані поставки.",
      "Працюємо системно: узгоджені специфікації, графіки постачання та відповідальність за результат.",
    ],
  },
  {
    q: "З якими відомими брендами/компаніями ви працюєте?",
    a: "Ми співпрацюємо з міжнародними брендами та виробниками, зокрема: Valera, Diversey, Allagrini, Hunter Amenities, Rituals, ALDA, Papoutsanis та іншими.",
  },
];

// One FAQ row. `reveal` is undefined for the always-visible questions and
// a boolean for the expandable ones — when it's a boolean the row also
// fades + slides into place (driven by the show-more toggle, staggered by
// `delay`) on top of the container's height animation.
function FaqRow({
  item,
  num,
  reveal,
  delay = 0,
}: {
  item: FaqEntry;
  num: string;
  reveal?: boolean;
  delay?: number;
}) {
  const paragraphs = Array.isArray(item.a) ? item.a : [item.a];
  const animated = reveal !== undefined;
  return (
    <li
      className={`flex w-full flex-row items-start gap-3 lg:gap-8${
        animated
          ? ` transition-[opacity,transform] duration-500 ease-out ${
              reveal ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`
          : ""
      }`}
      // Stagger the entrance on reveal; collapse all together (delay 0).
      style={animated ? { transitionDelay: reveal ? `${delay}ms` : "0ms" } : undefined}
    >
      {/* Big numeral — Figma 120-px Manrope SemiBold (lg+ only). */}
      <p className="hidden font-semibold leading-[1.03] tracking-[-2.4px] text-neutral-900 lg:block lg:w-[271px] lg:shrink-0 lg:text-[120px] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
        {num}
      </p>

      {/* Below lg (Figma 3137:15534): the "0N." numeral sits in a 56-px
          column to the LEFT of the content; cap-trimmed so it aligns with
          the divider line at the top of the content column. 30/36 Bold. */}
      <p
        aria-hidden
        className="block w-[56px] shrink-0 text-[30px] font-bold leading-[36px] tracking-[-0.6px] text-neutral-900 [text-box-edge:cap_alphabetic] [text-box-trim:trim-both] lg:hidden"
      >
        {num}
      </p>

      <div className="flex flex-1 flex-col gap-6 lg:gap-8">
        {/* Top hairline divider. On lg `lg:contents` flattens this wrapper
            so the divider becomes a direct flex child beside the numeral. */}
        <div className="flex items-center max-lg:-mb-px lg:contents">
          <span
            aria-hidden
            className="block h-px flex-1 bg-stroke-default lg:w-full lg:flex-none"
          />
        </div>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <h3 className="text-[16px] font-bold leading-[24px] text-black lg:w-[372px] lg:shrink-0 lg:text-title-lg lg:font-semibold lg:text-neutral-900">
            {item.q}
          </h3>
          <div className="flex flex-1 flex-col gap-4">
            {paragraphs.map((para, k) => (
              <p key={k} className="text-body-sm text-neutral-800">
                {para}
              </p>
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}

type FaqProps = {
  faqs?: FaqEntry[];
  // Extra questions revealed by the "Показати більше" CTA. Pages can pass
  // their own set (e.g. cleaning); if omitted, the home DEFAULT_FAQS set
  // falls back to EXTRA_FAQS and every other page gets none.
  extraFaqs?: FaqEntry[];
  showFilters?: boolean;
  // Whether to render the "Показати більше" CTA below the question list.
  // The home page wants it (Figma 1384:12949); landing pages that override
  // `faqs` pass `showMoreButton={false}` because their frames end right
  // after the last question.
  showMoreButton?: boolean;
  // Show the "Показати більше" CTA only below lg. Used by the hotels page,
  // whose Figma MOBILE master ends with the button while its desktop
  // layout keeps the current button-less ending.
  moreButtonMobileOnly?: boolean;
};

// Figma layout (1384:12936) — 1440-master spec:
//   • section: bg-white, px-130 py-160, flex-col gap-120 center
//   • header row: title (44/48 Light + Bold mix) left, 4×96 icon tiles right
//   • question list: flex-col gap-120, each item is a big "0N." numeral on
//     the left (Manrope SemiBold 120/123.6 -2.4) sitting next to a right
//     column with a 1-px stroke-default divider above the title+body row.
//     Title is 24/28 -0.48 width 372, body is 16/24 flex-1.
//   • button: solid dark "Показати більше", rounded-25, size large.
//
// Smaller viewports scale: padding shrinks (12 → 16 → 160), the 120-px
// gaps collapse to 12/16, the giant numeral drops from 120 → 64 px and
// stacks above its content row, and the title-row icons fall under the
// heading and shrink to 56/72/96 — same responsive logic as the rest of
// the home page.
export function Faq({
  faqs = DEFAULT_FAQS,
  extraFaqs: extraFaqsProp,
  showFilters = true,
  showMoreButton = true,
  moreButtonMobileOnly = false,
}: FaqProps = {}) {
  const [expanded, setExpanded] = useState(false);

  // Extra questions revealed by "Показати більше". A page can pass its own
  // set via `extraFaqs` (cleaning does); otherwise the home DEFAULT_FAQS
  // set falls back to EXTRA_FAQS and pages with their own `faqs` (protect,
  // hotels) get none, so their button stays the inert design element.
  const extraFaqs =
    extraFaqsProp ?? (faqs === DEFAULT_FAQS ? EXTRA_FAQS : []);
  const canExpand = showMoreButton && extraFaqs.length > 0;
  // Toggle CTA state: minus + "Приховати" when open, plus + "Показати
  // більше" when closed (or on the inert landing-page button, canExpand false).
  const showMinus = canExpand && expanded;

  return (
    <section
      id="faq"
      className="lg-pad-x flex flex-col items-center gap-12 bg-white px-6 py-[60px] sm:gap-16 sm:px-10 sm:py-20 lg:gap-[120px] lg:py-[160px]"
    >
      {/* === Header: title + decorative icon row === */}
      <div className="flex w-full flex-col items-start justify-between gap-8 lg:flex-row lg:items-start lg:gap-8">
        <h2 className="flex-1 text-neutral-900">
          <span className="text-h2-light">Часті </span>
          <span className="text-h2">питання</span>
        </h2>
        {showFilters && (
          <ul className="flex shrink-0 flex-wrap items-center gap-[14px] sm:gap-4">
            {HEADER_ICONS.map((i, idx) => (
              <Reveal
                as="li"
                key={i.label}
                delay={idx * 80}
                direction="right"
                aria-label={i.label}
                title={i.label}
                className="relative size-[52px] cursor-default overflow-clip rounded-[12px] border border-stroke-default sm:size-[72px] sm:rounded-[16px] lg:size-[96px] lg:rounded-[18px]"
              >
                {/* Glyph — the 34px-zone asset at the Info icon's FIXED
                    9px inset. The Figma component keeps the inset
                    absolute when resized (52->34, 72->54, 96->78 zone),
                    so a percentage inset shrank the glyph ~20% at lg. */}
                <span className="absolute block inset-[9px]">
                  <img
                    src={i.src}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 block size-full max-w-none"
                  />
                </span>
              </Reveal>
            ))}
          </ul>
        )}
      </div>

      {/* === Question list ===
          The always-visible questions, then the expandable extra ones.
          Both live in one block-flow wrapper (NOT a gapped flex parent) so
          the collapsed expander adds zero height/gap; the gap to the first
          extra question lives inside the collapsible area (its `pt`), so it
          animates open/closed with the content. */}
      <div className="w-full">
        <ul className="flex w-full flex-col gap-[60px] sm:gap-12 lg:gap-[120px]">
          {faqs.map((item, i) => (
            <FaqRow
              key={i}
              item={item}
              num={`${String(i + 1).padStart(2, "0")}.`}
            />
          ))}
        </ul>

        {/* Expandable extra questions. The grid `0fr → 1fr` row track is
            the height-auto animation: the inner wrapper is overflow-clipped,
            so the row grows from 0 to the content's natural height with a
            single smooth CSS transition — no JS measuring. `inert` keeps the
            collapsed content out of tab/AT order. */}
        {canExpand && (
          <div
            id="faq-more"
            inert={!expanded}
            className={`grid w-full transition-[grid-template-rows] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <ul className="flex w-full flex-col gap-[60px] pt-[60px] sm:gap-12 sm:pt-12 lg:gap-[120px] lg:pt-[120px]">
                {extraFaqs.map((item, j) => (
                  <FaqRow
                    key={j}
                    item={item}
                    num={`${String(faqs.length + j + 1).padStart(2, "0")}.`}
                    reveal={expanded}
                    delay={j * 90}
                  />
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* === CTA button — Figma 1384:12949 ===
          On the home page it toggles the four extra questions and swaps its
          label to "Приховати". On landing pages that have no extra
          questions it renders as the inert design element from Figma. */}
      {showMoreButton && (
        <Button
          variant="solid"
          size="responsive"
          // Figma mobile master shows a bare pill (no plus/minus icon square),
          // so hide the icon below lg; desktop keeps it. moreButtonMobileOnly
          // also hides the whole button on desktop for the hotels page.
          iconDesktopOnly
          // Figma mobile: 60px between the last question and the button;
          // the section's gap-12 provides 48, mt-3 adds the missing 12.
          // Full string literals (not a template) so Tailwind's scanner
          // reliably emits both classes.
          className={
            moreButtonMobileOnly ? "max-lg:mt-3 lg:hidden" : "max-lg:mt-3"
          }
          plus={!showMinus}
          minus={showMinus}
          onClick={canExpand ? () => setExpanded((v) => !v) : undefined}
          aria-expanded={canExpand ? expanded : undefined}
          aria-controls={canExpand ? "faq-more" : undefined}
        >
          {showMinus ? "Приховати" : "Показати більше"}
        </Button>
      )}
    </section>
  );
}
