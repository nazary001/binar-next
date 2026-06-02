type Block = {
  number: string;
  title: string;
  bullets: string[];
};

const BLOCKS: Block[] = [
  {
    number: "01.",
    title: "Що це дає вашому бізнесу",
    bullets: [
      "Однакова якість у кожній поставці — без «сюрпризів» між партіями",
      "Відповідність вашим стандартам і внутрішнім регламентам",
      "Зниження ризиків для виробництва, персоналу та перевірок",
      "Передбачуваний результат у роботі, незалежно від обсягів",
    ],
  },
  {
    number: "02.",
    title: "Як ми це забезпечуємо",
    bullets: [
      "Працюємо за узгодженими специфікаціями",
      "Фіксуємо вимоги та підбираємо рішення під ваші умови роботи",
      "Контролюємо відповідність кожної партії погодженим параметрам",
      "За потреби допомагаємо сформувати специфікацію «з нуля»",
    ],
  },
  {
    number: "03.",
    title: "Документи і контроль якості",
    bullets: [
      "Надаємо повний пакет документів залежно від сфери",
      "Працюємо за системою менеджменту якості ISO 9001",
      "Контролюємо постачання на всіх етапах — від виробника до відвантаження",
      "Забезпечуємо прозору та перевірювану якість, а не «на словах»",
    ],
  },
];

// Figma 1327:3944 "Dot" — a 24x24 box with an 8x8 brand-orange ellipse
// centered inside. Wrapping the 8 px dot in a 24-square box keeps the
// dot baseline-aligned with the first line of the bullet copy (24 px
// is the body-sm line-height), so the dot reads as visually centered
// against the text cap height instead of sitting too high.
function BulletDot() {
  return (
    <span
      aria-hidden
      className="inline-flex size-[24px] shrink-0 items-center justify-center"
    >
      <span className="block size-[8px] rounded-full bg-brand" />
    </span>
  );
}

export function ProtectQualityProcess() {
  return (
    <section className="lg-pad-x bg-white px-5 py-16 sm:px-10 sm:py-20 lg:border-l lg:border-r lg:border-stroke-default lg:py-[160px]">
      <div className="flex flex-col gap-12 sm:gap-16 lg:gap-[120px]">
        <div className="flex flex-col gap-6 sm:gap-8 lg:flex-row lg:items-start lg:gap-8">
          <h2 className="flex-1 lg:w-[574px] text-neutral-900">
            <span className="text-h2">Стабільна якість і відповідність вимогам</span>
            <span className="text-h2-light"> — у кожній поставці</span>
          </h2>
          <p className="flex-1 lg:w-[574px] text-body-sm text-neutral-500">
            У засобах індивідуального захисту важливо не просто закупити товар,
            а отримувати однаковий результат у кожній партії — без ризиків для
            процесів, персоналу і перевірок.
          </p>
        </div>

        {/* Figma 1327:3936/1327:3937 — 3 equal 340 px blocks with 80 px
            gaps and hairline vertical dividers centred in each gap
            (Vector67 at x=380, Vector67 at x=800 on the 1180 master).
            The divider is rendered as an absolutely-positioned
            `<span>` 40 px to the left of each non-first li so it sits
            exactly in the middle of the 80 grid gap. Grid's default
            `align-items: stretch` makes every cell match the tallest
            block's natural height, so `h-full` on the divider spans
            the whole row — matching Figma where Vector67 is
            `self-stretch`. */}
        <ul className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-12 lg:grid-cols-3 lg:gap-y-0 lg:gap-x-[80px]">
          {BLOCKS.map((b, i) => (
            <li
              key={b.number}
              className="relative flex flex-col gap-4 py-4 sm:gap-6 sm:py-6"
            >
              {i > 0 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -left-10 top-0 hidden h-full w-px bg-stroke-subtle lg:block"
                />
              )}
              <p aria-hidden className="w-[95px] text-h1 text-neutral-900">
                {b.number}
              </p>
              <h3 className="text-title-lg text-neutral-900">{b.title}</h3>
              <ul className="flex flex-col gap-3 sm:gap-4">
                {b.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-2"
                  >
                    <BulletDot />
                    <span className="text-body-sm text-neutral-500">
                      {bullet}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
