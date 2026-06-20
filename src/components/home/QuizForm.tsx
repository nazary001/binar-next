/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

export type QuizStep = {
  title: string;
  field: string;
  options?: { value: string; label: string; hint?: string }[];
  custom?: "contact";
  // When set, render an additional free-text input at the bottom of the
  // option list with this placeholder string. Matches the "Ваш варіант"
  // field in Figma step 2 (1327:6015).
  customInputPlaceholder?: string;
  customInputField?: string;
};

// Option-pick steps store their selection as `string[]` (multi-select);
// free-text fields (`customInputField`, contact name/email/phone) stay
// as plain strings. The same Answers map carries both.
type Answers = Record<string, string | string[]>;

function getStr(a: Answers, k: string): string {
  const v = a[k];
  return typeof v === "string" ? v : "";
}
function getArr(a: Answers, k: string): string[] {
  const v = a[k];
  return Array.isArray(v) ? v : [];
}

// Step copy and options drawn directly from Figma component-set
// `Quizz Card` variants:
//   step 1 -> 1384:12935 ("Оберіть напрям")
//   step 2 -> 1327:6015 ("Тип об'єкта")
//   step 3 -> 1327:6035 ("Яка ваша задача зараз?")
//   step 4 -> 1327:6048 ("Контактні дані")
const DEFAULT_STEPS: QuizStep[] = [
  {
    title: "Оберіть напрям",
    field: "direction",
    options: [
      { value: "hotel", label: "Товари для готелю", hint: "готелі /апартаменти / хостели" },
      { value: "cleaning", label: "Засоби та інвентар для прибирання" },
      { value: "ppe", label: "Засоби індивідуального захисту" },
    ],
  },
  {
    title: "Тип об'єкта",
    field: "type",
    options: [
      { value: "hotel", label: "Готель" },
      { value: "hostel", label: "Хостел" },
      { value: "apartments", label: "Апартаменти" },
    ],
    customInputPlaceholder: "Ваш варіант",
    customInputField: "typeCustom",
  },
  {
    title: "Яка ваша задача зараз?",
    field: "task",
    options: [
      { value: "budget", label: "Підібрати оптимальні позиції під бюджет" },
      { value: "standards", label: "Оновити стандарти / покращити сервіс" },
      { value: "once", label: "Разова закупівля" },
      { value: "replace", label: "Замінити поточного постачальника" },
      { value: "regular", label: "Потрібні регулярні поставки" },
    ],
  },
  {
    title: "Контактні дані",
    field: "name",
    custom: "contact",
  },
];

function CheckmarkIcon() {
  return (
    <svg
      viewBox="0 0 18 12"
      fill="none"
      aria-hidden
      className="size-[18px] w-[18px] h-[12px]"
    >
      <path
        d="M1.5 6L7 11L17 1"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// "ОБРАТИ" curving around the radio's circumference (Figma "Circle text"
// 572:4542). The rotation is INTERACTIVE — it kicks in only when the
// user hovers the option AND the option is NOT yet selected. Selected
// options stay static even on hover (the selection is the final state,
// no need to invite further interaction).
//
// The hover gating lives in globals.css (see `.group/option:hover
// .quiz-radio-text:not(.is-selected)`). Here we just toggle the
// `is-selected` marker class so the CSS knows when to opt the SVG out
// of the hover rule. `useId` keeps the path/textPath reference unique
// even when several radios render on the same screen.
function CircleText({ selected }: { selected: boolean }) {
  const pathId = useId();
  return (
    <svg
      viewBox="0 0 88 88"
      className={`quiz-radio-text pointer-events-none absolute inset-0 size-full text-neutral-500 ${
        selected ? "is-selected" : ""
      }`}
      aria-hidden
    >
      <defs>
        <path
          id={pathId}
          d="M 44 12 A 32 32 0 1 1 44 76 A 32 32 0 1 1 44 12"
          fill="none"
        />
      </defs>
      <text
        className="fill-current"
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.08em",
          fontFamily: "var(--font-sans)",
        }}
      >
        <textPath href={`#${pathId}`}>
          ОБРАТИ · ОБРАТИ · ОБРАТИ · ОБРАТИ ·
        </textPath>
      </text>
    </svg>
  );
}

