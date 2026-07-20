"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";

// Figma 1870:6180 - "Як відбувається співпраця?" (1440x729). The Figma
// component is literally named "Animation" (1589:11504); its "Default"
// frame shows step 01 active and the intent is a looping walk through the
// 6 steps.
//
// We auto-cycle the active step (0 -> 5 -> loop): the big "0N. Name"
// headline (top-left) reveals up on each change while the large orange
// hex tracks the active step's column and the rest stay small + grey.
// Labels are NOT tinted orange - the Figma headline is neutral, only the
// hex is brand. The loop pauses while the pointer is over the section (so
// a step can be read / clicked) and while the section is scrolled out of
// view; clicking a step still jumps to it.

const STEPS = [
  "Запит",
  "Підбір",
  "Прорахунок",
  "Зразки",
  "Виробництво",
  "Поставка",
];

// % of section width — matches Figma 1589:11504 polygon positions.
// In Figma each hex wrapper sits at left:SLOT_X with width equal to the
// hex's own visual size (24 for active, 10 for small), so the hex's LEFT
// edge aligns with the slot — NOT the hex centre. We therefore offset
// the marker centre half-its-visual-width to the right of the slot.
const SLOT_X = [
  "9.03%",
  "23.06%",
  "37.08%",
  "51.11%",
  "65.14%",
  "79.17%",
];

const LINE_TOP = 188; // y-px within the 200-px animation row
const LABEL_TOP = 130; // y-px for the small step label baseline
const ACTIVE_HEX_HALF = 12; // half of the 24-px-wide active hex bbox
const SMALL_HEX_HALF = 5; // half of the 10-px-wide small hex bbox

// Motion tuning. SLIDE_MS is the glide of the orange hex + the growth of
// the orange progress line between steps; STEP_MS is how long each step
// holds. Expo-out easing gives a premium, decelerating glide.
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const SLIDE_MS = 700;
const STEP_MS = 2800;

// Active marker — Polygon 23 (20.78×24) rotated -90° to point left/right.
// Rendered inside a centered flex parent, so the SVG itself has no
// translate of its own.
function ActiveHex() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20.7846 24"
      className="block h-6 w-[20.78px] -rotate-90 fill-brand"
    >
      <path d="M10.3923 0L20.7846 6V18L10.3923 24L0 18V6L10.3923 0Z" />
    </svg>
  );
}

// Mobile step label that always stays on ONE line. The big active state
// (40px) does not fit every step name at narrow widths ("05. Виробництво"
// needs ~309px against the ~286px column on a 390 screen — the Figma
// master only ever shows the short "Запит" active), and OS-level enlarged
// text makes even short names overflow, wrapping a stray letter or the
// dot to a new line. Instead of letting it wrap, the label measures
// itself and shrinks its font-size just enough to fit; line-height stays
// FIXED (46/28) so the row rhythm, the dot rail and the 48px gaps never
// move. Re-fits on resize (rotation), on font load, and on every
// active-step change; steps that already fit render at the exact Figma
// sizes untouched.
function FitStepLabel({
  num,
  name,
  active,
}: {
  num: string;
  name: string;
  active: boolean;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const text = textRef.current;
    if (!wrap || !text) return;
    const fit = () => {
      text.style.fontSize = ""; // measure at the class-defined size first
      const avail = wrap.clientWidth;
      const need = text.scrollWidth;
      if (avail > 0 && need > avail) {
        const base = parseFloat(getComputedStyle(text).fontSize);
        text.style.fontSize = `${Math.floor(base * (avail / need) * 100) / 100}px`;
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => ro.disconnect();
  }, [num, name, active]);

  return (
    // flex-1 + min-w-0 pins the wrapper to the space the row actually
    // has (dot + 32px gap already taken), independent of its content —
    // that width is what the label is fitted against.
    <span ref={wrapRef} className="min-w-0 flex-1">
      {active ? (
        <span
          ref={textRef}
          className="flex items-baseline gap-2 whitespace-nowrap text-[40px] leading-[46px] tracking-[-0.8px] text-neutral-900 animate-[reveal-up_400ms_cubic-bezier(0.22,1,0.36,1)_both]"
        >
          <span className="font-semibold tabular-nums">{num}</span>
          <span className="font-light">{name}</span>
        </span>
      ) : (
        <span
          ref={textRef}
          className="flex items-baseline gap-1 whitespace-nowrap text-[22px] leading-[28px] tracking-[0.22px] text-neutral-500"
        >
          <span className="tabular-nums">{num}</span>
          <span>{name}</span>
        </span>
      )}
    </span>
  );
}

// Inactive marker — Polygon 18 (8.66×10) rotated -90°.
function SmallHex() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 8.66026 10"
      className="block h-[10px] w-[8.66px] -rotate-90 fill-neutral-900"
    >
      <path d="M4.33013 0L8.66025 2.5V7.5L4.33013 10L0 7.5V2.5L4.33013 0Z" />
    </svg>
  );
}

