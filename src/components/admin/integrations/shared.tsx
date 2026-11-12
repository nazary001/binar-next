"use client";

import { CheckIcon, KeyIcon } from "@heroicons/react/20/solid";
import { useState, type ReactNode } from "react";
import { cx } from "../lib/format";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { confirmDialog } from "../ui/ConfirmDialog";
import { Field, type FieldError } from "../ui/Field";
import { PasswordInput } from "../ui/Input";
import { SURFACE, TEXT, TONES, type Tone } from "../ui/tokens";

// Pieces the three integration pages share: the state pill of an
// integration, the numbered step card, the field of a sealed secret, the
// amber notice and a small list of facts.

// --- state of an integration ---------------------------------------------------------

export type IntegrationState = "connected" | "setup" | "off" | "error";

export const INTEGRATION_STATE: Record<IntegrationState, { label: string; tone: Tone }> = {
  connected: { label: "Підключено", tone: "green" },
  setup: { label: "Потрібне налаштування", tone: "amber" },
  off: { label: "Вимкнено", tone: "neutral" },
  error: { label: "Помилка", tone: "red" },
};

export function StatePill({ state, size = "md" }: { state: IntegrationState; size?: "sm" | "md" }) {
  const meta = INTEGRATION_STATE[state];
  return (
    <Badge tone={meta.tone} size={size} dot>
      {meta.label}
    </Badge>
  );
}

// --- steps ----------------------------------------------------------------------------

export type StepStatus = "done" | "todo" | "locked";

const STEP_BADGE: Record<StepStatus, { label: string; tone: Tone }> = {
  done: { label: "Готово", tone: "green" },
  todo: { label: "Потрібно заповнити", tone: "amber" },
  locked: { label: "Спершу попередній крок", tone: "neutral" },
};