function RadioMarker({ selected }: { selected: boolean }) {
  // Figma 1384:12935;308:2721;1384:12927 — the inner ellipse is exactly
  // 39.575×39.575 px (≈ size-10 / 40 px) and stays the same size whether
  // the option is selected or not. Only the fill swaps: orange brand
  // colour with a white check on selected, white-with-brand-ring (the
  // `Ellipse 49` SVG in Figma is a thin orange stroke) otherwise.
  //
  // Mobile: the rotating "ОБРАТИ" circle text is dropped (the 88×88 wrapper
  // collapses to the radio itself) — on a 390 px screen with the option's
  // text + hint to its left, the curved text was visually cluttering the
  // row. Tap target is preserved via the surrounding button's min-height.
  //
  // Figma master is static — no hover scale on the radio, no transition.
  // Selection swap is instantaneous (matches the design state-by-state).
  return (
    <span className="relative flex size-10 shrink-0 items-center justify-center sm:size-[88px]">
      <span className="hidden sm:block">
        <CircleText selected={selected} />
      </span>
      <span
        className={`relative flex size-10 items-center justify-center rounded-full sm:size-10 ${
          selected
            ? "bg-brand"
            : "border-[1.5px] border-brand bg-white"
        }`}
      >
        {selected && <CheckmarkIcon />}
      </span>
    </span>
  );
}

type DecorVariant = {
  leftTop: string;
  leftBL: string;
  leftBR: string;
  rightTop: string;
  rightBL: string;
  rightBR: string;
};

// Figma master uses the SAME Group 49 + Group 50 layout across all 4
// page variants (verified via MCP: home 1384:12893/12871, protect
// 1327:4089/4067, hotels 1384:12118/12139, cleaning 1327:4930/4908 —
// identical Frame structure, identical product silhouettes, identical
// orientation). The earlier per-variant file paths were a code
// artifact, not a design difference: when the SVGs are compared
// byte-by-byte, home/cleaning/hotels all contain the same paths
// (e.g. home/decor-l-bl.svg ≡ hotels/quiz-decor/sponge.svg ≡
// cleaning/quiz-decor-l-2.svg). The variants diverged VISUALLY only
// because `flipLeftBL` was set inconsistently — home/cleaning had it,
// hotels/protect didn't — so the left-glove frame rendered mirrored
// on hotels and protect compared to home / cleaning.
//
// Fix: point every variant at the SAME shared asset set (the home
// SVGs). Orientation per Figma: the RIGHT group (Group 50) is the base
// (no transform); the LEFT group (Group 49) is that group MIRRORED, so
// ALL THREE of its frames carry scaleX(-1) and the top frame is
// right-aligned in the 246-wide stack (left:30, the 30px gutter sits on
// the page-edge side, mirroring the right stack's right:30). The left
// stack therefore flips every frame and offsets the top frame by 30px.
// (An earlier version flipped only the bottom-left frame and left the
// top frame at left:0, so the top-left tile read mirrored vs the
// canvas.) The `decorations` prop stays for API compatibility but its
// value no longer selects different files.
const SHARED_DECOR: DecorVariant = {
  leftTop: "/figma-export/home/decor-l-top.svg",
  leftBL: "/figma-export/home/decor-l-bl.svg",
  leftBR: "/figma-export/home/decor-l-br.svg",
  rightTop: "/figma-export/home/decor-r-top.svg",
  rightBL: "/figma-export/home/decor-r-bl.svg",
  rightBR: "/figma-export/home/decor-r-br.svg",
};

const DECOR_VARIANTS: Record<string, DecorVariant> = {
  home: SHARED_DECOR,
  protect: SHARED_DECOR,
  hotels: SHARED_DECOR,
  cleaning: SHARED_DECOR,
};

