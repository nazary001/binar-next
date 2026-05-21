/* eslint-disable @next/next/no-img-element */
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";

// Decorative icon row in the FAQ header (Figma 1384:12939). The four 96-px
// squared tiles each contain a small dark glyph. They are NOT filter
// controls — Figma renders them as static "Info icons" alongside the
// heading, so we keep them purely visual with title-attribute tooltips
// for screen-reader users.
//
// Each glyph has its OWN natural aspect ratio (the SVGs ship with
// preserveAspectRatio="none", so they fill whatever box we put them in
// exactly). The Figma design wraps every glyph in an absolute-positioned
// box whose top/right/bottom/left percentages match the glyph's natural
// shape, so the "stretched" SVG actually renders at the correct ratio.
// The `inset` values below are pre-flattened from Figma's nested wrapper
// (outer 9-px pad → inner glyph-specific %), expressed as percentages
// of the OUTER tile so they scale uniformly across 56 / 72 / 96 sizes.
const HEADER_ICONS = [
  {
    src: "/figma-export/faq/icon-product.svg",
    label: "Товари",
    inset: { top: "20.82%", right: "22.62%", bottom: "20.82%", left: "22.62%" },
  },
  {
    src: "/figma-export/faq/icon-time.svg",
    label: "Терміни",
    inset: { top: "23.73%", right: "28.02%", bottom: "23.73%", left: "28.02%" },
  },
  {
    src: "/figma-export/faq/icon-work.svg",
    label: "Робота",
    inset: { top: "23.63%", right: "20.83%", bottom: "23.63%", left: "20.81%" },
  },
  {
    src: "/figma-export/faq/icon-question.svg",
    label: "Питання",
    inset: { top: "18.82%", right: "31.83%", bottom: "18.82%", left: "31.81%" },
  },
];

export type FaqEntry = { q: string; a: string };

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

type FaqProps = {
  faqs?: FaqEntry[];
  showFilters?: boolean;
  // Whether to render the "Показати більше" CTA below the question list.
  // The home page wants it (Figma 1384:12949), but downstream landing
  // pages (e.g. Spivpratsya) render the same component without the CTA
  // because their Figma frames end right after the last question.
  showMoreButton?: boolean;
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
  showFilters = true,
  showMoreButton = true,
}: FaqProps = {}) {
  return (
    <section
      id="faq"
      className="lg-pad-x flex flex-col items-center gap-12 bg-white px-5 py-16 sm:gap-16 sm:px-10 sm:py-24 lg:gap-[120px] lg:py-[160px]"
    >
      {/* === Header: title + decorative icon row === */}
      <div className="flex w-full flex-col items-start justify-between gap-6 sm:gap-8 lg:flex-row lg:items-start lg:gap-8">
        <h2 className="flex-1 text-neutral-900">
          <span className="text-h2-light">Часті </span>
          <span className="text-h2">питання</span>
        </h2>
        {showFilters && (
          <ul className="flex shrink-0 flex-wrap items-center gap-3 sm:gap-4">
            {HEADER_ICONS.map((i, idx) => (
              <Reveal
                as="li"
                key={i.label}
                delay={idx * 80}
                direction="right"
                aria-label={i.label}
                title={i.label}
                className="group relative size-[56px] cursor-default overflow-clip rounded-[14px] border border-stroke-default transition-all duration-300 hover:-translate-y-1 hover:border-neutral-900 sm:size-[72px] sm:rounded-[16px] lg:size-[96px] lg:rounded-[18px]"
              >
                {/* Glyph wrapper — absolute box whose top/right/bottom/left
                    percentages match this icon's natural aspect ratio (see
                    HEADER_ICONS comment). The SVG fills the wrapper exactly,
                    so even with preserveAspectRatio="none" the rendered
                    glyph is in correct proportion, not stretched. The
                    wrapper scales the icon hover-up by a hair without
                    distorting its shape. */}
                <span
                  className="absolute block transition-transform duration-300 group-hover:scale-110"
                  style={i.inset}
                >
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

      {/* === Question list === */}
      <ul className="flex w-full flex-col gap-12 sm:gap-20 lg:gap-[120px]">
        {faqs.map((item, i) => {
          const num = `${String(i + 1).padStart(2, "0")}.`;
          return (
            <Reveal
              as="li"
              key={i}
              delay={i * 60}
              direction="up"
              className="flex w-full flex-col gap-4 sm:gap-6 lg:flex-row lg:items-start lg:gap-8"
            >
              {/* Big numeral — Figma 120-px Manrope SemiBold with
                  letter-spacing -2.4 and ~103 % line-height. The Figma
                  block also pins the text box to its cap-alphabetic
                  edges (text-box-trim) so the divider on the right
                  column lines up with the visible top of the digits.
                  We use the same CSS in browsers that support it;
                  others get a tiny ascender gap which is fine. */}
              <p className="font-semibold leading-[1.03] tracking-[-1.28px] text-neutral-900 text-[64px] sm:text-[88px] sm:tracking-[-1.76px] lg:w-[271px] lg:shrink-0 lg:text-[120px] lg:tracking-[-2.4px] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                {num}
              </p>

              {/* Right column — divider line + title/body row. On lg the
                  title pins to 372 px and the body fills the remaining
                  space; below lg the body stacks under the title. */}
              <div className="flex flex-1 flex-col gap-6 sm:gap-8">
                <span
                  aria-hidden
                  className="block h-px w-full bg-stroke-default"
                />
                <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-start lg:gap-8">
                  <h3 className="text-title-lg text-neutral-900 lg:w-[372px] lg:shrink-0">
                    {item.q}
                  </h3>
                  <p className="flex-1 text-body-sm text-neutral-800">
                    {item.a}
                  </p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </ul>

      {/* === CTA button — Figma 1384:12949 "Показати більше" ===
          Solid black pill, no arrow icon. Currently links to the contact
          form anchor; swap the href if/when an actual "more questions"
          destination exists. Hidden on landing pages whose Figma frame
          ends right after the last question (Spivpratsya 1870:6250). */}
      {showMoreButton && (
        <Reveal direction="up">
          <Button href="/#contact-form" variant="solid" size="large">
            Показати більше
          </Button>
        </Reveal>
      )}
    </section>
  );
}
