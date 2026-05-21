"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";

export type QuizStep = {
  title: string;
  field: string;
  options?: { value: string; label: string; hint?: string }[];
  custom?: "contact";
};

type Answers = Record<string, string>;

const DEFAULT_STEPS: QuizStep[] = [
  {
    title: "Оберіть напрям",
    field: "direction",
    options: [
      { value: "hotel", label: "Товари для готелю", hint: "готелі / апартаменти / хостели" },
      { value: "cleaning", label: "Засоби та інвентар для прибирання" },
      { value: "ppe", label: "Засоби індивідуального захисту" },
    ],
  },
  {
    title: "Який тип об'єкта?",
    field: "type",
    options: [
      { value: "hotel", label: "Готель / Хостел" },
      { value: "horeca", label: "Заклад HORECA" },
      { value: "medical", label: "Медичний центр / Салон краси" },
      { value: "factory", label: "Виробниче підприємство" },
    ],
  },
  {
    title: "Який орієнтовний обсяг?",
    field: "volume",
    options: [
      { value: "small", label: "Разове замовлення", hint: "до 1000 одиниць" },
      { value: "regular", label: "Регулярні поставки", hint: "щомісяця" },
      { value: "wholesale", label: "Великий обсяг", hint: "від 10 000 одиниць" },
    ],
  },
  {
    title: "Куди надіслати пропозицію?",
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
// 572:4542). The SVG slowly rotates so the text reads as a live invitation;
// useId keeps the path/textPath reference unique even when several radios
// render on the same screen.
function CircleText() {
  const pathId = useId();
  return (
    <svg
      viewBox="0 0 88 88"
      className="quiz-radio-text pointer-events-none absolute inset-0 size-full text-neutral-500"
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
  // colour with a white check on selected, white-with-stroke ellipse
  // otherwise.
  //
  // Mobile: the rotating "ОБРАТИ" circle text is dropped (the 88×88 wrapper
  // collapses to the radio itself) — on a 390 px screen with the option's
  // text + hint to its left, the curved text was visually cluttering the
  // row. Tap target is preserved via the surrounding button's min-height.
  //
  // The `group-hover/option:*` utilities react to the parent Option
  // button's hover state — the radio border tints to brand and pops
  // 10 % when the user mouses over the row, so the entire button reads
  // as one interactive element instead of just the radio.
  return (
    <span className="relative flex size-[44px] shrink-0 items-center justify-center sm:size-[88px]">
      <span className="hidden sm:block">
        <CircleText />
      </span>
      <span
        className={`relative flex size-[44px] items-center justify-center rounded-full transition-all duration-300 sm:size-10 ${
          selected
            ? "bg-brand shadow-[0_4px_16px_-4px_rgba(248,90,11,0.4)]"
            : "border-[1.5px] border-neutral-700 bg-white group-hover/option:border-brand group-hover/option:scale-110 sm:border sm:border-stroke-subtle"
        }`}
      >
        {selected && <CheckmarkIcon />}
      </span>
    </span>
  );
}

type QuizFormProps = {
  steps?: QuizStep[];
  headingTitle?: React.ReactNode;
  headingBody?: React.ReactNode;
};

export function QuizForm({
  steps: stepsProp,
  headingTitle,
  headingBody,
}: QuizFormProps = {}) {
  const STEPS = stepsProp ?? DEFAULT_STEPS;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const totalSteps = STEPS.length;

  const current = STEPS[step];
  const isContactStep = current.custom === "contact";
  const canAdvance = isContactStep
    ? (answers.name?.length ?? 0) > 1 &&
      ((answers.phone?.length ?? 0) > 5 || (answers.email ?? "").includes("@"))
    : Boolean(answers[current.field]);

  function handleSelect(value: string) {
    setAnswers((prev) => ({ ...prev, [current.field]: value }));
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
        id="contact-form"
        className="lg-pad-x bg-white px-6 py-20 sm:px-10 lg:py-[120px]"
      >
        <div className="mx-auto flex max-w-[948px] flex-col items-center gap-6 rounded-[40px] bg-bg-subtle p-12 text-center">
          <h2 className="text-h2 text-neutral-900">Дякуємо!</h2>
          <p className="max-w-md text-body-md text-neutral-500">
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
      className="lg-pad-x bg-white px-5 py-12 sm:px-10 sm:py-20 lg:py-[120px]"
    >
      <div className="flex flex-col gap-8 sm:gap-16 lg:gap-[160px]">
        <div className="flex flex-col items-start gap-5 sm:gap-8 lg:flex-row lg:gap-8">
          <h2 className="flex-1 text-neutral-900">
            {headingTitle ?? (
              <>
                <span className="text-h2">Отримайте підбір товарів </span>
                <span className="text-h2-light">{`під ваш об'єкт і бюджет`}</span>
              </>
            )}
          </h2>
          <div className="flex flex-1 flex-col gap-2 text-body-md text-neutral-500">
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

        {/* Deck stage. Every step renders as a card in the same DOM tree;
            its rel = i - step drives an absolute position via data-rel:
              rel = 0  → active card (front, full size, interactive)
              rel = 1  → next card peeking 32 px above the front
              rel = 2  → card behind that, peeking 56 px above
              rel ≥ 3  → fully tucked behind, opacity 0
              rel = -1 → just-answered card sliding 160 px down + tilted off
              rel ≤ -2 → already discarded, fully gone
            CSS transitions on transform/opacity animate every position change,
            so forward = front falls + deck shifts up by one, backward = the
            mirrored motion. No exit/enter dance, no parallel keyframe lines —
            the deck IS the animation. On <lg only the active card is visible
            with a soft fade per step (no room for the peek stack). */}
        <div className="quiz-deck mx-auto w-full max-w-[948px]">
          {STEPS.map((s, i) => {
            const rel = i - step;
            const isActive = rel === 0;
            // Clamp visible range so far-off cards collapse to the same
            // hidden state instead of teleporting through intermediate ones.
            const dataRel = String(Math.max(-2, Math.min(3, rel)));
            return (
              <div
                key={i}
                className="quiz-deck-card"
                data-rel={dataRel}
                aria-hidden={!isActive}
              >
                {/* Inner remounts when the card flips between active and
                    idle, which restarts the option stagger and resets focus
                    state cleanly per step. */}
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
                />
              </div>
            );
          })}
        </div>
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
          and question text are ever visible above the deck. Figma spec:
          gap-32, items-center, px-60 py-32. */}
      <div className="quiz-deck-card-title flex items-center gap-4 px-5 py-4 sm:gap-8 sm:px-8 sm:py-6 lg:gap-8 lg:px-[60px] lg:py-8">
        <p className="quiz-deck-card-title-meta text-body-sm text-white tabular-nums">
          {stepIndex + 1}/{totalSteps}
        </p>
        <h3 className="quiz-deck-card-title-meta text-[20px] font-semibold leading-[24px] tracking-[-0.4px] text-white sm:text-[24px] sm:leading-[28px] sm:tracking-[-0.48px] lg:text-[32px] lg:leading-[28px] lg:tracking-[-0.64px]">
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
        {/* On mobile the option list is rendered as ONE continuous
            stack — the two-column split that OptionGrid uses on lg
            otherwise creates a 32-px (gap-8) gap between the last
            left-column option and the first right-column option,
            which read as a visual break in the middle of the list.
            gap-0 below collapses that gap; the hairline border-b on
            each option (added inside Option) becomes the only visual
            separator on mobile. */}
        <div className="flex flex-col gap-0 px-5 pb-4 pt-6 sm:gap-10 sm:px-12 sm:pt-8 lg:flex-1 lg:flex-row lg:items-start lg:gap-[100px] lg:px-[60px] lg:pb-4 lg:pt-[60px]">
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
              selectedValue={answers[step.field] ?? ""}
              onSelect={onSelect}
              animate={isActive}
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
            back is rendered or not. */}
        <div className="flex items-center gap-3 px-5 pb-5 pt-4 sm:gap-4 sm:px-12 sm:pb-6 lg:px-10 lg:pb-10 lg:pt-0">
          <button
            type="button"
            onClick={onBack}
            disabled={!isActive || stepIndex === 0}
            className="cursor-pointer text-button-md text-neutral-500 transition-colors hover:text-neutral-900 disabled:hidden"
          >
            ← Назад
          </button>
          <div className="ml-auto">
            <Button type="button" onClick={onNext} disabled={!canAdvance} arrow>
              {isLast ? "Надіслати" : "Наступне питання"}
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
  selectedValue,
  onSelect,
  animate,
}: {
  options: { value: string; label: string; hint?: string }[];
  fieldKey: string;
  selectedValue: string;
  onSelect: (v: string) => void;
  animate: boolean;
}) {
  const half = Math.ceil(options.length / 2);
  const left = options.slice(0, half);
  const right = options.slice(half);

  // Per-column gap matches Figma: gap-40 (lg:gap-10) when the tallest
  // column has at most 2 options (1384:12935 — home form's 3- and
  // 4-option steps), gap-32 (lg:gap-8) when a column reaches 3 options
  // (1327:6035 — hotels' 5-option step), so 3 × 92-px options + 2 × 32-px
  // gaps = 340 px exactly fits the body's available height.
  const lgGapClass = Math.max(left.length, right.length) >= 3 ? "lg:gap-8" : "lg:gap-10";

  // Stagger entrance only fires on the active card — its CardInner just
  // remounted, so each Option starts its CSS animation fresh. The previous
  // 720-ms base waited for the desktop deck-card to fully arrive before
  // options began appearing, but on mobile (no deck) the form looked
  // frozen for the first ~750 ms. A 180-ms base + 70-ms stride is fast
  // enough that the form is interactive almost instantly, while still
  // providing a pleasant cascade on desktop where the deck-card arrival
  // is the dominant motion the eye follows.
  const baseDelay = 180;
  const stride = 70;

  // Column wrappers use gap-0 on mobile (their parent already collapses
  // the inter-column gap, and the Options stitch into one continuous
  // list via their per-row border-b). On sm+ the column-internal gap-10
  // returns the lg / tablet layout where options have explicit
  // vertical breathing room.
  return (
    <>
      <div className={`flex flex-1 flex-col gap-0 sm:gap-10 ${lgGapClass}`}>
        {left.map((opt, i) => (
          <Option
            key={`${fieldKey}-${opt.value}`}
            opt={opt}
            selected={selectedValue === opt.value}
            onSelect={onSelect}
            delayMs={animate ? i * stride + baseDelay : 0}
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
      {right.length > 0 && (
        <div className={`flex flex-1 flex-col justify-center gap-0 sm:gap-10 ${lgGapClass}`}>
          {right.map((opt, i) => (
            <Option
              key={`${fieldKey}-${opt.value}`}
              opt={opt}
              selected={selectedValue === opt.value}
              onSelect={onSelect}
              delayMs={animate ? (i + half) * stride + baseDelay : 0}
              animate={animate}
              isLast={i === right.length - 1}
            />
          ))}
        </div>
      )}
    </>
  );
}

function Option({
  opt,
  selected,
  onSelect,
  delayMs,
  animate,
  isLast,
}: {
  opt: { value: string; label: string; hint?: string };
  selected: boolean;
  onSelect: (v: string) => void;
  delayMs: number;
  animate: boolean;
  isLast: boolean;
}) {
  // group/option scopes hover state to THIS button so the inner radio
  // and label react independently of any sibling group containers. On
  // mobile the options share a hairline divider (border-b on every
  // option except the last in its column) so the list reads as a
  // structured set instead of un-bordered text blobs. active:scale-99
  // gives a small tactile bounce on tap — invisible on desktop where
  // the click is instant but felt on touch.
  return (
    <button
      type="button"
      onClick={() => onSelect(opt.value)}
      tabIndex={animate ? undefined : -1}
      className={`group/option flex min-h-[72px] w-full cursor-pointer items-center gap-4 py-4 text-left transition-transform duration-200 hover:translate-x-1 active:scale-[0.99] sm:min-h-[92px] sm:gap-8 sm:py-0 sm:active:scale-100 ${
        isLast ? "" : "border-b border-stroke-subtle sm:border-b-0"
      } ${animate ? "animate-quiz-option" : ""}`}
      style={animate ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <div className="flex flex-1 flex-col gap-1 sm:gap-2">
        <p
          className={`text-[17px] font-bold leading-[24px] transition-colors duration-200 sm:text-[20px] sm:leading-[28px] ${
            selected
              ? "text-brand"
              : "text-black group-hover/option:text-brand"
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
    <div className="flex flex-1 flex-col gap-6 self-stretch">
      <Field
        label="Ім'я"
        value={answers.name ?? ""}
        onChange={(v) => setAnswers((prev) => ({ ...prev, name: v }))}
        disabled={!interactive}
      />
      <Field
        label="Телефон"
        type="tel"
        value={answers.phone ?? ""}
        onChange={(v) => setAnswers((prev) => ({ ...prev, phone: v }))}
        disabled={!interactive}
      />
      <Field
        label="Email"
        type="email"
        value={answers.email ?? ""}
        onChange={(v) => setAnswers((prev) => ({ ...prev, email: v }))}
        disabled={!interactive}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="group/field flex cursor-text flex-col gap-2">
      <span className="text-body-sm text-neutral-500 transition-colors group-focus-within/field:text-brand">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
        className="rounded-[12px] border border-stroke-subtle bg-white px-4 py-3 text-body-md text-neutral-900 outline-none transition-colors hover:border-neutral-700 focus:border-brand"
      />
    </label>
  );
}