function DecorStack({ variant }: { variant: keyof typeof DECOR_VARIANTS }) {
  const v = DECOR_VARIANTS[variant];
  return (
    // Anchored to the section's BOTTOM, not its top, so the decoration
    // stays glued to the form regardless of heading height. Figma master
    // (home) puts the decoration's BOTTOM 168 px above section bottom
    // (8 px above active card bottom + 160 px section pb). Hotels /
    // cleaning / protect use longer heading text that pushes the deck
    // down by 40-80 px; with `top: 834` (the old anchor) the decoration
    // didn't follow and appeared visibly HIGHER on those pages relative
    // to the form. `bottom: 168` keeps the relative gap to the active
    // card constant across every variant.
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 hidden lg:block"
      style={{ bottom: "168px", height: "294px" }}
    >
      {/* Left stack (Figma Group 49 / 65) — anchored at the section's
          LEFT edge. The top frame sits at left:0 with a 30-px gap on
          its right (216-wide inside the 246-wide group); the bottom
          row is 97 (left) + 149 (right). */}
      <div className="absolute" style={{ left: "0", width: "246px", height: "294px" }}>
        <img
          src={v.leftTop}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute -scale-x-100"
          style={{ left: "30px", top: "0", width: "216px", height: "147px" }}
        />
        <img
          src={v.leftBL}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute -scale-x-100"
          style={{ left: "0", top: "147px", width: "97px", height: "147px" }}
        />
        <img
          src={v.leftBR}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute -scale-x-100"
          style={{ left: "97px", top: "147px", width: "149px", height: "147px" }}
        />
      </div>
      {/* Right stack (Figma Group 50 / 64) — mirror of left, anchored
          at the section's RIGHT edge. Top frame: 30-px right gutter;
          bottom row: wider 149 sits to the LEFT (closer to the form),
          narrower 97 sits flush to the section's right edge. */}
      <div className="absolute" style={{ right: "0", width: "246px", height: "294px" }}>
        <img
          src={v.rightTop}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute"
          style={{ right: "30px", top: "0", width: "216px", height: "147px" }}
        />
        <img
          src={v.rightBL}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute"
          style={{ right: "97px", top: "147px", width: "149px", height: "147px" }}
        />
        <img
          src={v.rightBR}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute"
          style={{ right: "0", top: "147px", width: "97px", height: "147px" }}
        />
      </div>
    </div>
  );
}

type QuizFormProps = {
  steps?: QuizStep[];
  headingTitle?: React.ReactNode;
  headingBody?: React.ReactNode;
  // Render the two 246x294 decorative product-silhouette groups
  // flanking the quiz card. One variant per page — asset URLs differ
  // but the layout (left/right Group 49 + 50 stacks at section y=834)
  // is identical, driven by DECOR_VARIANTS above.
  decorations?: false | keyof typeof DECOR_VARIANTS;
  // Final-step submit button label. Defaults to "Отримати пропозицію"
  // (the home page Figma value, 1327:6048;308:2741;228:943). Hotels /
  // cleaning / protect / spivpratsya can override.
  submitLabel?: string;
};

