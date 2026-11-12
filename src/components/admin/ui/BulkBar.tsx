"use client";

import { useRef, type ReactNode } from "react";
import { cx } from "../lib/format";
import { Button } from "./Button";
import { useStickyBar } from "./stickyBars";
import { FLOAT_SHADOW, TEXT, Z } from "./tokens";

// BulkBar: what can be done with the rows chosen in a DataTable, on a
// white r24 bar stuck to the bottom of the window (the look of FormActions
// sticky). It shows only while something is chosen.
//
//   <DataTable selection={{ selected, onChange: setSelected }} ... />
//   <BulkBar
//     count={selected.length}
//     label={`Вибрано ${countOf(selected.length, PRODUCT_FORMS)}`}
//     onClear={() => setSelected([])}
//     region="Дії з вибраними товарами"
//   >
//     <Button size="sm" variant="secondary" onClick={publish}>Показати в каталозі</Button>
//     <Button size="sm" variant="dangerGhost" onClick={archive}>В архів</Button>
//   </BulkBar>
//
// Props
// - count: how many rows are chosen; 0 renders nothing.
// - label: the line on the left ("Вибрано 3 товари"; default "Вибрано: 3").
// - onClear: shows "Зняти вибір" (a ghost sm button) next to the label.
// - region: the accessible name of the bar (role="region").
// - children: the actions (sm buttons; a busy one with loading, the others
//   disabled meanwhile).
// - sticky (default true): false puts it in the flow (inside a drawer).
// - className.
// From 1024 px the label and the actions share one row; under it they
// stack. While it is on screen the toast stack rises above it.

export type BulkBarProps = {
  count: number;
  label?: ReactNode;
  onClear?: () => void;
  region?: string;
  children: ReactNode;
  sticky?: boolean;
  className?: string;
};

export function BulkBar({ count, label, onClear, region = "Дії з вибраними записами", children, sticky = true, className }: BulkBarProps) {
  const bar = useRef<HTMLDivElement>(null);
  const shown = count > 0;
  useStickyBar(bar, shown && sticky);
  if (!shown) return null;
  return (
    <div
      ref={bar}
      role="region"
      aria-label={region}
      data-sticky-bar={sticky ? "" : undefined}
      className={cx(
        "mt-4 flex flex-col gap-3 rounded-3xl bg-white p-3 min-[1024px]:flex-row min-[1024px]:items-center min-[1024px]:px-4",
        sticky && cx("sticky bottom-4", FLOAT_SHADOW, Z.sticky),
        className,
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-3 min-[1024px]:flex-1 min-[1024px]:justify-start">
        <p className={TEXT.bodyStrong} aria-live="polite">
          {label ?? `Вибрано: ${count}`}
        </p>
        {onClear && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Зняти вибір
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
