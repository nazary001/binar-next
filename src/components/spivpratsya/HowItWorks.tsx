"use client";
import { useEffect, useRef, useState } from "react";
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
      <Reveal
        as="h2"
        className="px-5 pb-8 pt-12 text-neutral-900 sm:px-10 sm:pb-10 sm:pt-16 lg:[padding-left:var(--lg-pad-x)] lg:[padding-right:var(--lg-pad-x)] lg:pb-[160px] lg:pt-[160px]"
      >
        <span className="text-h2-light">Як відбувається </span>
        <span className="text-h2">співпраця?</span>
      </Reveal>

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
      <div className="flex flex-col gap-8 px-5 pb-12 sm:gap-10 sm:px-10 sm:pb-20 lg:hidden">
        {/* Status card — softer mobile presence than the desktop's
            62-px hero numeral. Renders the active step as a
            "Зараз: 0N. Name" pill so the section reads like a tracker
            without occupying half the screen height. */}
        <div className="flex items-center gap-3 rounded-2xl border border-stroke-subtle bg-bg-subtle px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
          <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand px-2.5 py-1 text-[12px] font-semibold leading-none tracking-[0.04em] text-white tabular-nums">
            0{active + 1}/0{STEPS.length}
          </span>
          <span
            key={`mob-name-${active}`}
            className="animate-[reveal-up_400ms_cubic-bezier(0.22,1,0.36,1)_both] truncate text-title-lg font-semibold text-neutral-900"
          >
            {STEPS[active]}
          </span>
        </div>
        <ul className="relative flex flex-col">
          {/* Vertical rail — 1-px line down the centre of the hex
              column, visually connecting all six step markers. */}
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-2 left-[15px] top-2 block w-px bg-stroke-default sm:left-[19px]"
          />
          {STEPS.map((s, i) => {
            const isActive = i === active;
            return (
              <li key={s} className="relative">
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-pressed={isActive}
                  className="flex w-full cursor-pointer items-center gap-4 py-3 text-left transition-colors active:scale-[0.99] sm:gap-5"
                >
                  <span className="relative z-10 flex size-[32px] shrink-0 items-center justify-center rounded-full bg-white sm:size-[40px]">
                    {isActive ? <ActiveHex /> : <SmallHex />}
                  </span>
                  <span
                    className={`text-body-md transition-colors sm:text-body-lg ${
                      isActive ? "font-semibold text-neutral-900" : "text-neutral-500"
                    }`}
                  >
                    <span className="tabular-nums">0{i + 1}. </span>
                    {s}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
