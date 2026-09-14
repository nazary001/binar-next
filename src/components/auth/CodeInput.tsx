"use client";

import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { CODE_LENGTH } from "./data";

// «Code» — the SMS code row (4573:35491): four 57 x 70 «Number item»
// boxes 16 px apart, 1-px #8e8e8f ring, r4, the digit in 20/28 Regular
// centred, brand caret in the active box (the master draws an orange
// «Cursor» in the first one). Under the row the 23-px helper zone
// carries the error («Невірний код») in the negative colour. Typing
// moves to the next box, Backspace steps back, arrows move, and a
// pasted «0000» fills the row.
export function CodeInput({
  value,
  onChange,
  error,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const focusBox = (i: number) => {
    refs.current[Math.max(0, Math.min(CODE_LENGTH - 1, i))]?.focus();
  };

  const setDigit = (i: number, d: string) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join(""));
  };

  const onInput = (i: number, raw: string) => {
    const typed = raw.replace(/\D/g, "");
    if (!typed) {
      setDigit(i, "");
      return;
    }
    // A box already holding a digit receives the newest character.
    const d = typed[typed.length - 1];
    if (typed.length > 1 && i === 0 && typed.length >= CODE_LENGTH) {
      onChange(typed.slice(0, CODE_LENGTH));
      focusBox(CODE_LENGTH - 1);
      return;
    }
    setDigit(i, d);
    if (i < CODE_LENGTH - 1) focusBox(i + 1);
  };

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[i]) {
        setDigit(i, "");
      } else if (i > 0) {
        setDigit(i - 1, "");
        focusBox(i - 1);
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      focusBox(i - 1);
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      focusBox(i + 1);
      e.preventDefault();
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted.slice(0, CODE_LENGTH));
    focusBox(Math.min(pasted.length, CODE_LENGTH) - 1);
  };

  return (
    <div>
      <div
        role="group"
        aria-label="Код із SMS"
        className="flex items-start gap-4"
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            pattern="[0-9]*"
            maxLength={CODE_LENGTH}
            aria-label={`Цифра ${i + 1} з ${CODE_LENGTH}`}
            aria-invalid={error ? true : undefined}
            disabled={disabled}
            value={d}
            onChange={(e) => onInput(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            onPaste={onPaste}
            onFocus={(e) => e.target.select()}
            className={`h-[70px] w-[57px] rounded border bg-white text-center text-[20px] leading-7 text-neutral-900 caret-brand outline-none transition-[border-color,box-shadow] duration-200 focus:border-brand focus:[box-shadow:inset_0_0_0_1px_var(--color-brand)] disabled:text-neutral-300 ${
              error
                ? "border-negative [box-shadow:inset_0_0_0_1px_var(--color-negative)] focus:border-negative focus:[box-shadow:inset_0_0_0_1px_var(--color-negative)]"
                : "border-stroke-default"
            }`}
          />
        ))}
      </div>
      <p
        role={error ? "alert" : undefined}
        className="min-h-[23px] px-2 pt-[3px] text-[12px] font-medium leading-5 tracking-[0.15px] text-negative"
      >
        {error}
      </p>
    </div>
  );
}