export function HowItWorks() {
  // First paint matches Figma's "Default" variant (step 01 active). We
  // track `active` and `prev` (the OUTGOING step) in one state object so
  // the headline can crossfade between them. `goTo` and the loop both
  // carry the old active into `prev` (prev === active = no exit).
  const [{ active, prev }, setStep] = useState({ active: 0, prev: 0 });
  const goTo = (i: number) => setStep((s) => ({ active: i, prev: s.active }));
  const sectionRef = useRef<HTMLElement>(null);
  const pausedRef = useRef(false); // pointer is over the section
  const visibleRef = useRef(false); // section is in the viewport

  // Loop the active step. Refs (not state) gate each tick so the single
  // interval never re-creates and never goes stale. Respects
  // prefers-reduced-motion (no auto-advance; the steps stay clickable).
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (pausedRef.current || !visibleRef.current) return;
      setStep((s) => ({ active: (s.active + 1) % STEPS.length, prev: s.active }));
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, []);

  // Only run the loop while the section is on screen.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        visibleRef.current = entries[0].isIntersecting;
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
      className="relative w-full overflow-clip bg-white"
    >
      {/* === Title row — Figma 1870:6181 (py-160, lg-pad-x) ===
          Mobile: add `pb-` so the heading isn't flush with the big
          status label below it (the previous layout made
          "Як відбувається співпраця?" + "01. Запит" run into a
          single visual block on phones because the title carried
          no bottom padding). */}
      <div className="px-6 pb-12 pt-[60px] sm:px-10 sm:pb-10 sm:pt-16 lg:[padding-left:var(--lg-pad-x)] lg:[padding-right:var(--lg-pad-x)] lg:pb-[160px] lg:pt-[160px]">
        <Reveal as="h2" className="text-neutral-900">
          <span className="text-h2-light">Як відбувається </span>
          <span className="text-h2">співпраця?</span>
        </Reveal>
        {/* Body — Figma MOBILE master (3166:7858): 14/20 subtle text with
            an explicit paragraph break after "пропозицію." (5 lines
            total). The desktop master has no body under this heading, so
            it's gated lg:hidden. */}
        <p className="mt-6 max-w-[574px] text-body-sm text-neutral-500 lg:hidden">
          {`Заповніть коротку форму — і ми підготуємо для вас індивідуальний підбір позицій та комерційну пропозицію.`}
          <br aria-hidden="true" />
          {`Без зайвих дзвінків і уточнень — тільки те, що вам реально потрібно.`}
        </p>
      </div>

      {/* === Desktop animation (lg+) ===
          200-px tall band with the active status label, the six
          step labels at fixed slots, the timeline rule, and the six
          hex markers. */}
      <div className="relative mt-[1px] mb-[160px] hidden h-[200px] w-full lg:block">
        {/* BIG status label at top-left — Figma's `inset-[0_72.71%_66%_9.03%]`.
            Shows the active step's "0N. Name" with a soft reveal-up on
            each change. Independent of the slot row below — this is
            the section's headline state. */}
        <div className="absolute" style={{ left: SLOT_X[0], top: 0 }}>
          {/* incoming step — rises + fades in */}
          <div className="flex items-baseline gap-4">
            <span
              key={`num-${active}`}
              className="animate-[reveal-up_620ms_cubic-bezier(0.16,1,0.3,1)_both] whitespace-nowrap text-h1 font-bold tabular-nums text-neutral-900"
            >
              0{active + 1}.
            </span>
            <span
              key={`name-${active}`}
              className="animate-[reveal-up_620ms_cubic-bezier(0.16,1,0.3,1)_90ms_both] whitespace-nowrap text-h1 font-light text-neutral-900"
            >
              {STEPS[active]}
            </span>
          </div>
          {/* outgoing step — stacked overlay, rolls up + fades out so the
              two cross with no empty frame */}
          {prev !== active && (
            <div
              key={`prev-${active}`}
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 flex items-baseline gap-4 animate-[step-roll-out_520ms_cubic-bezier(0.4,0,0.2,1)_both]"
            >
              <span className="whitespace-nowrap text-h1 font-bold tabular-nums text-neutral-900">
                0{prev + 1}.
              </span>
              <span className="whitespace-nowrap text-h1 font-light text-neutral-900">
                {STEPS[prev]}
              </span>
            </div>
          )}
        </div>

        {/* Six step labels at fixed slots. All stay mounted; the active
            step's label fades out (its name shows big in the headline),
            so switching crossfades instead of popping. Clickable. */}
        {STEPS.map((step, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            className={`absolute flex items-center gap-1 whitespace-nowrap font-normal text-[22px] leading-[28px] tracking-[0.22px] text-neutral-500 transition-opacity duration-500 ${
              i === active ? "pointer-events-none opacity-0" : "cursor-pointer opacity-100"
            }`}
            style={{ left: SLOT_X[i], top: LABEL_TOP }}
          >
            <span>0{i + 1}.</span>
            <span>{step}</span>
          </button>
        ))}

        {/* Timeline: grey base rule (Figma Line 1) + an orange progress
            line that grows from the first step to the active hex, easing
            in sync with the gliding marker. */}
        <span
          aria-hidden
          className="absolute left-0 right-0 block h-px bg-stroke-default"
          style={{ top: LINE_TOP }}
        />
        <span
          aria-hidden
          className="absolute block h-px bg-brand"
          style={{
            left: SLOT_X[0],
            top: LINE_TOP,
            width: `calc(${SLOT_X[active]} - ${SLOT_X[0]})`,
            transition: `width ${SLIDE_MS}ms ${EASE}`,
          }}
        />

        {/* Six small grey hex markers at fixed slots (clickable). */}
        {SLOT_X.map((x, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`${STEPS[i]} (крок ${i + 1})`}
            className="absolute flex h-10 w-10 cursor-pointer items-center justify-center"
            style={{
              left: `calc(${x} + ${SMALL_HEX_HALF}px)`,
              top: LINE_TOP,
              transform: "translate(-50%, -50%)",
            }}
          >
            <SmallHex />
          </button>
        ))}

        {/* One large orange hex that GLIDES to the active step's column
            (instead of popping per slot), covering that step's small
            marker. pointer-events-none so clicks pass to the markers. */}
        <span
          aria-hidden
          className="pointer-events-none absolute flex h-10 w-10 items-center justify-center"
          style={{
            left: `calc(${SLOT_X[active]} + ${ACTIVE_HEX_HALF}px)`,
            top: LINE_TOP,
            transform: "translate(-50%, -50%)",
            transition: `left ${SLIDE_MS}ms ${EASE}`,
          }}
        >
          <ActiveHex />
        </span>
      </div>

      {/* === Mobile / tablet (< lg) ===
          Vertical timeline: status label as a card on top, then a 6-row
          vertical list with hex marker + step number + name in each
          row. Active row uses brand-orange marker + bold neutral-900
          text; inactive rows use small dark hex + grey text. Vertical
          works better than horizontal scroll because all 6 steps stay
          visible without needing the user to swipe right; the hex
          column on the left also forms a clear visual rail. */}
      {/* pb-0: the Figma timeline block ends flush at its last row — the
          96-px gap to the quiz slab is the form section's own pt. */}
      <div className="px-6 pb-0 sm:px-10 sm:pb-20 lg:hidden">
        {/* Figma MOBILE master (3167:4829): a vertical dot-rail. The
            active step is rendered large ("0N." SemiBold 40 + name Light
            40) with a brand-orange dot; the rest are small 22-px grey
            rows with a dark dot. The active step still auto-cycles (the
            shared `active` state), so the big step walks down the list. */}
        <ul className="relative flex flex-col gap-12">
          {/* Vertical rail down the centre of the 24-px dot column. */}
          {/* Rail spans dot-centre to dot-centre (Figma Line 1 at x12.61,
              y23..412): active row is 46 tall (centre 23), the last small
              row is 28 tall (centre 14). */}
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-[14px] left-[12px] top-[23px] block w-px bg-stroke-default"
          />
          {STEPS.map((s, i) => {
            const isActive = i === active;
            return (
              <li key={s} className="relative">
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-pressed={isActive}
                  className="flex w-full cursor-pointer items-center gap-8 text-left"
                >
                  {/* Figma mobile "Dot" (24x24, node 3167:4895/4932): a
                      pointy-side HEXAGON, not a circle — the active step
                      carries Polygon 24 (16 x 13.86, brand) and inactive
                      rows Polygon 18 (10 x 8.66, dark) = the same shape
                      at exactly 1.6x. One path scaled + recolored per
                      state, so the marker grows/shrinks smoothly as the
                      active step walks the rail. Tailwind v4 compiles
                      scale-* to the standalone `scale` property, so the
                      transition targets [scale], not transform. The
                      white 24px disc masks the rail behind the marker. */}
                  <span className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-white">
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      className={`block size-6 transition-[scale] duration-300 ease-out ${
                        isActive ? "scale-[1.6]" : "scale-100"
                      }`}
                    >
                      <path
                        d="M17 12L14.5 16.3301L9.5 16.3301L7 12L9.5 7.66987L14.5 7.66987L17 12Z"
                        className={`transition-colors duration-300 ${
                          isActive ? "fill-brand" : "fill-neutral-900"
                        }`}
                      />
                    </svg>
                  </span>
                  <FitStepLabel num={`0${i + 1}.`} name={s} active={isActive} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
