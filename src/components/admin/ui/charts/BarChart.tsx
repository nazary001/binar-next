"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { cx, formatNumber } from "../../lib/format";
import { FLOAT_SHADOW, FOCUS_RING, TEXT } from "../tokens";
import {
  CHART_BASELINE,
  CHART_GRID,
  CHART_TEXT,
  fitText,
  formatCompact,
  labelStep,
  linear,
  niceScale,
  numberOf,
  seriesColor,
  textWidth,
} from "./scale";
import { useChartWidth } from "./useChartWidth";

// Magnitudes of a few categories: columns (default) or horizontal bars.
//
//   <BarChart
//     label="Замовлення за днями тижня"
//     data={[{ label: "Пн", value: 42 }, { label: "Вт", value: 57 }, ...]}
//   />
//   <BarChart horizontal label="Топ категорій за виручкою"
//     data={[{ label: "Косметика для готелів", value: 412300 }, ...]}
//     formatValue={(v) => formatMoney(v, { whole: true })} />
//
// Props
// - data: { label, value, color? }[]; values are magnitudes (>= 0; a
//   negative value is drawn as 0). One series, so every bar is ink unless a
//   datum names its own colour (use that for the one bar the story is about).
// - height: px of the column plot (default 240). Horizontal bars size
//   themselves: one 32-px row per datum.
// - formatValue: value labels, tooltip, table (default formatNumber).
// - horizontal: bars grow to the right, the label column on the left, the
//   value at the tip; plain HTML, so long Ukrainian labels truncate
//   cleanly and no measuring is needed.
// - label: the accessible name (and the hidden table's caption).
//
// Columns are at most 24 px wide with 4-px rounded tops on a square
// baseline. Every column carries its value on the cap while the labels fit;
// when they do not, the value axis comes back and the values live in the
// tooltip and the hidden table. Hover or arrow keys (after Tab) show a
// tooltip for a column.

export type BarDatum = { label: string; value: number; color?: string };

export type BarChartProps = {
  data: BarDatum[];
  height?: number;
  formatValue?: (value: number) => string;
  horizontal?: boolean;
  label?: string;
  className?: string;
};

const BAR_MAX = 24;
const RADIUS = 4;
const PAD_RIGHT = 8;
const PAD_BOTTOM = 28;

const plainValue = (value: number) => formatNumber(value);

// A column with rounded top corners and a square foot on the baseline.
function columnPath(x: number, w: number, top: number, base: number): string {
  const h = base - top;
  if (h <= 0 || w <= 0) return "";
  const r = Math.min(RADIUS, h, w / 2);
  return [
    `M${x} ${base}`,
    `V${top + r}`,
    `A${r} ${r} 0 0 1 ${x + r} ${top}`,
    `H${x + w - r}`,
    `A${r} ${r} 0 0 1 ${x + w} ${top + r}`,
    `V${base}`,
    "Z",
  ].join(" ");
}