export function QuizForm({
  steps: stepsProp,
  headingTitle,
  headingBody,
  decorations = false,
  submitLabel = "Отримати пропозицію",
}: QuizFormProps = {}) {
  const STEPS = stepsProp ?? DEFAULT_STEPS;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const totalSteps = STEPS.length;

  // After the quiz is replaced by the thank-you card, the layout
  // shrinks dramatically (a 4-step deck becomes a short card). If the
  // user was scrolled deep inside the quiz when they clicked "Отримати
  // пропозицію", the new shorter card ends up ABOVE the current scroll
  // position - i.e. they're now looking at empty space below the
  // section, never seeing the success state. Scroll the section's
  // top back into view as soon as `submitted` flips true so the
  // thank-you card is always centred in the viewport.
  const successRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (submitted && successRef.current) {
      successRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [submitted]);

  const current = STEPS[step];
  const isContactStep = current.custom === "contact";
  // Step is advanceable when at least one option is picked OR the
  // optional free-text fallback has content (or, for the contact step,
  // when the required text fields are filled in).
  const canAdvance = isContactStep
    ? getStr(answers, "name").length > 1 &&
      (getStr(answers, "phone").length > 5 ||
        getStr(answers, "email").includes("@"))
    : getArr(answers, current.field).length > 0 ||
      (current.customInputField
        ? getStr(answers, current.customInputField).length > 0
        : false);

  // Toggle multi-select: add the value if not present, remove it if
  // already in the array. Each option step's answer is therefore a
  // `string[]` regardless of whether the user picked one or many.
  function handleSelect(value: string) {
    setAnswers((prev) => {
      const cur = Array.isArray(prev[current.field]) ? (prev[current.field] as string[]) : [];
      const next = cur.includes(value)
        ? cur.filter((v) => v !== value)
        : [...cur, value];
      return { ...prev, [current.field]: next };
    });
  }
  function handleNext() {
    if (!canAdvance) return;
    if (step === totalSteps - 1) {
      setSubmitted(true);
      return;
    }
    setStep((s) => s + 1);
  }
  function handleBack() {
    if (step === 0) return;
    setStep((s) => s - 1);
  }

  if (submitted) {
    return (
      <section
        ref={successRef}
        id="contact-form"
        className="lg-pad-x bg-white px-6 py-20 sm:px-10 lg:py-[120px]"
      >
        <div className="mx-auto flex max-w-[948px] flex-col items-center gap-6 rounded-[40px] bg-bg-subtle p-12 text-center">
          <h2 className="text-h2 text-neutral-900">Дякуємо!</h2>
          <p className="max-w-md text-body-sm text-neutral-500">
            {`Менеджер зв'яжеться з вами найближчим часом, щоб обговорити деталі
            та підготувати пропозицію.`}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      id="contact-form"
      className="lg-pad-x relative bg-white px-6 py-[60px] sm:px-10 sm:py-20 lg:py-[160px]"
    >
      {decorations && <DecorStack variant={decorations} />}
      <div className="relative flex flex-col items-start gap-6 sm:gap-8 lg:flex-row lg:gap-8">
        <h2 className="flex-1 text-neutral-900">
          {headingTitle ?? (
            <>
              <span className="text-h2">Отримайте підбір товарів </span>
              <span className="text-h2-light">{`під ваш об'єкт і бюджет`}</span>
            </>
          )}
        </h2>
        <div className="flex flex-1 flex-col gap-2 text-body-sm text-neutral-500">
          {headingBody ?? (
            <>
              <p>
                Заповніть коротку форму — і ми підготуємо для вас
                індивідуальний підбір позицій та комерційну пропозицію.
              </p>
              <p>
                Без зайвих дзвінків і уточнень — тільки те, що вам реально
                потрібно.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Deck — Figma 1384:12917 layout + Tinder-style swipe animation.
          All 4 step cards render into the same wrapper. data-rel =
          stepIndex - currentStep, so the active card has data-rel=0,
          upcoming steps are 1/2/3 (peek + hidden), discarded steps
          are -1/-2 (swiped off-screen to the right). CSS at lg+
          transitions transform+opacity between these states, so
          step-change is a smooth deck flip in either direction. */}
      <div className="quiz-deck relative mx-auto mt-12 w-full max-w-[948px] sm:mt-16 lg:mt-[160px]">
        {STEPS.map((s, i) => {
          const rel = i - step;
          const isActive = rel === 0;
          // Clamp visible range so far-off cards collapse to the same
          // hidden state on either end (rel < -2 maps to -2, rel > 3
          // maps to 3) — avoids the new active card teleporting
          // through intermediate transforms on multi-step skips.
          const dataRel = String(Math.max(-2, Math.min(3, rel)));
          return (
            <div
              key={i}
              className="quiz-deck-card"
              data-rel={dataRel}
              aria-hidden={!isActive}
            >
              {/* CardInner remounts when active-ness flips — this
                  restarts the mobile fade-in keyframe and resets
                  internal focus / scroll state per step. */}
              <CardInner
                key={isActive ? `active-${step}` : `idle-${i}`}
                step={s}
                stepIndex={i}
                totalSteps={totalSteps}
                answers={answers}
                setAnswers={setAnswers}
                onSelect={isActive ? handleSelect : noop}
                onBack={isActive ? handleBack : noop}
                onNext={isActive ? handleNext : noop}
                canAdvance={isActive ? canAdvance : false}
                isActive={isActive}
                submitLabel={submitLabel}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function noop() {}

type CardInnerProps = {
  step: QuizStep;
  stepIndex: number;
  totalSteps: number;
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  onSelect: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
  canAdvance: boolean;
  isActive: boolean;
  submitLabel: string;
};

function CardInner({
  step,
  stepIndex,
  totalSteps,
  answers,
  setAnswers,
  onSelect,
  onBack,
  onNext,
  canAdvance,
  isActive,
  submitLabel,
}: CardInnerProps) {
  const isContactStep = step.custom === "contact";
  const isLast = stepIndex === totalSteps - 1;
  return (
    // Outer dark frame — Figma 1384:12935 "Quizz Card" is a `bg-#2d2d2f
    // rounded-[40px]` flex column whose first child is the title row
    // (transparent, dark shows through) and whose second child is the
    // inner white card. The white card has its own `rounded-[40px]
    // border border-black` so its rounded top edges sit visibly against
    // the dark frame while its rounded bottom corners overlap the dark
    // frame's bottom corners. That nested layout — not a single card
    // with a dark band — is the design we have to mirror.
    <div className="quiz-deck-card-inner">
      {/* Title row — sits inside the dark outer frame; the .meta children
          are faded out for peek cards so only the active step's counter
          and question text are ever visible above the deck. lg spec:
          gap-32, items-center, px-60 py-32.
          Mobile (Figma 3111:14541 Title): gap-32, items-center, p-24.
          The counter is plain white Body/Small (16/24 Regular) — the
          phone master shows no orange pill — and the title is SemiBold
          24/28 tracking-[-0.48px]. sm:/lg: keep their previous values so
          tablet and desktop render unchanged. */}
      <div className="quiz-deck-card-title flex items-center gap-8 px-6 py-6 sm:gap-8 sm:px-8 sm:py-6 lg:gap-8 lg:px-[60px] lg:py-8">
        <span className="quiz-deck-card-title-meta shrink-0 text-[16px] leading-[24px] text-white tabular-nums">
          {stepIndex + 1}/{totalSteps}
        </span>
        <h3 className="quiz-deck-card-title-meta min-w-0 flex-1 text-[24px] font-semibold leading-[28px] tracking-[-0.48px] text-white sm:text-[24px] sm:leading-[28px] sm:tracking-[-0.48px] lg:text-[32px] lg:leading-[28px] lg:tracking-[-0.64px]">
          {step.title}
        </h3>
      </div>
      {/* Inner white card — independent rounded-40 + 1-px black border per
          Figma 1384:12935;308:2720 "Content". flex-1 fills the space below
          the title row. overflow-hidden keeps its rounded edges clipping
          the body / button children cleanly. */}
      <div className="quiz-deck-card-content flex flex-col lg:flex-1 lg:overflow-hidden">
        {/* Body — Figma's `Body` has gap-100 between the two columns,
            pt-60 pb-16 px-60 on lg. items-start (not stretch) keeps each
            column at its content height. */}
        {/* Body layout — three responsive modes:
              < 640 (mobile): single column, gap-40 between options (no
                              dividers — Figma 3111:14541), 40-px radio,
                              px-24 pt-32 pb-48 body padding.
              640-1023 (tablet): single column, sm:gap-10 vertical spacing
                              between options; full 88-px curved radio
                              circles (room on the right of each option).
              1024+ (lg desktop): two-column flex-row layout matching
                              Figma 1384:12935, gap-[100px] between cols,
                              plus the peek-deck animation behind. We
                              switch at lg (not md) because two-col below
                              1024 cramps long Ukrainian labels like
                              "Засоби індивідуального захисту" into
                              broken-word wraps.
            items-start at lg+ keeps each column at its content height
            so step 4's right-aligned phone field can `justify-end`. */}
        <div className="flex flex-col gap-10 px-6 pb-12 pt-8 sm:gap-10 sm:px-12 sm:pb-4 sm:pt-8 lg:flex-1 lg:flex-row lg:items-start lg:gap-[100px] lg:px-[60px] lg:pb-4 lg:pt-[60px]">
          {isContactStep ? (
            <ContactFields
              answers={answers}
              setAnswers={setAnswers}
              interactive={isActive}
            />
          ) : (
            <OptionGrid
              options={step.options ?? []}
              fieldKey={step.field}
              selectedValues={getArr(answers, step.field)}
              onSelect={onSelect}
              animate={isActive}
              customInputPlaceholder={step.customInputPlaceholder}
              customInputField={step.customInputField}
              customInputValue={
                step.customInputField
                  ? getStr(answers, step.customInputField)
                  : ""
              }
              onCustomInputChange={
                step.customInputField
                  ? (v) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [step.customInputField as string]: v,
                      }))
                  : undefined
              }
            />
          )}
        </div>
        {/* Bottom button strip — Figma `Buttom` is items-end (right
            aligned) pb-40 px-40, no top padding. We keep the back link
            on the left for UX (Figma omits it because it shows only one
            state) — placed via justify-between, but its disabled state
            is opacity-0 on step 1 so the row visually matches Figma's
            single-button layout there. */}
        {/* On mobile the disabled "← Назад" button used to keep its
            layout space via opacity-0, which combined with gap-3 and
            the wide "Наступне питання + arrow" group could push the
            next button past the right edge of the narrow card body.
            We now FULLY hide back when disabled (`disabled:hidden`) and
            anchor next via `ml-auto` so it stays on the right whether
            back is rendered or not.

            Padding is unified at sm+ to Figma's `Buttom` spec
            (px-[40px] pb-[40px] pt-0) so the Next button does NOT
            shift horizontally or vertically when crossing the 1024-px
            lg breakpoint. Previously sm used px-12 pb-6 and lg used
            px-10 pb-10, which jumped the button 8 px left and 16 px
            up the moment the deck animation came online. */}
        <div className="flex items-center gap-2 px-6 pb-8 pt-0 sm:gap-4 sm:px-10 sm:pb-10 sm:pt-0">
          {/* Back collapses to a bare "←" on phones so the compact Figma
              next/submit button (size="responsive" = Button/Small below lg)
              always fits inside the 340-wide card without overflowing. */}
          <button
            type="button"
            onClick={onBack}
            disabled={!isActive || stepIndex === 0}
            aria-label="Назад"
            className="shrink-0 cursor-pointer whitespace-nowrap text-button-md text-neutral-500 transition-colors hover:text-neutral-900 disabled:hidden"
          >
            <span aria-hidden>&larr;</span>
            <span className="hidden sm:inline"> Назад</span>
          </button>
          <div className="ml-auto min-w-0">
            <Button
              type="button"
              onClick={onNext}
              disabled={!canAdvance}
              size="responsive"
              arrow
            >
              {isLast ? submitLabel : "Наступне питання"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OptionGrid({
  options,
  fieldKey,
  selectedValues,
  onSelect,
  animate,
  customInputPlaceholder,
  customInputField,
  customInputValue,
  onCustomInputChange,
}: {
  options: { value: string; label: string; hint?: string }[];
  fieldKey: string;
  selectedValues: string[];
  onSelect: (v: string) => void;
  animate: boolean;
  customInputPlaceholder?: string;
  customInputField?: string;
  customInputValue?: string;
  onCustomInputChange?: (v: string) => void;
}) {
  const half = Math.ceil(options.length / 2);
  const left = options.slice(0, half);
  const right = options.slice(half);
  const showCustomInput = Boolean(
    customInputPlaceholder && customInputField && onCustomInputChange,
  );

  // Per-column gap matches Figma: gap-40 (lg:gap-10) when the tallest
  // column has at most 2 options (1384:12935 — home form's 3- and
  // 4-option steps), gap-32 (lg:gap-8) when a column reaches 3 options
  // (1327:6035 — hotels' 5-option step), so 3 × 92-px options + 2 × 32-px
  // gaps = 340 px exactly fits the body's available height.
  const lgGapClass = Math.max(left.length, right.length) >= 3 ? "lg:gap-8" : "lg:gap-10";

  // Column wrappers use gap-0 on mobile (their parent already collapses
  // the inter-column gap, and the Options stitch into one continuous
  // list via their per-row border-b). On sm+ the column-internal gap-10
  // returns the lg / tablet layout where options have explicit
  // vertical breathing room. No staggered entrance — Figma master is
  // static.
  return (
    <>
      <div className={`flex flex-1 flex-col gap-10 sm:gap-10 ${lgGapClass}`}>
        {left.map((opt, i) => (
          <Option
            key={`${fieldKey}-${opt.value}`}
            opt={opt}
            selected={selectedValues.includes(opt.value)}
            onSelect={onSelect}
            animate={animate}
            // On mobile the columns flow into a single visual list, so
            // the LAST option overall (= last in RIGHT column when it
            // exists, otherwise last in LEFT) is the one without a
            // bottom divider. Left-column items are never last when the
            // right column has anything.
            isLast={right.length === 0 && i === left.length - 1}
          />
        ))}
      </div>
      {(right.length > 0 || showCustomInput) && (
        <div className={`flex flex-1 flex-col justify-center gap-10 sm:gap-10 ${lgGapClass}`}>
          {right.map((opt, i) => (
            <Option
              key={`${fieldKey}-${opt.value}`}
              opt={opt}
              selected={selectedValues.includes(opt.value)}
              onSelect={onSelect}
              animate={animate}
              // When a free-text input follows, none of the right-column
              // options is the visual last row on mobile; the input owns
              // that role and we keep the per-option dividers between
              // them.
              isLast={!showCustomInput && i === right.length - 1}
            />
          ))}
          {showCustomInput && (
            <CustomInputField
              placeholder={customInputPlaceholder as string}
              value={customInputValue ?? ""}
              onChange={onCustomInputChange as (v: string) => void}
              disabled={!animate}
            />
          )}
        </div>
      )}
    </>
  );
}

// Free-text fallback input rendered at the bottom of the option column.
// Figma `1327:6013` is a 40-px height row with a `border-b stroke-deep`
// underline and a plain 16/24 placeholder. The underline switches to
// brand orange on focus to echo the quiz-form's accent.
function CustomInputField({
  placeholder,
  value,
  onChange,
  disabled,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex w-full flex-col pt-6 lg:max-w-[364px]">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
        className="h-10 w-full border-b border-neutral-800 bg-transparent py-2 text-body-sm text-neutral-900 placeholder:text-neutral-900 outline-none transition-colors focus:border-brand"
      />
    </div>
  );
}

function Option({
  opt,
  selected,
  onSelect,
  animate,
  isLast,
}: {
  opt: { value: string; label: string; hint?: string };
  selected: boolean;
  onSelect: (v: string) => void;
  animate: boolean;
  isLast: boolean;
}) {
  // group/option scopes the selected state to THIS button. Figma master
  // is static — no hover translate, no active scale, no color flip on
  // hover, no staggered entrance — so the option behaves as a clean
  // click target with only its selected ↔ unselected radio fill as
  // visible state change.
  //
  // Mobile (Figma 3111:14541 option rows): each row is gap-16,
  // items-center, ~48-px tall with NO divider — the rows are separated
  // only by the column's 40-px gap. `isLast` no longer toggles a border
  // (the phone master has none) but is still consumed to keep the prop
  // contract intact; the divider returns nowhere across breakpoints.
  return (
    <button
      type="button"
      onClick={() => onSelect(opt.value)}
      tabIndex={animate ? undefined : -1}
      className={`group/option flex min-h-[48px] w-full cursor-pointer items-center gap-4 text-left sm:min-h-[92px] sm:gap-8 ${
        isLast ? "" : ""
      }`}
    >
      <div className="flex flex-1 flex-col gap-1 sm:gap-2">
        <p
          className={`text-[16px] font-bold leading-[24px] sm:text-[20px] sm:leading-[28px] ${
            selected ? "text-brand" : "text-black"
          }`}
        >
          {opt.label}
        </p>
        {opt.hint && (
          <p className="text-body-sm text-neutral-500">{opt.hint}</p>
        )}
      </div>
      <RadioMarker selected={selected} />
    </button>
  );
}

// Figma step 4 (1327:6048) — two-column body. Left column has Ім'я +
// Email + the 12/16 disclaimer; right column has Номер телефону. Each
// field is a 40-px height row with a `border-b var(--stroke/deep,#343435)`
// underline and placeholder-style label text. The disclaimer hangs 8 px
// under the Email field with text-subtle 12/16.
//
// On mobile we collapse to a single column so the form fills the narrower
// card; the disclaimer stays beneath Email so the visual grouping
// remains correct.
function ContactFields({
  answers,
  setAnswers,
  interactive,
}: {
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  interactive: boolean;
}) {
  return (
    <>
      <div className="flex flex-1 flex-col gap-6 self-stretch lg:gap-8">
        <Field
          placeholder="Ваше Ім'я"
          value={getStr(answers, "name")}
          onChange={(v) => setAnswers((prev) => ({ ...prev, name: v }))}
          disabled={!interactive}
        />
        <div className="flex flex-col gap-2">
          <Field
            placeholder="Email"
            type="email"
            value={getStr(answers, "email")}
            onChange={(v) => setAnswers((prev) => ({ ...prev, email: v }))}
            disabled={!interactive}
          />
          <p className="text-[12px] leading-[16px] text-neutral-500">
            * Контакти використовуються виключно для підготовки підбору та
            комерційної пропозиції.
          </p>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-end self-stretch pt-6 lg:pt-6">
        <Field
          placeholder="Номер телефону"
          type="tel"
          value={getStr(answers, "phone")}
          onChange={(v) => setAnswers((prev) => ({ ...prev, phone: v }))}
          disabled={!interactive}
        />
      </div>
    </>
  );
}

function Field({
  placeholder,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      className="h-10 w-full border-b border-neutral-800 bg-transparent py-2 text-body-sm text-neutral-900 placeholder:text-neutral-900 outline-none transition-colors focus:border-brand lg:max-w-[364px]"
    />
  );
}
