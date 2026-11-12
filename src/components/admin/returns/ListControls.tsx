"use client";

import { CalendarDaysIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useCallback, useSyncExternalStore } from "react";
import { formatDate } from "../lib/format";
import { Button } from "../ui/Button";
import { DateRange } from "../ui/DateInput";
import { Popover } from "../ui/Popover";

// Controls of the returns list the kit has no ready shape for.

// "Період": the request date from / to with the kit's presets, in a card
// opened from a secondary button that names the period chosen.
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
      label="Період заявок"
      width={420}
      trigger={
        <Button variant="secondary" iconLeft={CalendarDaysIcon} iconRight={ChevronDownIcon}>
          {text}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <DateRange label="Дата заявки" from={from} to={to} onChange={onChange} presets clearable />
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

// True while the window is at least `px` wide: the table leaves a
// secondary column out entirely below the width it needs (the kit's
// hideBelow steps stop at 1280). The server and the first client render
// say false, so wide screens add the columns right after hydration.
export function useMinWidth(px: number): boolean {
  const query = `(min-width: ${px}px)`;
  const subscribe = useCallback(
    (listener: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
