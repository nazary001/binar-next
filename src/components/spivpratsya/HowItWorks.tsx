"use client";
import { useState } from "react";
import { Reveal } from "@/components/ui/Reveal";

// Figma 1870:6180 — "Як відбувається співпраця?" (1440×729).
//
// Figma's Animation component (1589:11504) is a variant SET — the visible
// "Default" frame shows step 01 active, and the designer keyframes the
// other step variants separately rather than as auto-rotating motion.
// The previous implementation auto-cycled every 3.4 s and tinted the
// active label brand-orange — both inventions on top of Figma's static
// design. This version renders the timeline statically and lets the
// user click a step to swap the active one (an accessible accordion-
// style switch); no JS timer drives the change.
//
// At first paint step 01 is active (matching Figma's "Default" variant).

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
  // First paint matches Figma's "Default" variant (step 01 active). The
  // user can click another step label or its hex marker to make that
  // step active — no auto-cycle.
  const [active, setActive] = useState(0);

  return (
    <section className="relative w-full overflow-clip bg-white">
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

        {/* 5 small step labels at fixed slots — Figma `1589:11504`
            ("Default" variant) only renders the labels for the NON-
            active steps. The active step is shown solely via the BIG
            bold-light accent above; without the guard the active
            label duplicates ("01. Запит" appears twice on first
            paint). Labels remain clickable for accordion switching. */}
        {STEPS.map((step, i) => {
          if (i === active) return null;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className="absolute flex cursor-pointer items-center gap-1 whitespace-nowrap font-normal text-[22px] leading-[28px] tracking-[0.22px] text-neutral-500"
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
            own column. Click handled by the marker itself (and there's
            an invisible hit-area wider than the 10-px hex so a tap
            close to the marker also works). */}
        {SLOT_X.map((x, i) => {
          const isActive = i === active;
          const half = isActive ? ACTIVE_HEX_HALF : SMALL_HEX_HALF;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${STEPS[i]} (крок ${i + 1})`}
              className="absolute flex h-10 w-10 cursor-pointer items-center justify-center"
              style={{
                left: `calc(${x} + ${half}px)`,
                top: LINE_TOP,
                transform: "translate(-50%, -50%)",
              }}
            >
              {isActive ? <ActiveHex /> : <SmallHex />}
            </button>
          );
        })}
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
                  onClick={() => setActive(i)}
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
