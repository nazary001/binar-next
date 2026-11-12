"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cx, formatNumber } from "../../lib/format";
import { FLOAT_SHADOW, FOCUS_RING, TEXT } from "../tokens";
import {
  CHART_BASELINE,
  CHART_CROSSHAIR,
  CHART_GRID,
  CHART_TEXT,
  formatCompact,
  linear,
  niceScale,
  numberOf,
  seriesColor,
  textWidth,
  labelStep,
} from "./scale";
import { useChartWidth } from "./useChartWidth";

// A change-over-time chart: straight lines with a soft area wash, a hairline
// grid with about four y ticks, x labels thinned to fit, and a crosshair
// with one tooltip card listing every series at that point.
//
//   <AreaChart
//     label="Виручка і замовлення за 12 тижнів"
//     data={[{ x: "2026-09-01", revenue: 182400, orders: 41 }, ...]}
//     series={[{ key: "revenue", label: "Виручка" }, { key: "orders", label: "Замовлення" }]}
//     formatX={(x) => formatDayMonth(x)}
//     formatValue={(value, key) => (key === "revenue" ? formatMoney(value, { whole: true }) : formatNumber(value))}
//   />
//
// Props
// - data: one object per x position; `x` is the label key, every other key
//   is a series value (numbers; anything else counts as 0).
// - series: which keys to draw, in the fixed colour order (ink, brand,
//   indigo, green, amber, blue); `color` overrides one. Two or more series
//   get a legend, so identity never rests on colour alone.
// - height: px of the plot box (default 240).
// - formatY: y tick labels (default: in full under 10 000, then compact).
// - formatX: x labels and the tooltip title (default: as given).
// - formatValue: values in the tooltip and the table (default formatNumber).
// - stacked: series are stacked on top of each other (parts of a total);
//   the tooltip then adds the total.
// - label: the accessible name; also the caption of the hidden data table.
// - xLabel: the header of the x column of that table (default "Період").
//
// Keyboard: Tab focuses the plot, arrows move the crosshair, Home / End
// jump to the ends, Escape hides it; each move is announced. Screen readers
// also get the whole series as a visually hidden table. The chart draws
// nothing but its box until it has measured its width (no hydration
// mismatch); the width follows the card on resize.

export type AreaSeries = { key: string; label: string; color?: string };
export type AreaDatum = { x: string; [series: string]: number | string };

export type AreaChartProps = {
  data: AreaDatum[];
  series: AreaSeries[];
  height?: number;
  formatY?: (value: number) => string;
  formatX?: (x: string) => string;
  formatValue?: (value: number, key: string) => string;
  stacked?: boolean;
  label?: string;
  xLabel?: string;
  className?: string;
};

const PAD_TOP = 10;
const PAD_RIGHT = 8;
const PAD_BOTTOM = 28;
const AREA_OPACITY = 0.12;

const identity = (x: string) => x;
const plainValue = (value: number) => formatNumber(value);

function LegendKey({ color }: { color: string }) {
  return <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: color }} />;
}

function LineKey({ color }: { color: string }) {
  return <span aria-hidden className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}

