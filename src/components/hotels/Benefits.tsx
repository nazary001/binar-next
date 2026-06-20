/* eslint-disable @next/next/no-img-element */
import { Fragment } from "react";

// Figma node 1384:11641 (Що ви отримуєте?, 1440 x 1256). The master
// is a STATIC grid — no hover transitions, no animated reveals, no
// numbered badges, no mobile card chrome. Each Block is just a
// title + body + icon column sitting between hairline dividers.
const FEATURES = [
  {
    title: "Стабільне постачання без зривів",
    body: "Щоб витратні матеріали завжди були в наявності, коли вони потрібні.",
    icon: "/figma-export/why-us/icon-purchases.svg",
  },
  {
    title: "Прогнозовану якість у кожній поставці",
    body: "Постійні характеристики товарів і контроль якості, без сюрпризів між партіями.",
    icon: "/figma-export/hotels/icon-quality.svg",
  },
  {
    title: "Альтернативи під ваш бюджет",
    body: "Підбираємо оптимальне співвідношення ціни та характеристик.",
    icon: "/figma-export/hotels/icon-budget.svg",
  },
  {
    title: "Швидкі терміни для складських позицій",
    body: "Оперативно закриваємо стандартні закупівлі.",
    icon: "/figma-export/hotels/icon-fast.svg",
  },
  {
    title: "Кастомізацію під бренд готелю",
    body: "Брендовані рішення, які підсилюють сервіс і враження гостей.",
    icon: "/figma-export/why-us/icon-custom.svg",
  },
  {
    title: "Зберігання кастомізованої продукції та поставки партіями",
    body: "Можемо зберігати ваш кастомізований запас на наших складах і відвантажувати за графіком.",
    icon: "/figma-export/hotels/icon-storage.svg",
  },
];

type Feature = (typeof FEATURES)[number];

// Figma 1384:11645 Block — `flex-col h-[344px] items-end justify-
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

export function HotelBenefits() {
  return (
    // Figma 1384:11641 — `px-[130px] py-[160px]` (lg-pad-x = 130) with
    // a 120-px gap between the heading row and the grid frame. Mobile
    // master 3117:14416 — `px-[24px] py-[60px]`.
    <section className="lg-pad-x bg-white px-6 py-[60px] sm:px-10 sm:py-20 lg:py-[160px]">
      <div className="flex flex-col gap-12 sm:gap-16 lg:gap-[120px]">
        {/* Figma 1384:11642 — "Що ви " Light 44 / "отримуєте?" Bold 44,
            w 574 at lg. */}
        <h2 className="text-neutral-900 lg:w-[574px]">
          <span className="text-h2-light">Що ви </span>
          <span className="text-h2">отримуєте?</span>
        </h2>

        {/* Mobile / tablet — Figma master 3117:14419 "Card": a single
            centered column of 340-wide Blocks, gap-[24px] between cards.
            Each Block (3117:14424) is `bg-bg-subtle flex flex-col
            gap-[40px] items-start p-[24px] rounded-[32px]` with the
            120-px icon ON TOP, then the Title+body group (gap-[12px],
            title 22/28 SemiBold, body 14/20 subtle). No numbered badge
            and no 2-col grid in the master. */}
        <ul className="mx-auto flex w-[340px] max-w-full flex-col items-center gap-6 lg:hidden">
          {FEATURES.map((f) => (
            <li key={f.title} className="w-full">
              <article className="flex w-full flex-col items-start gap-10 rounded-[32px] bg-bg-subtle p-6">
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
                <div className="flex w-full flex-col gap-3">
                  <h3 className="text-title-lg text-neutral-900">{f.title}</h3>
                  <p className="text-body-sm text-neutral-500">{f.body}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>

        {/* lg+ — exact Figma 1384:11643 structure. The outer frame is
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

            Divider colors per Figma 1384:11641 variables: the four
            in-row vertical Vectors (1384:11646 / 11648 / 11653 / 11655)
            use `Stroke/Subtle` #d2d2d2, while the single horizontal
            mid-row Vector 68 (1384:11650) uses `Stroke/Default`
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
