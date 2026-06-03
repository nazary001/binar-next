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

// In-flow connector between discs. `justify-between` drops each one at the
// geometric midpoint of its disc-to-disc gap — exactly on the circles'
// connecting axis, like Figma — and it scales with the discs (20/24/32 px).
//
// `hideOnMobile`: the middle connector falls at a row edge in the mobile
// 2-up wrap (the 2 -> 3 step is the line break), so it is dropped there.
//
// `spacerOnLg`: the LAST connector. On lg, disc 4 carries a 40-px outer
// ring (a box-shadow) and the sparkle must sit ON that ring's stroke. A
// flex-positioned sparkle accumulates layout rounding from disc 1, so at
// fractional page-zoom (e.g. 1920px -> 1.333) it lands ~1.3 px off the
// ring, which is positioned relative to disc 4. So on lg this connector
// becomes an invisible spacer (it still reserves the 32-px gap) and the
// VISIBLE last sparkle is rendered as an absolute child of disc 4 instead
// (see RingSparkle) — same reference as the ring, so they round together
// at every zoom. Below lg there is no ring, so it shows normally.
function PlusConnector({
  hideOnMobile = false,
  spacerOnLg = false,
}: {
  hideOnMobile?: boolean;
  spacerOnLg?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`relative z-10 flex size-5 shrink-0 items-center justify-center text-brand md:size-6 lg:size-8 ${
        hideOnMobile ? "max-md:hidden" : ""
      } ${spacerOnLg ? "lg:invisible" : ""}`}
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
        {/* The sparkles are in-flow on EVERY breakpoint so they always
            land on the circles' connecting axis, like Figma:
              • < md  : a [1fr auto 1fr] grid — two disc columns with the
                        sparkle in the centre column, so it sits exactly
                        between the column-centred discs. It wraps to 2x2;
                        the middle (2 -> 3) connector is the line break, so
                        it is dropped via hideOnMobile (see PlusConnector).
                        The grid is width-capped + centred so the sparkle
                        stays close to the discs on wide phones instead of
                        floating. Four 113-px discs in one row can't hold
                        "Стабільний результат", so the 2x2 runs up to md.
              • md–lg : single nowrap flex row, discs flex-grow to share
                        space, sparkles centred in each gap (justify-between).
              • lg    : Figma row — fixed 235-px discs, 32-px sparkles,
                        last disc carries the 317-px outer ring. */}
        <ul className="mx-auto grid max-w-[480px] grid-cols-[1fr_auto_1fr] items-center justify-items-center gap-x-2 gap-y-6 md:mx-0 md:max-w-none md:flex md:flex-nowrap md:justify-between md:gap-x-1.5 md:gap-y-0 lg:gap-0">
          {STEPS.map((label, i) => {
            const isLast = i === STEPS.length - 1;
            return (
              <li key={label} className="contents">
                <div
                  className={`relative flex aspect-square w-full max-w-[180px] items-center justify-center md:w-auto md:min-w-0 md:max-w-[200px] md:flex-1 lg:size-[235px] lg:max-w-none lg:flex-none lg:shrink-0 ${
                    isLast
                      ? // Figma 1327:4615 — disc 4's 317-px outer ring (235 + 2x
                        // (40px offset + 1px stroke)). The last sparkle sits ON
                        // this ring's left stroke; it is rendered as an absolute
                        // child of this disc (RingSparkle) so it shares the ring's
                        // reference point and stays aligned at any page-zoom.
                        "lg:rounded-full lg:ring-1 lg:ring-stroke-default lg:ring-offset-[40px] lg:ring-offset-white"
                      : ""
                  }`}
                >
                  {/* Disc body: --colour/neutral/800 = #343435.
                      Label: Title/Small (Bold 16/22 +1%) white. p-5 keeps
                      room for "Стабільний результат" down to the ~145-px
                      md disc; lg bumps to 24 px for the 235-px disc. */}
                  <div className="flex aspect-square size-full items-center justify-center rounded-full bg-neutral-800 p-5 text-center lg:p-6">
                    <p className="text-title-sm text-white">{label}</p>
                  </div>
                  {/* lg-only: the last sparkle, pinned to disc 4's ring. */}
                  {isLast && <RingSparkle />}
                </div>
                {!isLast && (
                  <PlusConnector
                    hideOnMobile={i === 1}
                    spacerOnLg={i === STEPS.length - 2}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
