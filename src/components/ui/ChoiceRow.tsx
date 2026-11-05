"use client";

import { useId, type ReactNode } from "react";
import { CheckboxOffIcon, CheckboxOnIcon } from "@/components/catalog/icons";

// Choice rows (TR-22, system spec A24) = the quiz option of the Quizz Card
// (3111:14541; built in the frozen landing QuizForm.tsx Option +
// RadioMarker, copied here): the whole row is a <label> around a visually
// hidden native input, the text column left (label 16/24 Bold #000,
// brand when chosen - an accepted contrast exception with the filled
// marker as the second cue; hint 14/20 #777779), the 40-px marker right
// (radio: 1.5-px brand ring on white / brand fill + white check; checkbox:
// the 24-px catalog glyphs in a 40 box). Row box 40 (min-h-10) + a 44 hit
// from the `after:` pseudo; rows sit 40 apart (`gap-10`), so the hit boxes
// never overlap. `labelTone="control"` = the 16/22 Medium #343435 label of
// a plain control row (select-all checkbox of the return wizard). No
// disabled look (DECISIONS round 3): add one with its consumer.
const TEXT_OPTION = "text-[16px] font-bold leading-6";
const TEXT_CONTROL = "text-[16px] font-medium leading-[22px] text-neutral-800";

function CheckMark() {
  return (
    <svg viewBox="0 0 18 12" fill="none" aria-hidden className="h-3 w-[18px]">
      <path d="M1.5 6L7 11L17 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChoiceRow({
  type,
  name,
  value,
  checked,
  onChange,
  label,
  hint,
  invalid,
  describedBy,
  labelTone = "option",
}: {
  type: "radio" | "checkbox";
  name: string;
  value?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  invalid?: boolean;
  describedBy?: string;
  labelTone?: "option" | "control";
}) {
  const labelClass =
    labelTone === "control" ? TEXT_CONTROL : `${TEXT_OPTION} ${checked ? "text-brand" : "text-black"}`;
  const ring =
    "peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2";
  return (
    <label
      className="relative flex min-h-10 w-full cursor-pointer items-center gap-4 text-left after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-['']"
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        className="peer sr-only"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={labelClass}>{label}</span>
        {hint && <span className="text-[14px] leading-5 text-neutral-500">{hint}</span>}
      </span>
      {type === "radio" ? (
        <span
          aria-hidden
          className={`relative flex size-10 shrink-0 items-center justify-center rounded-full ${ring} ${
            checked ? "bg-brand" : "border-[1.5px] border-brand bg-white"
          }`}
        >
          {checked && <CheckMark />}
        </span>
      ) : (
        <span aria-hidden className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${ring}`}>
          {checked ? (
            <CheckboxOnIcon className="size-6 text-brand" />
          ) : (
            <CheckboxOffIcon className="size-6 text-neutral-900" />
          )}
        </span>
      )}
    </label>
  );
}

// A labelled radio group of ChoiceRows (checkout delivery / payment,
// cancel reasons, wizard steps): legend 14/20 Medium #777779, 16, rows
// 40 apart; the error 12/16 Medium #d92d20 8 under the last row
// (`aria-invalid` + `aria-describedby` on the group). Native radios
// sharing `name` give the arrow-key model.
export function RadioGroup({
  name,
  label,
  options,
  value,
  onChange,
  error,
  className = "",
}: {
  name: string;
  label: string;
  options: { value: string; label: string; hint?: string }[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
  className?: string;
}) {
  const id = useId();
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      className={`flex flex-col gap-4 ${className}`}
    >
      <p id={labelId} className="text-[14px] font-medium leading-5 text-neutral-500">
        {label}
      </p>
      <div className="flex flex-col">
        <div className="flex flex-col gap-10">
          {options.map((o) => (
            <ChoiceRow
              key={o.value}
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={(c) => {
                if (c) onChange(o.value);
              }}
              label={o.label}
              hint={o.hint}
              invalid={Boolean(error)}
            />
          ))}
        </div>
        {error && (
          <p id={errorId} className="pt-2 text-[12px] font-medium leading-4 text-negative">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
