"use client";
import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";

// Figma 1870:6180 — "Як відбувається співпраця?" (1440×729).
//
// Re-thought logic — each step has a FIXED position on the timeline.
// The previous version moved the active label to the leftmost slot and
// dynamically reshuffled the other five, which broke the user's mental
// model: position 1 always being "step 01" is critical for a process
// timeline. Now:
//
//   • 6 step labels are pinned to their own slots, left to right
//     (Figma's 9.03 / 23.06 / 37.08 / 51.11 / 65.14 / 79.17%).
//   • 6 hex markers sit on the line under their slot.
//   • The ACTIVE step takes the large orange hex (Polygon 23) in
//     place of the small dark hex (Polygon 18) at its own position.
//   • The BIG status label at the top-left shows "0N. Name" for the
//     currently-active step, fading in on each change. It acts as the
//     headline of the section's state, not as a re-positioned label
//     fighting with the timeline.
//   • Clicking any slot makes that step the active one. The auto-
//     cycle that advances active every 3.4 s is paused on hover so the
//     user can read individual slots without the active moving away.

const STEPS = [
  "Запит",
  "Підбір",
  "Прорахунок",
  "Зразки",
  "Виробництво",
  "Поставка",
];

// % of section width — matches Figma 1589:11504 polygon positions.
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

const CYCLE_MS = 3400;

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
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Auto-cycle the active step. Hover anywhere on the timeline pauses
  // the timer — the user gets to inspect a slot without the highlight
  // moving on. Manual click still works and immediately advances to
  // the chosen step (and the cycle continues from there on next tick).
  useEffect(() => {
    if (paused) return;
    timerRef.current = window.setInterval(() => {
      setActive((s) => (s + 1) % STEPS.length);
    }, CYCLE_MS);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [paused]);

  return (
    <section className="relative w-full overflow-clip bg-white">
      {/* === Title row — Figma 1870:6181 (py-160, lg-pad-x) === */}
      <Reveal
        as="h2"
        className="px-5 pt-16 text-neutral-900 sm:px-10 sm:pt-20 lg:[padding-left:var(--lg-pad-x)] lg:[padding-right:var(--lg-pad-x)] lg:pb-[160px] lg:pt-[160px]"
      >
        <span className="text-h2-light">Як відбувається </span>
        <span className="text-h2">співпраця?</span>
      </Reveal>

      {/* === Desktop animation (lg+) ===
          200-px tall band with the active status label, the six
          step labels at fixed slots, the timeline rule, and the six
          hex markers. Hover pauses the auto-cycle. */}
      <div
        className="relative mt-[1px] mb-[160px] hidden h-[200px] w-full lg:block"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* BIG status label at top-left — Figma's `inset-[0_72.71%_66%_9.03%]`.
            Shows the active step's "0N. Name" with a soft reveal-up on
            each change. Independent of the slot row below — this is
            the section's headline state, not a re-positioned label. */}
        <div
          className="absolute flex items-baseline gap-4"
          style={{ left: SLOT_X[0], top: 0 }}
        >
          <span
            key={`num-${active}`}
            className="animate-[reveal-up_500ms_cubic-bezier(0.22,1,0.36,1)_both] whitespace-nowrap text-h1 font-bold tabular-nums text-neutral-900"
          >
            0{active + 1}.
          </span>
          <span
            key={`name-${active}`}
            className="animate-[reveal-up_500ms_cubic-bezier(0.22,1,0.36,1)_120ms_both] whitespace-nowrap text-h1 font-light text-neutral-900"
          >
            {STEPS[active]}
          </span>
        </div>

        {/* 6 step labels at fixed slots. Each label sits ABOVE its
            own hex marker. The active label is shown in brand orange +
            semibold so the user has a clear "you are here" anchor at
            the active step's actual column. The BIG status label up
            top is the section's headline — the small label is the
            in-line marker. All labels are clickable; clicking jumps
            the active step. */}
        {STEPS.map((step, i) => {
          const isActive = i === active;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={isActive}
              className={`absolute flex cursor-pointer items-center gap-1 whitespace-nowrap text-[22px] leading-[28px] tracking-[0.22px] transition-colors duration-300 ${
                isActive
                  ? "font-semibold text-brand"
                  : "font-normal text-neutral-500 hover:text-brand"
              }`}
              style={{ left: SLOT_X[i], top: LABEL_TOP }}
            >
              <span>0{i + 1}.</span>
              <span>{step}</span>
            </button>
          );
        })}

        {/* Horizontal hairline edge-to-edge at y:188 (Figma Line 1). */}
        <span
          aria-hidden
          className="absolute left-0 right-0 block h-px bg-stroke-default"
          style={{ top: LINE_TOP }}
        />

        {/* 6 hex markers — active position gets the large orange hex,
            others are small dark hexes. Marker position = step position
            (no shifting), so the active highlight tracks the step's
            own column. Decorative — click is handled by the step
            labels above (and there's an invisible hit-area wider than
            the 10-px hex so a tap close to the marker also works). */}
        {SLOT_X.map((x, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`${STEPS[i]} (крок ${i + 1})`}
            className="absolute flex h-10 w-10 cursor-pointer items-center justify-center"
            style={{ left: x, top: LINE_TOP, transform: "translate(-50%, -50%)" }}
          >
            {i === active ? <ActiveHex /> : <SmallHex />}
          </button>
        ))}
      </div>

      {/* === Mobile / tablet (< lg) ===
          Compact stack: BIG status label on top, then a horizontally
          scrollable row of 6 step labels with their hex markers. Same
          logic — active is highlighted at its own slot, BIG up top
          shows what's active. */}
      <div
        className="flex flex-col gap-12 px-5 pb-16 sm:gap-16 sm:px-10 sm:pb-20 lg:hidden"
        onTouchStart={() => setPaused(true)}
      >
        <div className="flex min-h-[64px] items-baseline gap-4 sm:gap-6">
          <span
            key={`mob-num-${active}`}
            className="animate-[reveal-up_500ms_cubic-bezier(0.22,1,0.36,1)_both] text-h1 font-bold tabular-nums text-neutral-900"
          >
            0{active + 1}.
          </span>
          <span
            key={`mob-name-${active}`}
            className="animate-[reveal-up_500ms_cubic-bezier(0.22,1,0.36,1)_120ms_both] text-h1 font-light text-neutral-900"
          >
            {STEPS[active]}
          </span>
        </div>
        <div className="relative">
          <span
            aria-hidden
            className="absolute left-0 right-0 top-[calc(100%-13px)] block h-px bg-stroke-default"
          />
          <ul className="relative flex w-full items-end justify-between gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {STEPS.map((s, i) => {
              const isActive = i === active;
              return (
                <li
                  key={s}
                  className="flex shrink-0 flex-col items-center gap-2"
                >
                  {/* Tap target — `py-2 px-3` gives the label a 44-px+
                      hit area (text ~22 + 2*10 padding + reasonable
                      horizontal hit zone) so mobile users don't need
                      to land exactly on the 17-px text line. */}
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-pressed={isActive}
                    className={`cursor-pointer px-3 py-2 text-body-md transition-colors duration-300 ${
                      isActive
                        ? "font-semibold text-brand"
                        : "text-neutral-900 hover:text-brand"
                    }`}
                  >
                    0{i + 1}. {s}
                  </button>
                  <span className="flex h-6 items-center justify-center">
                    {isActive ? <ActiveHex /> : <SmallHex />}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
