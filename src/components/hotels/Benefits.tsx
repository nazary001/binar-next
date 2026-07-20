/* eslint-disable @next/next/no-img-element */
import { Fragment } from "react";

// Figma node 1384:11641 (Що ви отримуєте?, 1440 x 1256). The master
// is a STATIC grid — no hover transitions, no animated reveals, no
// numbered badges, no mobile card chrome. Each Block is just a
// title + body + icon column sitting between hairline dividers.
//
// Each icon's `box` is the glyph's EXACT geometry inside the Figma
// 120x120 "Block icons" frame. The three hotels/* SVGs are edge-to-edge
// exports (viewBox == glyph bbox incl. stroke bleed) - the old
// `object-contain` into the full 120 box rendered them ~20% oversized.
// The why-us/* files bake the whole 120 frame, so their box IS the
// container.
const FEATURES = [
  {
    title: "Стабільне постачання без зривів",
    body: "Щоб витратні матеріали завжди були в наявності, коли вони потрібні.",
    icon: "/figma-export/why-us/icon-purchases.svg",
    box: { width: "120px", height: "120px", left: "0px", top: "0px" },
  },
  {
    title: "Прогнозовану якість у кожній поставці",
    body: "Постійні характеристики товарів і контроль якості, без сюрпризів між партіями.",
    icon: "/figma-export/hotels/icon-quality.svg",
    // Figma glyph 91.716 x 97.62 at (11.32, 9.19) + top/right/bottom bleed.
    box: { width: "92.219px", height: "98.627px", left: "11.32px", top: "8.69px" },
  },
  {
    title: "Альтернативи під ваш бюджет",
    body: "Підбираємо оптимальне співвідношення ціни та характеристик.",
    icon: "/figma-export/hotels/icon-budget.svg",
    // Figma glyph 93.036 x 96 centred (+0.91, -1) + left/bottom bleed.
    box: { width: "93.536px", height: "96.5px", left: "13.89px", top: "11px" },
  },
  {
    title: "Швидкі терміни для складських позицій",
    body: "Оперативно закриваємо стандартні закупівлі.",
    icon: "/figma-export/hotels/icon-fast.svg",
    // Figma glyph 103.037 x 110.11 centred (y +0.05) + left bleed.
    box: { width: "103.537px", height: "110.11px", left: "7.98px", top: "5px" },
  },
  {
    title: "Кастомізацію під бренд готелю",
    body: "Брендовані рішення, які підсилюють сервіс і враження гостей.",
    icon: "/figma-export/why-us/icon-custom.svg",
    box: { width: "120px", height: "120px", left: "0px", top: "0px" },
  },
  {
    title: "Зберігання кастомізованої продукції та поставки партіями",
    // Figma block 3117:14439 uses the "Гарантія задоволеності" smiley
    // speech-bubble + sparkles icon here (not a storage glyph). The
    // hotels master renders this instance ~5% smaller than the home
    // WhyUs one (ink 97x101 at (13,11) vs the baked file's 103x104 at
    // (5,11)), so the baked 120-frame is scaled to 114 and offset to
    // land the ink on the master's box.
    body: "Можемо зберігати ваш кастомізований запас на наших складах і відвантажувати за графіком.",
    icon: "/figma-export/why-us/icon-guarantee.svg",
    box: { width: "114px", height: "114px", left: "8.3px", top: "0.6px" },
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
      {/* Figma I*:230:1665 — 120-px icon container; the glyph renders
          at its exact master size/offset (f.box). */}
      <span
        aria-hidden
        className="relative block size-[120px] shrink-0 overflow-clip"
      >
        <img
          src={f.icon}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute block max-w-none"
          style={f.box}
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
            and no 2-col grid in the master. The column is the Figma 342-px
            content width (390 - 2*24 gutter). */}
        <ul className="mx-auto flex w-[342px] max-w-full flex-col items-center gap-6 lg:hidden">
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
                    className="absolute block max-w-none"
                    style={f.box}
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
