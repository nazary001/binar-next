/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

// Icons match the Figma cleaning page (node 1327:4490). Blocks 1 / 5 / 6
// use cleaning-specific renders (water drop with sparkles, quality seal,
// document stack) that don't exist elsewhere in the project. Blocks
// 2 / 3 / 4 reuse the cross-page library (puzzle / scale / calendar+box)
// because those renders already match the cleaning section's design.
const FEATURES = [
  {
    title: "Системне забезпечення гігієни",
    body: "Підбираємо гігієнічне забезпечення відповідно до ваших стандартів, процесів і типу об'єкта.",
    icon: "/figma-export/cleaning/icon-system.svg",
  },
  {
    title: "Підбір під реальні задачі",
    body: "Пропонуємо лише те, що справді потрібно у роботі, без зайвих позицій і переплат.",
    icon: "/figma-export/why-us/icon-custom.svg",
  },
  {
    title: "Оптимізацію витрат",
    body: "Допомагаємо зменшити витрати завдяки правильним дозуванням, концентраціям і налагодженим процесам.",
    icon: "/figma-export/hotels/icon-budget.svg",
  },
  {
    title: "Стабільні поставки без перебоїв",
    body: "Забезпечуємо регулярне постачання складських позицій і допомагаємо прогнозувати потреби.",
    icon: "/figma-export/hotels/icon-storage.svg",
  },
  {
    title: "Перевірені професійні рішення",
    body: "Працюємо з надійними брендами та продуктами, які підходять для стабільного сервісу без ризику експериментів.",
    icon: "/figma-export/cleaning/icon-trusted.svg",
  },
  {
    title: "Відповідність вимогам і документації",
    body: "Надаємо супровідні документи та рішення, що допомагають дотримуватись HACCP, внутрішніх аудитів і стандартів.",
    icon: "/figma-export/cleaning/icon-compliance.svg",
  },
];

export function CleaningBenefits() {
  return (
    <section className="lg-pad-x bg-white px-5 py-16 sm:px-10 sm:py-20 lg:border-l lg:border-r lg:border-stroke-default lg:py-[160px]">
      <div className="flex flex-col gap-12 sm:gap-16 lg:gap-[120px]">
        <div className="flex flex-col items-start justify-between gap-6 sm:gap-8 lg:flex-row lg:items-center">
          <h2 className="max-w-[574px] text-neutral-900">
            <span className="text-h2-light">Що ви </span>
            <span className="text-h2">отримуєте?</span>
          </h2>
          <Button href="/#contact-form" arrow>
            Підібрати рішення
          </Button>
        </div>

        {/* Figma dividers (from node 1327:4490):
              - vertical column dividers stroke #D2D2D2 = stroke-subtle
              - horizontal row divider   stroke #8E8E8F = stroke-default
            Vertical lines live as `border-l` on each li and ONLY span
            their own row (344 px). The horizontal line is rendered as
            a single full-width `::before` pseudo-element on the UL,
            centered in the 80 px row gap. That way:
              * the horizontal line is one continuous stroke (no gaps
                in the `gap-x` zones, the way a per-cell `border-t`
                would have produced),
              * the vertical lines never touch it — they stop 40 px
                before, and the next row's verticals start 40 px after,
                matching the Figma composition exactly. */}
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:relative lg:grid-cols-3 lg:gap-x-10 lg:gap-y-20 lg:before:absolute lg:before:inset-x-0 lg:before:top-[384px] lg:before:h-px lg:before:bg-stroke-default lg:before:content-[''] [&>li]:lg:border-l [&>li]:lg:border-stroke-subtle [&>li]:lg:px-10 [&>li:nth-child(3n+1)]:lg:border-l-0 [&>li:nth-child(3n+1)]:lg:pl-0 [&>li:nth-child(3n)]:lg:pr-0">
          {FEATURES.map((f, i) => (
            <Reveal
              as="li"
              key={f.title}
              delay={(i % 3) * 100}
              className="flex"
            >
              {/* Mobile / sm: white-card treatment with big numeral
                  accent + icon-in-spotlight (matches TeamCta mobile
                  pattern). At `lg` the card chrome dissolves and the
                  Figma-faithful icon-at-bottom layout returns, with
                  the section's grid lines doing the structural work. */}
              <article className="group relative flex h-full w-full min-w-0 flex-col gap-6 overflow-hidden rounded-[28px] border border-stroke-subtle bg-white p-7 transition-[transform,box-shadow,border-color] duration-500 ease-out hover:-translate-y-1 hover:border-neutral-900 hover:shadow-[0_24px_60px_-24px_rgba(29,29,31,0.24)] sm:gap-7 sm:rounded-[32px] sm:p-8 lg:flex-col lg:items-end lg:justify-between lg:gap-10 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:py-4 lg:min-h-[344px] lg:hover:translate-y-0 lg:hover:border-transparent lg:hover:shadow-none">
                {/* Header row — BIG numeral on left + icon-in-disk on
                    right. `lg:contents` removes the wrapper at lg so
                    the parent column's `items-end justify-between`
                    pushes the icon to the bottom-right per Figma. */}
                <div className="flex items-center justify-between gap-4 lg:contents">
                  <span
                    aria-hidden
                    className="text-h1 font-light leading-none tracking-[-1px] text-neutral-200 transition-colors duration-500 group-hover:text-brand lg:hidden"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    aria-hidden
                    className="relative flex size-[120px] shrink-0 items-center justify-center rounded-full bg-bg-subtle transition-[background-color,transform] duration-500 ease-out group-hover:scale-105 group-hover:bg-white sm:size-[132px] lg:size-[120px] lg:order-last lg:bg-transparent lg:group-hover:bg-transparent"
                  >
                    <img
                      src={f.icon}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="block size-[64%] object-contain transition-transform duration-500 ease-out group-hover:scale-110 group-hover:rotate-3 lg:size-full"
                    />
                  </span>
                </div>

                <div className="flex w-full flex-col gap-3 sm:gap-4">
                  <h3 className="text-title-lg text-neutral-900 transition-colors duration-300 group-hover:text-brand">
                    {f.title}
                  </h3>
                  <p className="text-body-sm text-neutral-500 transition-colors duration-300 group-hover:text-neutral-700">
                    {f.body}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
