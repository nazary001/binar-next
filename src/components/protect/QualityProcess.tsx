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

function BulletDot() {
  return (
    <span
      aria-hidden
      className="mt-[7px] inline-flex size-[8px] shrink-0 items-center justify-center rounded-full bg-neutral-900"
    />
  );
}

export function ProtectQualityProcess() {
  return (
    <section className="lg-pad-x bg-white px-5 py-16 sm:px-10 sm:py-20 lg:border-l lg:border-r lg:border-stroke-default lg:py-[160px]">
      <div className="flex flex-col gap-12 sm:gap-16 lg:gap-[120px]">
        <div className="flex flex-col gap-6 sm:gap-8 lg:flex-row lg:items-start lg:gap-8">
          <h2 className="flex-1 text-neutral-900">
            <span className="text-h2">Стабільна якість і відповідність вимогам</span>
            <span className="text-h2-light"> — у кожній поставці</span>
          </h2>
          <p className="flex-1 max-w-[560px] text-body-md text-neutral-500">
            У засобах індивідуального захисту важливо не просто закупити товар,
            а отримувати однаковий результат у кожній партії — без ризиків для
            процесів, персоналу і перевірок.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-12 lg:grid-cols-3 lg:gap-x-10 [&>li]:lg:border-l [&>li]:lg:border-stroke-subtle [&>li]:lg:px-10 [&>li:first-child]:lg:border-l-0 [&>li:first-child]:lg:pl-0 [&>li:last-child]:lg:pr-0">
          {BLOCKS.map((b) => (
            <li
              key={b.number}
              className="group/block flex flex-col gap-4 py-4 transition-transform duration-500 hover:-translate-y-1 sm:gap-6 sm:py-6"
            >
              <p
                aria-hidden
                className="text-h1 text-neutral-900 transition-colors duration-300 group-hover/block:text-brand"
              >
                {b.number}
              </p>
              <h3 className="text-title-lg text-neutral-900 transition-colors duration-300 group-hover/block:text-brand">
                {b.title}
              </h3>
              <ul className="flex flex-col gap-3 sm:gap-4">
                {b.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="group/bullet flex items-start gap-2 transition-transform duration-300 hover:translate-x-1"
                  >
                    <BulletDot />
                    <span className="text-body-sm text-neutral-500 transition-colors duration-300 group-hover/bullet:text-neutral-900">
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
