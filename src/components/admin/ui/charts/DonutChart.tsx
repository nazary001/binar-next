"use client";

import { useState } from "react";
import { cx, formatNumber } from "../../lib/format";
import { TEXT } from "../tokens";
import { formatPercent, numberOf } from "./scale";

// Part-to-whole at a glance, for a handful of parts (up to six; more parts
// belong in a ranked BarChart or a table). A ring with a 2-px gap between
// segments, an optional figure in the hole, and a legend list beside it
// with every label, value and share, so nothing depends on colour alone.
//
//   <DonutChart
//     label="Замовлення за каналами"
//     data={[
//       { label: "Партнери B2B", value: 812, color: "#1d1d1f" },
//       { label: "Роздріб", value: 436, color: "#f85a0b" },
//     ]}
//     centerValue="1 248"
//     centerLabel="замовлень"
//   />
//
// Props
// - data: { label, value, color }[]; take the colours in the kit's order
//   (CHART_COLORS from ./scale) so a part keeps its colour across screens.
// - size: px of the ring (default 180).
// - centerLabel / centerValue: the figure in the hole (usually the total).
//   Hovering a segment or a legend line shows that part there instead.
// - formatValue: values in the legend and the hole (default formatNumber).
// - label: the accessible name of the group.
// - fit: how it chooses between the ring above the legend and the two side
//   by side. "viewport" (default): side by side from a 640-px window.
//   "container": side by side when its own box is at least 420 px wide (a
//   container query), so a narrow card of a wide page keeps the column and
//   a wide card of a narrow page goes side by side. "column" / "row":
//   always the one or the other.
//
// Fixed size, no measuring: safe to render on the server.

export type DonutDatum = { label: string; value: number; color: string };

export type DonutChartProps = {
  data: DonutDatum[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
  formatValue?: (value: number) => string;
  label?: string;
  fit?: "viewport" | "container" | "column" | "row";
  className?: string;
};

// The layout of the ring and the legend, by `fit` (whole literal classes).
const FIT: Record<NonNullable<DonutChartProps["fit"]>, string> = {
  viewport: "flex-col items-center gap-5 min-[640px]:flex-row min-[640px]:items-center min-[640px]:gap-6",
  container: "flex-col items-center gap-5 @min-[420px]:flex-row @min-[420px]:items-center @min-[420px]:gap-6",
  column: "flex-col items-center gap-5",
  row: "flex-row items-center gap-6",
};

const GAP = 2;
const plainValue = (value: number) => formatNumber(value);

export function DonutChart({
  data,
  size = 180,
  centerLabel,
  centerValue,
  formatValue = plainValue,
  label,
  fit = "viewport",
  className,
}: DonutChartProps) {
  const [active, setActive] = useState<number | null>(null);

  const values = data.map((datum) => Math.max(0, numberOf(datum.value)));
  const total = values.reduce((sum, value) => sum + value, 0);
  const thickness = Math.round(size * 0.14);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const parts = values.filter((value) => value > 0).length;
  const shown = active !== null && active < data.length && values[active] > 0 ? active : null;

  // Where each segment starts along the ring.
  const starts: number[] = [];
  values.reduce((offset, value) => {
    starts.push(offset);
    return offset + (total > 0 ? (value / total) * circumference : 0);
  }, 0);

  const share = (value: number) => (total > 0 ? (value / total) * 100 : 0);
  const hole = shown !== null ? { value: formatValue(values[shown]), label: data[shown].label } : { value: centerValue, label: centerLabel };

  const chart = (
    <div role="group" aria-label={label} className={cx("flex min-w-0", FIT[fit], fit !== "container" && className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="block -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#ececed" strokeWidth={thickness} />
          {total > 0 &&
            values.map((value, i) => {
              if (value <= 0) return null;
              const length = (value / total) * circumference;
              const gap = parts > 1 ? GAP : 0;
              return (
                <circle
                  key={`${data[i].label}-${i}`}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={data[i].color}
                  strokeWidth={thickness}
                  strokeDasharray={`${Math.max(0.5, length - gap).toFixed(2)} ${circumference.toFixed(2)}`}
                  strokeDashoffset={(-starts[i]).toFixed(2)}
                  strokeOpacity={shown !== null && shown !== i ? 0.35 : 1}
                  className="cursor-default transition-[stroke-opacity] duration-200 motion-reduce:transition-none"
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                />
              );
            })}
        </svg>
        <div
          className="pointer-events-none absolute flex flex-col items-center justify-center text-center"
          style={{ inset: thickness + 6 }}
          aria-hidden={shown !== null}
        >
          {total === 0 ? (
            <span className={TEXT.caption}>Немає даних</span>
          ) : (
            <>
              {hole.value && (
                <span className="max-w-full truncate text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-neutral-900 tabular-nums">
                  {hole.value}
                </span>
              )}
              {hole.label && <span className={cx(TEXT.caption, "line-clamp-2 max-w-full")}>{hole.label}</span>}
            </>
          )}
        </div>
      </div>

      <ul className="flex w-full min-w-0 flex-1 flex-col">
        {data.map((datum, i) => (
          <li
            key={`${datum.label}-${i}`}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
            className={cx(
              "flex items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-200 motion-reduce:transition-none",
              shown === i && "bg-bg-subtle",
            )}
          >
            <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: datum.color }} />
            <span className={cx(TEXT.body, "min-w-0 flex-1 truncate")}>{datum.label}</span>
            <span className="whitespace-nowrap text-[14px] font-semibold leading-5 text-neutral-900 tabular-nums">
              {formatValue(values[i])}
            </span>
            <span className="w-14 shrink-0 text-right text-[13px] leading-[18px] text-neutral-500 tabular-nums">
              {formatPercent(share(values[i]))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
  // A container query needs a box of its own around the flex row.
  return fit === "container" ? <div className={cx("@container min-w-0", className)}>{chart}</div> : chart;
}
