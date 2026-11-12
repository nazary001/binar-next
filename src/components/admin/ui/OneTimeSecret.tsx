"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import { cx } from "../lib/format";
import { CopyButton } from "./KeyValue";
import { TEXT, TONES } from "./tokens";

// A secret shown once: the sign-in, the e-mail and a generated password of
// a new account, a fresh API key. Each line has its copy button; under
// them the steps for the person who receives it (optional) and the
// warning that it will not be shown again.
//
//   <OneTimeSecret
//     items={[
//       { label: "Логін", value: loginText(login), copy: login },
//       { label: "Пароль", value: password, secret: true },
//     ]}
//   />
//   <OneTimeSecret
//     items={[
//       { label: "Адреса для входу", value: url },
//       { label: "E-mail", value: email },
//       { label: "Тимчасовий пароль", value: password, secret: true, copyLabel: "Пароль" },
//     ]}
//     steps={["Людина відкриває адресу для входу ...", "Панель одразу попросить задати власний пароль ..."]}
//   />
//   <OneTimeSecret items={[{ label: "Ключ", value: key, secret: true }]} warning="Ключ показано один раз ..." />
//
// Props
// - items: { label, value, copy?, copyLabel?, secret?, testId? }[]. `copy`
//   is the text the button writes (default: `value` when it is a string;
//   false for no button); `copyLabel` names the button ("Скопіювати:
//   Пароль", default the label). `secret` draws the value large, spaced
//   and in tabular figures (a password, a key), so it reads out well over
//   the phone. `testId` lands on the value as data-testid for checks.
// - steps: what the receiver does next, as a numbered list.
// - warning: the amber note under it all (default: the password is shown
//   once and stored nowhere in the open). null hides it.
// - className: on the outer column.

export type OneTimeSecretItem = {
  label: string;
  value: ReactNode;
  copy?: string | false;
  copyLabel?: string;
  secret?: boolean;
  testId?: string;
};

export type OneTimeSecretProps = {
  items: OneTimeSecretItem[];
  steps?: ReactNode[];
  warning?: ReactNode;
  className?: string;
};

const DEFAULT_WARNING =
  "Пароль показано один раз і ніде не збережено у відкритому вигляді. Скопіюйте його й передайте людині зараз: після закриття вікна його вже не можна буде подивитися.";

const SECRET = "min-w-0 text-[18px] font-semibold leading-7 tracking-[0.04em] text-neutral-900 tabular-nums [overflow-wrap:anywhere]";

export function OneTimeSecret({ items, steps, warning = DEFAULT_WARNING, className }: OneTimeSecretProps) {
  return (
    <div className={cx("flex flex-col gap-4", className)}>
      <dl className="flex flex-col divide-y divide-stroke-subtle rounded-2xl bg-bg-subtle px-4">
        {items.map((item, index) => {
          const copy = item.copy === false ? null : (item.copy ?? (typeof item.value === "string" ? item.value : null));
          return (
            <div key={`${item.label}-${index}`} className="flex min-w-0 flex-col gap-1 py-3">
              <dt className={TEXT.caption}>{item.label}</dt>
              <dd className="flex min-w-0 items-center gap-1">
                <span className={item.secret ? SECRET : cx(TEXT.bodyStrong, "min-w-0 [overflow-wrap:anywhere]")} data-testid={item.testId}>
                  {item.value}
                </span>
                {copy !== null && copy !== "" && <CopyButton text={copy} label={item.copyLabel ?? item.label} />}
              </dd>
            </div>
          );
        })}
      </dl>
      {steps && steps.length > 0 && (
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-[14px] leading-5 text-neutral-800 marker:text-neutral-500">
          {steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      )}
      {warning !== null && warning !== undefined && warning !== false && (
        <p
          className="flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[13px] leading-[18px]"
          style={{ backgroundColor: TONES.amber.bg, color: TONES.amber.text }}
        >
          <ExclamationTriangleIcon aria-hidden className="mt-px size-4 shrink-0" strokeWidth={1.8} />
          <span className="min-w-0">{warning}</span>
        </p>
      )}
    </div>
  );
}
