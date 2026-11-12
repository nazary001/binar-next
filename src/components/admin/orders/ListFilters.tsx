"use client";

import { CalendarDaysIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import { cx, formatDate } from "../lib/format";
import { Button } from "../ui/Button";
import { CountBadge } from "../ui/Badge";
import { Checkbox } from "../ui/Checkbox";
import { DateRange } from "../ui/DateInput";
import { Popover } from "../ui/Popover";
import { COLOR_TRANSITION, FOCUS_RING, TEXT, TONES } from "../ui/tokens";

// Filter controls of the orders list that the kit has no ready shape for:
// a multi-choice of states in a popover (the states drawn as their
// badges), the period in a popover, and the quick presets above the table.

export type BadgeChoice<K extends string> = { value: K; badge: ReactNode };

// "Статус" / "Оплата": a secondary button with the number of chosen
// states; the card lists every state as a checkbox with its badge. Each
// tick applies at once (the list follows the address bar).
export function BadgeFilter<K extends string>({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: readonly BadgeChoice<K>[];
  value: readonly K[];
  onChange: (next: K[]) => void;
}) {
  const chosen = new Set<K>(value);
  const toggle = (key: K, on: boolean) => {
    const next = new Set(chosen);
    if (on) next.add(key);
    else next.delete(key);
    // Kept in the order of the choices, so the address stays stable.
    onChange(choices.filter((choice) => next.has(choice.value)).map((choice) => choice.value));
  };
  return (
    <Popover
      label={`Фільтр: ${label.toLowerCase()}`}
      width={260}
      trigger={
        <Button variant="secondary" iconRight={ChevronDownIcon}>
          <span className="inline-flex items-center gap-2">
            {label}
            {value.length > 0 && <CountBadge value={value.length} tone="neutral" label={`Обрано: ${value.length}`} />}
          </span>
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <p className={TEXT.caption}>Показати замовлення зі станом</p>
        <div className="flex flex-col gap-2.5">
          {choices.map((choice) => (
            <Checkbox key={choice.value} checked={chosen.has(choice.value)} onChange={(on) => toggle(choice.value, on)} label={choice.badge} />
          ))}
        </div>
        {value.length > 0 && (
          <div className="border-t border-stroke-subtle pt-3">
            <Button variant="ghost" size="sm" onClick={() => onChange([])}>
              Показати всі
            </Button>
          </div>
        )}
      </div>
    </Popover>
  );
}

// "Період": the order date from / to with the kit's presets, in a card.
export function PeriodFilter({ from, to, onChange }: { from: string; to: string; onChange: (range: { from: string; to: string }) => void }) {
  const active = from !== "" || to !== "";
  const text = !active
    ? "Період"
    : from && to
      ? from === to
        ? formatDate(from)
        : `${formatDate(from)} - ${formatDate(to)}`
      : from
        ? `Від ${formatDate(from)}`
        : `До ${formatDate(to)}`;
  return (
    <Popover
      label="Період замовлень"
      width={420}
      trigger={
        <Button variant="secondary" iconLeft={CalendarDaysIcon} iconRight={ChevronDownIcon}>
          {text}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <DateRange label="Дата замовлення" from={from} to={to} onChange={onChange} presets clearable />
        {active && (
          <div className="border-t border-stroke-subtle pt-3">
            <Button variant="ghost" size="sm" onClick={() => onChange({ from: "", to: "" })}>
              За весь час
            </Button>
          </div>
        )}
      </div>
    </Popover>
  );
}

// A quick preset above the table: a pill that switches one filter on and
// off, with the number of orders it would show (orange when something
// waits for staff).
export function PresetChip({
  label,
  count,
  pressed,
  onToggle,
}: {
  label: string;
  count: number | null;
  pressed: boolean;
  onToggle: () => void;
}) {
  const counted = count !== null && count > 0;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cx(
        "inline-flex h-9 max-w-full shrink-0 cursor-pointer items-center gap-2 rounded-full border text-[14px] font-semibold leading-5 motion-reduce:transition-none",
        counted ? "pl-4 pr-2" : "px-4",
        COLOR_TRANSITION,
        FOCUS_RING,
        pressed
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-transparent bg-white text-neutral-800 hover:border-neutral-800",
      )}
    >
      <span className="truncate">{label}</span>
      {counted && (
        <span
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none tabular-nums"
          style={pressed ? { backgroundColor: "#ffffff", color: TONES.orange.text } : { backgroundColor: TONES.brand.bg, color: TONES.brand.text }}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
