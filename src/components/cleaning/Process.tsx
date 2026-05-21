import { Reveal } from "@/components/ui/Reveal";

const STEPS = [
  "Аналіз потреб",
  "Підбір засобів",
  "Регулярні поставки",
  "Стабільний результат",
];

function PlusConnector({ delay }: { delay: number }) {
  return (
    <span
      aria-hidden
      className="animate-chevron-drift hidden size-6 shrink-0 items-center justify-center text-brand lg:flex"
      style={{ animationDelay: `${delay}ms` }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-full">
        <path
          d="M12 4v16M4 12h16"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function CleaningProcess() {
  return (
    <section className="lg-pad-x bg-white px-5 py-16 sm:px-10 sm:py-20 lg:border-l lg:border-r lg:border-stroke-default lg:py-[160px]">
      <div className="flex flex-col gap-10 sm:gap-12 lg:gap-[120px]">
        <div className="flex flex-col items-start justify-between gap-6 sm:gap-8 lg:flex-row lg:gap-8">
          <h2 className="flex-1 max-w-[574px] text-neutral-900">
            <span className="text-h2">Гігієна як система,</span>
            <span className="text-h2-light"> а не хаотичні закупівлі</span>
          </h2>
          <p className="flex-1 max-w-[574px] text-body-md text-neutral-500">
            {`Ми допомагаємо вибудувати логіку забезпечення гігієни на об'єкті:
            від підбору засобів і інвентарю до регулярних поставок та
            повторюваного стандарту. `}
            <br />
            {`Це зменшує витрати, прибирає «людський фактор» і дає
            стабільний результат — у номерах, кухні, санвузлах і зонах
            загального користування.`}
          </p>
        </div>

        {/* Figma 1327:4609 — four dark filled discs (#343435) connected
            by orange `+` symbols. The LAST disc has a thin grey outer
            ring (active state) hinting "Стабільний результат" is the
            endpoint. Discs are perfect circles (~235 px on lg), white
            label centred. Mobile collapses to a 2-col grid because four
            full-size discs in a row exceed the viewport. */}
        <ul className="grid grid-cols-2 items-center justify-items-center gap-4 sm:grid-cols-4 sm:gap-6 lg:flex lg:flex-nowrap lg:items-center lg:justify-between lg:gap-0">
          {STEPS.map((label, i) => {
            const isLast = i === STEPS.length - 1;
            return (
              <li key={label} className="contents">
                <Reveal
                  delay={i * 130}
                  className={`relative flex aspect-square w-full max-w-[180px] items-center justify-center sm:max-w-[200px] lg:max-w-[235px] ${
                    isLast
                      ? "rounded-full ring-1 ring-stroke-default ring-offset-[10px] ring-offset-white"
                      : ""
                  }`}
                >
                  <div className="group flex aspect-square size-full items-center justify-center rounded-full bg-[#343435] p-6 text-center transition-all duration-500 hover:-translate-y-1 hover:bg-neutral-900 hover:shadow-md sm:p-7 lg:p-8">
                    <p className="text-button-lg text-white transition-colors duration-300 group-hover:text-brand">
                      {label}
                    </p>
                  </div>
                </Reveal>
                {i < STEPS.length - 1 && <PlusConnector delay={i * 200} />}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