// One step of a set-up page: a numbered white card whose number turns into
// a green check once the step is complete, with its state as a pill.
export function StepCard({
  n,
  title,
  description,
  status,
  badge,
  children,
  id,
}: {
  n: number;
  title: string;
  description?: ReactNode;
  status?: StepStatus;
  // A pill of the step's own (overrides the status pill).
  badge?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  const done = status === "done";
  const headingId = `${id ?? `step-${n}`}-title`;
  return (
    <section id={id} aria-labelledby={headingId} className={cx(SURFACE.card, SURFACE.cardPadding, "min-w-0")}>
      <div className="flex items-start gap-3 min-[640px]:gap-4">
        <span
          aria-hidden
          className={cx(
            "flex size-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold tabular-nums",
            done ? "text-white" : status === "locked" ? "bg-bg-cabinet text-neutral-400" : "bg-neutral-900 text-white",
          )}
          style={done ? { backgroundColor: TONES.green.dot } : undefined}
        >
          {done ? <CheckIcon className="size-5" /> : n}
        </span>
        <div className="min-w-0 flex-1 pt-1.5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <h2 id={headingId} className={TEXT.cardTitle}>
              <span className="sr-only">Крок {n}. </span>
              {title}
            </h2>
            {badge ?? (status && <Badge tone={STEP_BADGE[status].tone}>{STEP_BADGE[status].label}</Badge>)}
          </div>
          {description && <div className={cx(TEXT.muted, "mt-1")}>{description}</div>}
        </div>
      </div>
      <div className="mt-5 min-w-0 min-[640px]:pl-[52px]">{children}</div>
    </section>
  );
}

// --- notices ----------------------------------------------------------------------------

// A quiet tinted block inside a card or on the slab: amber = something to
// do, red = something failed, green = it worked, neutral = a note.
export function Notice({
  tone = "amber",
  title,
  children,
  icon,
  action,
  className,
}: {
  tone?: "amber" | "red" | "green" | "neutral" | "blue";
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const colors = TONES[tone];
  return (
    <div
      className={cx(
        "flex min-w-0 flex-col gap-3 rounded-2xl px-4 py-3 min-[640px]:flex-row min-[640px]:items-center",
        className,
      )}
      style={{ backgroundColor: colors.bg }}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {icon && (
          <span aria-hidden className="mt-0.5 flex shrink-0 [&>svg]:size-5" style={{ color: colors.dot }}>
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {title && (
            <p className="text-[14px] font-semibold leading-5" style={{ color: colors.text }}>
              {title}
            </p>
          )}
          {children && (
            <div className={cx("text-[13px] leading-[18px] text-neutral-800 [overflow-wrap:anywhere]", title ? "mt-0.5" : null)}>{children}</div>
          )}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

// --- facts ------------------------------------------------------------------------------

// Label on the left, value on the right, hairlines between: the live facts
// of an integration card.
export function FactList({ items, className }: { items: { label: string; value: ReactNode; hint?: ReactNode }[]; className?: string }) {
  return (
    <dl className={cx("flex min-w-0 flex-col divide-y divide-stroke-subtle", className)}>
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
          <dt className={cx(TEXT.muted, "shrink-0")}>{item.label}</dt>
          <dd className="flex min-w-0 flex-col items-end text-right">
            <span className={cx(TEXT.bodyStrong, "tabular-nums [overflow-wrap:anywhere]")}>{item.value}</span>
            {item.hint && <span className={cx(TEXT.caption, "[overflow-wrap:anywhere]")}>{item.hint}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// Small figures side by side (label over value), two to four in a row.
export function FactGrid({ items, className }: { items: { label: string; value: ReactNode; hint?: ReactNode }[]; className?: string }) {
  return (
    <dl className={cx("grid min-w-0 grid-cols-2 gap-x-6 gap-y-4 xl:grid-cols-4", className)}>
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-0.5">
          <dt className={TEXT.caption}>{item.label}</dt>
          <dd className={cx(TEXT.bodyStrong, "tabular-nums [overflow-wrap:anywhere]")}>{item.value}</dd>
          {item.hint && <dd className={cx(TEXT.caption, "[overflow-wrap:anywhere]")}>{item.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}

// The errors left after a change of some fields: an error under a field
// goes away as soon as the field is edited ("sender" also clears
// "sender.phone" and the like).
export function withoutErrors(errors: Record<string, string>, names: string[]): Record<string, string> {
  if (names.length === 0) return errors;
  const next: Record<string, string> = {};
  let changed = false;
  for (const [key, value] of Object.entries(errors)) {
    if (names.some((name) => key === name || key.startsWith(`${name}.`))) changed = true;
    else next[key] = value;
  }
  return changed ? next : errors;
}

// --- a sealed secret ----------------------------------------------------------------------

export type SecretStored = { has: boolean; hint: string; readable?: boolean };

// The field of a secret the server keeps sealed (a carrier key, a mail
// key, a password): never prefilled. With a secret stored it shows only
// its hint ("****abcd") with "Замінити" / "Видалити"; replacing opens an
// empty password field; removing waits for the page's save button, like
// every other change of the form.
//
// The parent keeps what will be sent: `value` (typed, sent when not
// empty) and `removing` (send "" / null to remove the stored one).
export function SecretField({
  label,
  hint,
  stored,
  value,
  onChange,
  removing,
  onRemovingChange,
  canEdit,
  error,
  placeholder,
  nouns,
  disabled = false,
  id,
}: {
  label: string;
  hint?: ReactNode;
  stored: SecretStored;
  value: string;
  onChange: (value: string) => void;
  removing: boolean;
  onRemovingChange: (removing: boolean) => void;
  canEdit: boolean;
  error?: FieldError;
  placeholder?: string;
  // How the buttons and the questions name the secret: { what: "ключ", whatGen: "ключа" }.
  nouns: { what: string; replace: string; remove: string; removeQuestion: string; removeText: string };
  disabled?: boolean;
  id?: string;
}) {
  const [replacing, setReplacing] = useState(false);

  if (stored.has && removing) {
    return (
      <Field label={label} error={error}>
        <div className={cx(SURFACE.inset, "flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2")}>
          <span className={cx(TEXT.body, "text-neutral-700")}>
            {nouns.what[0].toUpperCase() + nouns.what.slice(1)} буде видалено, щойно ви збережете зміни.
          </span>
          <Button size="sm" variant="ghost" onClick={() => onRemovingChange(false)}>
            Не видаляти
          </Button>
        </div>
      </Field>
    );
  }

  if (stored.has && !replacing) {
    const unreadable = stored.readable === false;
    return (
      <Field
        label={label}
        hint={unreadable ? undefined : hint}
        error={
          error ??
          (unreadable
            ? `Збережений ${nouns.what} не відкривається: на сервері змінився ключ шифрування. Введіть ${nouns.what} ще раз.`
            : undefined)
        }
      >
        <div className={cx(SURFACE.inset, "flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-2 py-1.5 pl-4 pr-1.5")}>
          <span className="flex min-w-0 items-center gap-2">
            <KeyIcon aria-hidden className="size-4 shrink-0 text-neutral-500" />
            <span className={TEXT.body}>Збережено</span>
            <span className="tabular-nums tracking-[0.04em] text-neutral-500" aria-label={`закінчується на ${stored.hint.replace(/\*/g, "")}`}>
              {stored.hint}
            </span>
          </span>
          {canEdit && (
            <span className="flex flex-wrap items-center gap-1">
              <Button size="sm" variant="secondary" disabled={disabled} onClick={() => setReplacing(true)}>
                {nouns.replace}
              </Button>
              <Button
                size="sm"
                variant="dangerGhost"
                disabled={disabled}
                onClick={async () => {
                  const yes = await confirmDialog({
                    title: nouns.removeQuestion,
                    text: nouns.removeText,
                    confirmLabel: nouns.remove,
                    tone: "danger",
                  });
                  if (yes) onRemovingChange(true);
                }}
              >
                {nouns.remove}
              </Button>
            </span>
          )}
        </div>
      </Field>
    );
  }

  return (
    <PasswordInput
      id={id}
      label={label}
      hint={hint}
      error={error}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete="off"
      disabled={disabled || !canEdit}
      labelAction={
        stored.has && canEdit ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onChange("");
              setReplacing(false);
            }}
          >
            Не замінювати
          </Button>
        ) : undefined
      }
    />
  );
}
