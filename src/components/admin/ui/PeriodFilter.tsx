"use client";

import { CalendarDaysIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { formatDate } from "../lib/format";
import { Button } from "./Button";
import { DateRange, type DatePreset, type DateRangeValue } from "./DateInput";
import { Popover } from "./Popover";
import type { ControlSize } from "./tokens";

// PeriodFilter: the "Період" control of a list. A secondary button that
// names the chosen range ("Період", "12.11.2026", "01.11.2026 - 12.11.2026",
// "Від 01.11.2026", "До 12.11.2026") and opens a card with the two dates,
// the presets and "За весь час". Each change applies at once (the list
// follows the address bar).
//
//   <PeriodFilter
//     label="Період замовлень"
//     fieldLabel="Дата замовлення"
//     from={list.get("from")}
//     to={list.get("to")}
//     onChange={({ from, to }) => list.set({ from, to })}
//   />
//
// Props
// - from / to: "YYYY-MM-DD" or ""; onChange({ from, to }).
// - label: the card's accessible name ("Період" by default); fieldLabel:
//   the label over the two dates ("Дата" by default).
// - presets: as DateRange (true = the four standard ones, the default; a
//   list of your own; false = none).
// - placeholder: the button's text with no range ("Період").
// - clearLabel: the button that drops the range ("За весь час").
// - min / max ("YYYY-MM-DD"), size (of the trigger, "md" default), width
//   (of the card, 420 px), disabled.
// The same card the orders, returns and leads lists had each written.

export type PeriodFilterProps = {
  from: string;
  to: string;
  onChange: (range: DateRangeValue) => void;
  label?: string;
  fieldLabel?: string;
  presets?: boolean | readonly DatePreset[];
  placeholder?: string;
  clearLabel?: string;
  min?: string;
  max?: string;
  size?: ControlSize;
  width?: number;
  disabled?: boolean;
};

// The button's text for a range.
export function periodText(from: string, to: string, placeholder = "Період"): string {
  if (!from && !to) return placeholder;
  if (from && to) return from === to ? formatDate(from) : `${formatDate(from)} - ${formatDate(to)}`;
  return from ? `Від ${formatDate(from)}` : `До ${formatDate(to)}`;
}

export function PeriodFilter({
  from,
  to,
  onChange,
  label = "Період",
  fieldLabel = "Дата",
  presets = true,
  placeholder = "Період",
  clearLabel = "За весь час",
  min,
  max,
  size = "md",
  width = 420,
  disabled = false,
}: PeriodFilterProps) {
  const active = from !== "" || to !== "";
  const trigger = (
    <Button variant="secondary" size={size} iconLeft={CalendarDaysIcon} iconRight={ChevronDownIcon} disabled={disabled}>
      {periodText(from, to, placeholder)}
    </Button>
  );
  if (disabled) return trigger;
  return (
    <Popover label={label} width={width} trigger={trigger}>
      <div className="flex flex-col gap-3">
        <DateRange label={fieldLabel} from={from} to={to} onChange={onChange} presets={presets} min={min} max={max} clearable />
        {active && (
          <div className="border-t border-stroke-subtle pt-3">
            <Button variant="ghost" size="sm" onClick={() => onChange({ from: "", to: "" })}>
              {clearLabel}
            </Button>
          </div>
        )}
      </div>
    </Popover>
  );
}