function HorizontalBars({ data, formatValue, label, className }: Required<Pick<BarChartProps, "data" | "formatValue">> & Pick<BarChartProps, "label" | "className">) {
  const max = Math.max(0, ...data.map((datum) => Math.max(0, numberOf(datum.value))));
  return (
    <ul aria-label={label} className={cx("flex min-w-0 flex-col gap-1", className)}>
      {data.map((datum, i) => {
        const value = Math.max(0, numberOf(datum.value));
        const share = max > 0 ? value / max : 0;
        return (
          <li key={`${datum.label}-${i}`} className="grid h-8 grid-cols-[minmax(0,38%)_minmax(0,1fr)] items-center gap-3">
            <span className="truncate text-[13px] leading-[18px] text-neutral-700" title={datum.label}>
              {datum.label}
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="h-4 shrink-0 rounded-r-[4px]"
                style={{
                  width: value > 0 ? `max(2px, calc((100% - 88px) * ${share.toFixed(4)}))` : "0px",
                  backgroundColor: datum.color ?? seriesColor(0),
                }}
              />
              <span className="whitespace-nowrap text-[13px] font-semibold leading-[18px] text-neutral-900 tabular-nums">
                {formatValue(value)}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function BarChart({ data, height = 240, formatValue = plainValue, horizontal = false, label, className }: BarChartProps) {
  const [box, width] = useChartWidth<HTMLDivElement>();
  const tooltip = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [byKeyboard, setByKeyboard] = useState(false);

  const count = data.length;
  const name = label ?? "Стовпчикова діаграма";
  const shown = active !== null && active < count ? active : null;
  const values = data.map((datum) => Math.max(0, numberOf(datum.value)));
  const valueLabels = values.map((value) => formatValue(value));

  // Whether every column can carry its value on the cap.
  const bandGuess = count > 0 ? (width - PAD_RIGHT) / count : 0;
  const capLabels = count > 0 && Math.max(...valueLabels.map((text) => textWidth(text, 12))) + 6 <= bandGuess;

  const scale = niceScale(0, Math.max(0, ...values), 4);
  const tickLabels = scale.ticks.map((tick) => formatCompact(tick));
  const left = capLabels ? 0 : Math.max(28, Math.max(...tickLabels.map((text) => textWidth(text))) + 10);
  const top = capLabels ? 22 : 10;
  const plotW = Math.max(1, width - left - PAD_RIGHT);
  const base = height - PAD_BOTTOM;
  // With cap labels the bars use the exact maximum; with an axis, the nice one.
  const toY = linear([0, capLabels ? Math.max(1, ...values) : scale.max], [base, top]);
  const band = count > 0 ? plotW / count : plotW;
  const barW = Math.max(2, Math.min(BAR_MAX, band * 0.62));
  const centre = (i: number) => left + band * (i + 0.5);

  const natural = Math.max(0, ...data.map((datum) => textWidth(datum.label))) + 10;
  const step = labelStep(count, plotW, Math.min(natural, 120));
  const xLabels = data.map((datum) => fitText(datum.label, band * step - 8));

  useLayoutEffect(() => {
    const node = tooltip.current;
    if (!node || shown === null || width === 0) return;
    // Beside the column, level with its top: never over the column or its
    // cap label; on the left of it near the right edge.
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    const c = centre(shown);
    const right = c + barW / 2 + 8;
    const left = c - barW / 2 - 8 - w;
    const x = right + w <= width ? right : left >= 0 ? left : Math.max(0, Math.min(width - w, c - w / 2));
    const y = Math.max(0, Math.min(base - h, toY(values[shown]) - 4));
    node.style.left = `${Math.round(x)}px`;
    node.style.top = `${Math.round(y)}px`;
  });

  if (horizontal) return <HorizontalBars data={data} formatValue={formatValue} label={label ?? name} className={className} />;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (count === 0) return;
    let next: number | null | undefined;
    if (event.key === "ArrowRight") next = shown === null ? 0 : Math.min(count - 1, shown + 1);
    else if (event.key === "ArrowLeft") next = shown === null ? count - 1 : Math.max(0, shown - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    else if (event.key === "Escape") next = null;
    if (next === undefined) return;
    event.preventDefault();
    setByKeyboard(next !== null);
    setActive(next);
  };

  return (
    <div className={cx("flex min-w-0 flex-col", className)}>
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
            {!capLabels &&
              scale.ticks.map((tick, i) => {
                const y = Math.round(toY(tick)) + 0.5;
                return (
                  <g key={tick}>
                    {tick !== 0 && <line x1={left} x2={left + plotW} y1={y} y2={y} stroke={CHART_GRID} strokeWidth={1} />}
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

            {values.map((value, i) => {
              const x = centre(i) - barW / 2;
              const y = toY(value);
              const dim = shown !== null && shown !== i;
              return (
                <g key={`bar-${i}`}>
                  <path
                    d={columnPath(x, barW, Math.min(y, base - (value > 0 ? 1 : 0)), base)}
                    fill={data[i].color ?? seriesColor(0)}
                    fillOpacity={dim ? 0.55 : 1}
                    className="transition-[fill-opacity] duration-200 motion-reduce:transition-none"
                  />
                  {capLabels && (
                    <text
                      x={centre(i)}
                      y={y - 6}
                      textAnchor="middle"
                      fill="#1d1d1f"
                      fontSize={12}
                      fontWeight={600}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {valueLabels[i]}
                    </text>
                  )}
                </g>
              );
            })}

            <line x1={left} x2={left + plotW} y1={base + 0.5} y2={base + 0.5} stroke={CHART_BASELINE} strokeWidth={1} />

            {xLabels.map((text, i) =>
              i % step === 0 ? (
                <text key={`x-${i}`} x={centre(i)} y={height - 8} textAnchor="middle" fill={CHART_TEXT} fontSize={12}>
                  {text}
                </text>
              ) : null,
            )}

            {/* Hit areas: the whole band of a column, not only its ink. */}
            {values.map((_, i) => (
              <rect
                key={`hit-${i}`}
                x={left + band * i}
                y={0}
                width={band}
                height={base}
                fill="transparent"
                onPointerEnter={() => {
                  setByKeyboard(false);
                  setActive(i);
                }}
                onPointerDown={() => {
                  setByKeyboard(false);
                  setActive(i);
                }}
                onPointerLeave={() => setActive(null)}
              />
            ))}
          </svg>
        )}

        {width > 0 && shown !== null && (
          <div
            ref={tooltip}
            aria-hidden
            className={cx("pointer-events-none absolute z-10 max-w-[240px] rounded-2xl bg-white px-3 py-2", FLOAT_SHADOW)}
          >
            <p className="text-[13px] font-semibold leading-[18px] text-neutral-900 tabular-nums">{valueLabels[shown]}</p>
            <p className={cx(TEXT.caption, "truncate")}>{data[shown].label}</p>
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {byKeyboard && shown !== null ? `${data[shown].label}: ${valueLabels[shown]}` : ""}
      </p>

      <table className="sr-only">
        <caption>{name}</caption>
        <tbody>
          {data.map((datum, i) => (
            <tr key={`${datum.label}-${i}`}>
              <th scope="row">{datum.label}</th>
              <td>{valueLabels[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
