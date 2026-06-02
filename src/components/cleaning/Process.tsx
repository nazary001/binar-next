const STEPS = [
  "Аналіз потреб",
  "Підбір засобів",
  "Регулярні поставки",
  "Стабільний результат",
];

// Figma 1327:4619 / 4623 / 4627 — the connector between discs. Each
// is a 32 x 32 frame holding a single-path 4-pointed sparkle filled
// brand orange. Path traced verbatim from the Figma asset
// (`Frame 1010106808`) so the centred star renders identical to the
// master: symmetric arms tapering to points, with bulging cubic curves
// rather than flat plus rectangles.
//
// All three sparkles use the same DOM/layout — `justify-between` on
// the row puts each one at the geometric midpoint of its disc-to-disc
// gap (x=275 / 590 / 905 on the 1180-wide master). The LAST sparkle
// (between disc 3 and disc 4) lands at x=905 which is exactly the
// left edge of disc 4's outer ring — that's where Figma puts it, on
// the ring's axis. No special-case translate.
function PlusConnector() {
  return (
    // `relative z-10` lifts the sparkle above disc 4's outer ring. In
    // Figma the ring is the first child of the row frame (bottom of
    // the stacking order), so the sparkle between disc 3 and disc 4
    // paints on top of the ring even though their visual bounds
    // intersect. In our DOM the ring lives on the last flex item
    // (disc 4) which renders AFTER the sparkle, so without an
    // explicit z-index the ring would cover the sparkle's right half.
    // Same z-index on every connector keeps the markup uniform.
    <span
      aria-hidden
      className="relative z-10 hidden size-8 shrink-0 items-center justify-center text-brand lg:flex"
    >
      <svg
        viewBox="0 0 32 32"
        fill="currentColor"
        className="size-full"
        aria-hidden
      >
        <path d="M24.7199 17.5291C26.272 17.1013 26.272 14.9002 24.72 14.4723L19.9505 13.1574C19.4123 13.0091 18.9918 12.5886 18.8434 12.0504L17.5284 7.28039C17.1005 5.72834 14.8995 5.72834 14.4716 7.28039L13.1566 12.0504C13.0082 12.5886 12.5877 13.0091 12.0495 13.1574L7.28005 14.4723C5.72796 14.9002 5.72801 17.1013 7.28012 17.5291L12.0499 18.8439C12.5881 18.9922 13.0086 19.4127 13.157 19.951L14.4716 24.7202C14.8994 26.2724 17.1006 26.2724 17.5284 24.7202L18.843 19.951C18.9914 19.4127 19.4119 18.9922 19.9501 18.8439L24.7199 17.5291Z" />
      </svg>
    </span>
  );
}

export function CleaningProcess() {
  // Figma 1327:4609 has NO left/right border on the section — the
  // bordered-card stack ends at Benefits, so this section sits flush
  // against the page background without the hairline outline.
  return (
    <section className="lg-pad-x bg-white px-5 py-16 sm:px-10 sm:py-20 lg:py-[160px]">
      <div className="flex flex-col gap-10 sm:gap-12 lg:gap-[168px]">
        <div className="flex flex-col items-start justify-between gap-6 sm:gap-8 lg:flex-row lg:gap-8">
          <h2 className="flex-1 max-w-[574px] text-neutral-900">
            <span className="text-h2">Гігієна як система,</span>
            <span className="text-h2-light"> а не хаотичні закупівлі</span>
          </h2>
          <p className="flex-1 max-w-[574px] text-body-sm text-neutral-500">
            {`Ми допомагаємо вибудувати логіку забезпечення гігієни на об'єкті:
            від підбору засобів і інвентарю до регулярних поставок та
            повторюваного стандарту. `}
            <br />
            {`Це зменшує витрати, прибирає «людський фактор» і дає
            стабільний результат — у номерах, кухні, санвузлах і зонах
            загального користування.`}
          </p>
        </div>

        {/* Figma 1327:4614 (Frame 1010106805) — four 235 x 235 dark discs
            (#343435 = Colour/Neutral/800) connected by 32-px orange
            sparkles. The LAST disc has a 317 x 317 outer ring (Stroke/
            Default #8e8e8f, ~40 px offset all around) hinting that
            "Стабільний результат" is the endpoint of the flow. Discs are
            perfect circles, white Title/Small label centred (Bold 16/22
            +1% letter-spacing). Mobile collapses to a 2-col grid because
            four full-size discs in a row exceed the viewport. */}
        <ul className="grid grid-cols-2 items-center justify-items-center gap-4 sm:grid-cols-4 sm:gap-6 lg:flex lg:flex-nowrap lg:items-center lg:justify-between lg:gap-0">
          {STEPS.map((label, i) => {
            const isLast = i === STEPS.length - 1;
            return (
              <li key={label} className="contents">
                <div
                  className={`relative flex aspect-square w-full max-w-[180px] items-center justify-center sm:max-w-[200px] lg:size-[235px] lg:max-w-none lg:shrink-0 ${
                    isLast
                      ? "lg:rounded-full lg:ring-1 lg:ring-stroke-default lg:ring-offset-[40px] lg:ring-offset-white"
                      : ""
                  }`}
                >
                  {/* Disc body: --colour/neutral/800 = #343435.
                      Label: Title/Small (Bold 16/22 +1%) white.
                      lg padding reduced from 32 -> 24 px so the longest
                      label "Стабільний результат" fits on a single line
                      inside the 235-px disc (lg:p-8 left 171 px for the
                      label, not enough at 16-px Title/Small). */}
                  <div className="flex aspect-square size-full items-center justify-center rounded-full bg-neutral-800 p-5 text-center sm:p-6 lg:p-6">
                    <p className="text-title-sm text-white">{label}</p>
                  </div>
                </div>
                {i < STEPS.length - 1 && <PlusConnector />}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
