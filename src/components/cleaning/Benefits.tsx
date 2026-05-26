/* eslint-disable @next/next/no-img-element */
import { Fragment } from "react";
import { Button } from "@/components/ui/Button";

// Figma node 1327:4490 (Що ви отримуєте?, 1440 x 1260). The master
// is a STATIC grid — no hover transitions, no animated reveals, no
// numbered badges, no mobile card chrome. Each Block is just a
// title + body + icon column sitting between hairline dividers.
//
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

type Feature = (typeof FEATURES)[number];

// Figma 1327:4496 Block — `flex-col h-[344px] items-end justify-
// between py-[24px]`. Title+body at the top (left-aligned, full
// width), 120-px icon at the bottom pinned to the right via items-end.
function Block({ f }: { f: Feature }) {
  return (
    <article className="flex min-h-[344px] flex-1 min-w-0 flex-col items-end justify-between py-6">
      <div className="flex w-full flex-col gap-4">
        <h3 className="text-title-lg text-neutral-900">{f.title}</h3>
        <p className="text-body-sm text-neutral-500">{f.body}</p>
      </div>
      {/* Figma I*:230:1665 — 120-px icon container, SVG fills via
          object-contain so each glyph respects whatever inner inset
          the asset bakes in. */}
      <span
        aria-hidden
        className="relative block size-[120px] shrink-0 overflow-clip"
      >
        <img
          src={f.icon}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-contain"
        />
      </span>
    </article>
  );
}

export function CleaningBenefits() {
  return (
    // Figma 1327:4490 — `px-[130px] py-[160px]` (lg-pad-x = 130) with
    // a 120-px gap between the heading row and the grid frame. Section
    // gets lg:border-l/r so it visually connects with the rounded-top
    // section above on the cleaning page.
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

        {/* Mobile / tablet — Figma master defines no layout here, so
            we adapt the home/WhyUs card pattern: bg-bg-subtle card with
            rounded corners + padding + numbered badge in the top-right.
            Gives every feature a proper card chrome instead of reading
            as a flat icon+text list. Matches the same treatment used on
            /hotels Benefits for cross-page mobile consistency. */}
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 lg:hidden">
          {FEATURES.map((f, i) => (
            <li key={f.title}>
              <article className="relative flex h-full w-full flex-col-reverse items-start gap-5 rounded-[24px] bg-bg-subtle p-6 sm:gap-6 sm:rounded-[28px] sm:p-7">
                <span
                  aria-hidden
                  className="absolute right-5 top-5 font-mono text-[12px] font-medium tracking-[0.18em] text-neutral-300 sm:right-6 sm:top-6 sm:text-[13px]"
                >
                  {String(i + 1).padStart(2, "0")}
                  <span className="text-neutral-200">
                    {" "}
                    / {String(FEATURES.length).padStart(2, "0")}
                  </span>
                </span>
                <div className="flex w-full flex-col gap-3 sm:gap-4">
                  <h3 className="text-title-lg text-neutral-900">{f.title}</h3>
                  <p className="text-body-sm text-neutral-500">{f.body}</p>
                </div>
                <span
                  aria-hidden
                  className="relative block size-[88px] shrink-0 overflow-clip sm:size-[96px]"
                >
                  <img
                    src={f.icon}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 size-full object-contain"
                  />
                </span>
              </article>
            </li>
          ))}
        </ul>

        {/* lg+ — exact Figma 1327:4494 structure. The outer frame is
            `flex-col gap-[40px]` and holds 3 children:
              • Row 1 (flex gap-[40px] items-start) — Block, divider,
                Block, divider, Block. Each block is 340 wide, each
                divider is a 0-width vertical vector. The 40-px flex
                gap repeats AROUND each divider, so the divider sits
                exactly 40 px from the adjacent block on either side
                — placing it at x=380 / x=800 in the 1180-px grid
                (matches Figma Vector 67 positions).
              • Horizontal divider Vector 68 — full-width 1-px line.
              • Row 2 — identical to row 1, blocks 4 / 5 / 6.

            Divider colors per Figma 1327:4490 variables: the four
            in-row vertical Vectors (1327:4497 / 4499 / 4504 / 4506)
            use `Stroke/Subtle` #d2d2d2, while the single horizontal
            mid-row Vector 68 (1327:4501) uses `Stroke/Default`
            #8e8e8f — the darker line splits the grid in half and the
            lighter verticals subdivide each row. */}
        <div className="hidden flex-col gap-10 lg:flex">
          {[0, 3].map((rowStart, rowIdx) => (
            <Fragment key={rowStart}>
              <div className="flex items-stretch gap-10">
                {FEATURES.slice(rowStart, rowStart + 3).map((f, i) => (
                  <Fragment key={f.title}>
                    {i > 0 && (
                      <div
                        aria-hidden
                        className="w-px self-stretch bg-stroke-subtle"
                      />
                    )}
                    <Block f={f} />
                  </Fragment>
                ))}
              </div>
              {rowIdx === 0 && (
                <div
                  aria-hidden
                  className="h-px w-full bg-stroke-default"
                />
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