export function AreaChart({
  data,
  series,
  height = 240,
  formatY = formatCompact,
  formatX = identity,
  formatValue = plainValue,
  stacked = false,
  label,
  xLabel = "Період",
  className,
}: AreaChartProps) {
  const [box, width] = useChartWidth<HTMLDivElement>();
  const tooltip = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [byKeyboard, setByKeyboard] = useState(false);

  const count = data.length;
  const colors = series.map((item, index) => item.color ?? seriesColor(index));
  const name = label ?? `Графік: ${series.map((item) => item.label).join(", ")}`;
  const shown = active !== null && active < count ? active : null;

  // Values per series, and the running totals when stacked.
  const values = series.map((item) => data.map((datum) => numberOf(datum[item.key])));
  const lower: number[][] = [];
  const upper: number[][] = [];
  values.forEach((row, s) => {
    lower.push(row.map((_, i) => (stacked && s > 0 ? upper[s - 1][i] : 0)));
    upper.push(row.map((value, i) => (stacked && s > 0 ? upper[s - 1][i] + value : value)));
  });
  const totals = data.map((_, i) => values.reduce((sum, row) => sum + row[i], 0));
  const all = upper.flat().concat(values.flat());
  const scale = niceScale(Math.min(0, ...all), Math.max(0, ...all), 4);

  const tickLabels = scale.ticks.map((tick) => formatY(tick));
  const left = Math.max(28, Math.max(...tickLabels.map((text) => textWidth(text))) + 10);
  const plotW = Math.max(1, width - left - PAD_RIGHT);
  const base = height - PAD_BOTTOM;
  const toY = linear([scale.min, scale.max], [base, PAD_TOP]);
  const toX = (i: number) => (count <= 1 ? left + plotW / 2 : left + (i * plotW) / (count - 1));
  const zeroY = toY(Math.max(scale.min, Math.min(0, scale.max)));

  const xLabels = data.map((datum) => formatX(datum.x));
  // 24 px of air per label: the end labels are anchored inwards, so they
  // need more room than the centred ones.
  const step = labelStep(count, plotW, Math.max(...xLabels.map((text) => textWidth(text)), 0) + 24);

  // The tooltip is measured and placed straight on its element (no state):
  // beside the crosshair, flipped to the other side near the right edge,
  // and kept inside the chart box.
  useLayoutEffect(() => {
    const node = tooltip.current;
    if (!node || shown === null || width === 0) return;
    const x = toX(shown);
    const w = node.offsetWidth;
    const right = x + 12;
    const leftSide = x - 12 - w;
    const place = right + w <= width ? right : leftSide >= 0 ? leftSide : Math.max(0, Math.min(width - w, x - w / 2));
    node.style.left = `${Math.round(place)}px`;
  });

  const pick = (event: PointerEvent<SVGRectElement>) => {
    if (count === 0) return;
    const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!rect) return;
    const px = event.clientX - rect.left;
    const index = count <= 1 ? 0 : Math.round(((px - left) / plotW) * (count - 1));
    setByKeyboard(false);
    setActive(Math.max(0, Math.min(count - 1, index)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (count === 0) return;
    let next: number | null | undefined;
    const current = shown ?? count - 1;
    if (event.key === "ArrowRight") next = shown === null ? count - 1 : Math.min(count - 1, current + 1);
    else if (event.key === "ArrowLeft") next = shown === null ? count - 1 : Math.max(0, current - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    else if (event.key === "Escape") next = null;
    if (next === undefined) return;
    event.preventDefault();
    setByKeyboard(next !== null);
    setActive(next);
  };

  const readout = (i: number) =>
    `${xLabels[i]}: ${series.map((item, s) => `${item.label} ${formatValue(values[s][i], item.key)}`).join(", ")}` +
    (stacked && series.length > 1 ? `, разом ${formatValue(totals[i], "total")}` : "");

  const linePath = (row: number[]) => row.map((value, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)} ${toY(value).toFixed(1)}`).join(" ");
  const areaPath = (s: number) => {
    const top = linePath(upper[s]);
    if (count === 0) return "";
    const bottom = stacked
      ? lower[s]
          .map((value, i) => ({ value, i }))
          .reverse()
          .map(({ value, i }) => `L${toX(i).toFixed(1)} ${toY(value).toFixed(1)}`)
          .join(" ")
      : `L${toX(count - 1).toFixed(1)} ${zeroY.toFixed(1)} L${toX(0).toFixed(1)} ${zeroY.toFixed(1)}`;
    return `${top} ${bottom} Z`;
  };

  return (
    <div className={cx("flex min-w-0 flex-col gap-3", className)}>
      {series.length > 1 && (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label="Легенда">
          {series.map((item, s) => (
            <li key={item.key} className="flex items-center gap-2 text-[12px] font-medium leading-4 text-neutral-700">
              <LegendKey color={colors[s]} />
              {item.label}
            </li>
          ))}
        </ul>
      )}

      <div
        ref={box}
        tabIndex={count > 0 ? 0 : undefined}
        role="img"
        aria-label={`${name}. Стрілками ліворуч і праворуч можна переглянути значення.`}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
        className={cx("relative w-full rounded-2xl", FOCUS_RING)}
        style={{ height }}
      >
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible" aria-hidden>
            {scale.ticks.map((tick, i) => {
              const y = Math.round(toY(tick)) + 0.5;
              return (
                <g key={tick}>
                  <line x1={left} x2={left + plotW} y1={y} y2={y} stroke={tick === 0 ? CHART_BASELINE : CHART_GRID} strokeWidth={1} />
                  <text
                    x={left - 8}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill={CHART_TEXT}
                    fontSize={12}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {tickLabels[i]}
                  </text>
                </g>
              );
            })}

            {series.map((item, s) => (
              <path key={`area-${item.key}`} d={areaPath(s)} fill={colors[s]} fillOpacity={AREA_OPACITY} stroke="none" />
            ))}
            {series.map((item, s) => (
              <path
                key={`line-${item.key}`}
                d={linePath(upper[s])}
                fill="none"
                stroke={colors[s]}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}

            {xLabels.map((text, i) => {
              // Counted from the newest point, which always keeps its label.
              if ((count - 1 - i) % step !== 0) return null;
              const anchor = count > 1 && i === 0 ? "start" : count > 1 && i === count - 1 ? "end" : "middle";
              return (
                <text key={`x-${i}`} x={toX(i)} y={height - 8} textAnchor={anchor} fill={CHART_TEXT} fontSize={12}>
                  {text}
                </text>
              );
            })}

            {shown !== null && (
              <g>
                <line
                  x1={Math.round(toX(shown)) + 0.5}
                  x2={Math.round(toX(shown)) + 0.5}
                  y1={PAD_TOP}
                  y2={base}
                  stroke={CHART_CROSSHAIR}
                  strokeWidth={1}
                />
                {series.map((item, s) => (
                  <circle
                    key={`dot-${item.key}`}
                    cx={toX(shown)}
                    cy={toY(upper[s][shown])}
                    r={4}
                    fill={colors[s]}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                ))}
              </g>
            )}

            {/* The hit area: the whole plot, so the pointer only has to be
                near a date, never on a 2-px line. */}
            <rect
              x={left}
              y={0}
              width={plotW}
              height={base}
              fill="transparent"
              onPointerMove={pick}
              onPointerDown={pick}
              onPointerLeave={() => setActive(null)}
            />
          </svg>
        )}

        {width > 0 && shown !== null && (
          <div
            ref={tooltip}
            aria-hidden
            className={cx("pointer-events-none absolute top-1 z-10 min-w-[150px] max-w-[260px] rounded-2xl bg-white px-3 py-2.5", FLOAT_SHADOW)}
          >
            <p className={cx(TEXT.caption, "mb-1.5")}>{xLabels[shown]}</p>
            <ul className="flex flex-col gap-1">
              {series.map((item, s) => (
                <li key={item.key} className="flex items-center gap-2">
                  <LineKey color={colors[s]} />
                  <span className="min-w-0 flex-1 truncate text-[12px] leading-4 text-neutral-500">{item.label}</span>
                  <span className="text-[13px] font-semibold leading-[18px] text-neutral-900 tabular-nums">
                    {formatValue(values[s][shown], item.key)}
                  </span>
                </li>
              ))}
              {stacked && series.length > 1 && (
                <li className="mt-1 flex items-center gap-2 border-t border-stroke-subtle pt-1.5">
                  <span className="min-w-0 flex-1 text-[12px] leading-4 text-neutral-500">Разом</span>
                  <span className="text-[13px] font-semibold leading-[18px] text-neutral-900 tabular-nums">
                    {formatValue(totals[shown], "total")}
                  </span>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {byKeyboard && shown !== null ? readout(shown) : ""}
      </p>

      <table className="sr-only">
        <caption>{name}</caption>
        <thead>
          <tr>
            <th scope="col">{xLabel}</th>
            {series.map((item) => (
              <th key={item.key} scope="col">
                {item.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((datum, i) => (
            <tr key={`${datum.x}-${i}`}>
              <th scope="row">{xLabels[i]}</th>
              {series.map((item, s) => (
                <td key={item.key}>{formatValue(values[s][i], item.key)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
