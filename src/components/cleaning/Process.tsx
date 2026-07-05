const STEPS = [
  "Аналіз потреб",
  "Підбір засобів",
  "Регулярні поставки",
  "Стабільний результат",
];

// 4-pointed sparkle glyph (Figma `Frame 1010106808`). Single path traced
// verbatim from the asset: symmetric arms tapering to points, centred at
// (16,16) of the 32x32 viewBox so the span's centre IS the glyph's centre.
function SparkleIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" className="size-full" aria-hidden>
      <path d="M24.7199 17.5291C26.272 17.1013 26.272 14.9002 24.72 14.4723L19.9505 13.1574C19.4123 13.0091 18.9918 12.5886 18.8434 12.0504L17.5284 7.28039C17.1005 5.72834 14.8995 5.72834 14.4716 7.28039L13.1566 12.0504C13.0082 12.5886 12.5877 13.0091 12.0495 13.1574L7.28005 14.4723C5.72796 14.9002 5.72801 17.1013 7.28012 17.5291L12.0499 18.8439C12.5881 18.9922 13.0086 19.4127 13.157 19.951L14.4716 24.7202C14.8994 26.2724 17.1006 26.2724 17.5284 24.7202L18.843 19.951C18.9914 19.4127 19.4119 18.9922 19.9501 18.8439L24.7199 17.5291Z" />
    </svg>
  );
}

// In-flow 32-px sparkle connector between discs. In the mobile vertical
// column it sits in the gap between stacked discs; on lg it sits in the
// gap of the horizontal row (justify-between), on the circles' connecting
// axis like Figma.
//
// `spacerOnLg`: the LAST connector. On lg, disc 4 carries a 40-px outer
// ring (a box-shadow) and the sparkle must sit ON that ring's stroke. A
// flex-positioned sparkle accumulates layout rounding from disc 1, so at
// fractional page-zoom (e.g. 1920px -> 1.333) it lands ~1.3 px off the
// ring, which is positioned relative to disc 4. So on lg this connector
// becomes an invisible spacer (it still reserves the 32-px gap) and the
// VISIBLE last sparkle is rendered as an absolute child of disc 4 instead
// (see RingSparkle) — same reference as the ring, so they round together
// at every zoom. Below lg it shows normally (the mobile ring is centred
// under the disc so the in-flow sparkle lands on its top arc).
function PlusConnector({ spacerOnLg = false }: { spacerOnLg?: boolean }) {
  return (
    <span
      aria-hidden
      className={`relative z-10 flex size-8 shrink-0 items-center justify-center text-brand ${
        spacerOnLg ? "lg:invisible" : ""
      }`}
    >
      <SparkleIcon />
    </span>
  );
}

// The last sparkle on lg, anchored to disc 4 so it stays exactly on the
// ring at any page-zoom. Disc 4 is `relative`; this sits at its left edge
// (`left-0`) pulled out to the ring's stroke centreline. That centreline
// is `ring-offset (40px) + half the 1px stroke (0.5px)` = 40.5 px outside
// disc 4; add half the 32-px sparkle (16px) → translate-x -56.5 px so the
// sparkle's CENTRE lands on it. Both this and the box-shadow ring measure
// from disc 4's box, so they round to the same device pixel together.
function RingSparkle() {
  return (
    <span
      aria-hidden
      className="absolute left-0 top-1/2 z-10 hidden size-8 -translate-x-[56.5px] -translate-y-1/2 items-center justify-center text-brand lg:flex"
    >
      <SparkleIcon />
    </span>
  );
}

export function CleaningProcess() {
  // Figma 1327:4609 has NO left/right border on the section — the
  // bordered-card stack ends at Benefits, so this section sits flush
  // against the page background without the hairline outline.
  return (
    <section className="lg-pad-x bg-white px-6 py-[60px] sm:px-10 sm:py-20 lg:py-[160px]">
      <div className="flex flex-col gap-12 lg:gap-[168px]">
        <div className="flex flex-col items-start justify-between gap-6 sm:gap-8 lg:flex-row lg:gap-8">
          <h2 className="flex-1 max-w-[574px] text-neutral-900">
            <span className="text-h2">Гігієна як система,</span>
            <span className="text-h2-light"> а не хаотичні закупівлі</span>
          </h2>
          {/* The Figma master (3165:8597) renders this as one 6-line
              block; the browser's Manrope metrics wrap it into 7, so the
              designer's exact line breaks are forced below lg. At lg the
              brs vanish and the copy flows naturally in the 574 column. */}
          <p className="flex-1 max-w-[574px] text-body-sm text-neutral-500">
            {"Ми допомагаємо вибудувати логіку забезпечення "}
            <br aria-hidden className="lg:hidden" />
            {"гігієни на об'єкті: від підбору засобів і інвентарю до "}
            <br aria-hidden className="lg:hidden" />
            {/* Browser Manrope runs ~6px wider than Figma on this line;
                an imperceptible -0.15px tracking keeps it to one line. */}
            <span className="max-lg:tracking-[-0.15px]">
              {"регулярних поставок та повторюваного стандарту. "}
            </span>
            <br aria-hidden className="lg:hidden" />
            {"Це зменшує витрати, прибирає “людський фактор” "}
            <br aria-hidden className="lg:hidden" />
            {"і дає стабільний результат — у номерах, кухні, "}
            <br aria-hidden className="lg:hidden" />
            {"санвузлах і зонах загального користування."}
          </p>
        </div>

        {/* Figma 1327:4614 — four 235 x 235 dark discs (#343435 =
            Colour/Neutral/800) joined by 32-px orange sparkles. The LAST
            disc has a 317 x 317 outer ring (Stroke/Default #8e8e8f, ~40 px
            offset) marking "Стабільний результат" as the flow's endpoint.
            Discs are perfect circles, white Title/Small label centred.

            Layout differs by master:
              • < lg : Figma MOBILE master (3166:4459) — a single centred
                       VERTICAL column. Discs stay 235 px, sparkles sit in
                       the 24-px gaps (the sparkle centre lands exactly on
                       disc 4's ring top arc, 40 px above disc 4).
              • lg   : Figma 1440 row — fixed 235-px discs, justify-between,
                       last disc carries the 317-px outer ring (the in-flow
                       last sparkle is swapped for the absolute RingSparkle
                       so it stays glued to the ring at fractional zoom). */}
        {/* gap-[25px]: the Figma mobile column stacks the discs at a
            317.44px pitch = 235.44 disc + 25 + 32 sparkle + 25. */}
        <ul className="flex flex-col items-center gap-[25px] lg:flex-row lg:flex-nowrap lg:justify-between lg:gap-0">
          {STEPS.map((label, i) => {
            const isLast = i === STEPS.length - 1;
            return (
              <li key={label} className="contents">
                <div
                  className={`relative flex size-[235px] shrink-0 items-center justify-center ${
                    isLast
                      ? "rounded-full ring-1 ring-stroke-default ring-offset-[40px] ring-offset-white"
                      : ""
                  }`}
                >
                  {/* Disc body: --colour/neutral/800 = #343435.
                      Label: Title/Small (Bold 16/22 +1%) white. */}
                  <div className="flex aspect-square size-full items-center justify-center rounded-full bg-neutral-800 p-6 text-center">
                    <p className="text-title-sm text-white">{label}</p>
                  </div>
                  {/* lg-only: the last sparkle, pinned to disc 4's ring. */}
                  {isLast && <RingSparkle />}
                </div>
                {!isLast && <PlusConnector spacerOnLg={i === STEPS.length - 2} />}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
