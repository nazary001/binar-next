import { cx, formatNumber } from "../../lib/format";
import { seriesColor } from "./scale";

// A tiny trend line for a stat tile or a table cell: no axes, no labels,
// the last point marked with a dot. The figure next to it carries the
// number; the line only says "up, down or flat".
//
//   <Sparkline values={[12, 14, 11, 18, 22, 19, 25]} label="Замовлення за 7 днів: від 12 до 25" />
//   <Sparkline values={weekly} color="#ffffff" />   // on a dark tile
//
// Props
// - values: the points, oldest first (non-finite values count as 0).
// - width / height: px (default 120 x 36).
// - color: the line (default ink); pass "#ffffff" on a dark tile.
// - label: the accessible name; by default "Динаміка: від <first> до <last>".
//
// Fixed size, no hooks: renders the same on the server and in the browser.

export type SparklineProps = {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  label?: string;
  className?: string;
};

const PAD = 4;

export function Sparkline({ values, width = 120, height = 36, color = seriesColor(0), label, className }: SparklineProps) {
  const points = values.map((value) => (Number.isFinite(value) ? value : 0));
  const name =
    label ??
    (points.length > 0 ? `Динаміка: від ${formatNumber(points[0])} до ${formatNumber(points[points.length - 1])}` : "Немає даних");

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min;
  const x = (i: number) => (points.length <= 1 ? width / 2 : PAD + (i * (width - PAD * 2)) / (points.length - 1));
  // A flat series is drawn through the middle, not along the floor.
  const y = (value: number) => (span === 0 ? height / 2 : PAD + (1 - (value - min) / span) * (height - PAD * 2));
  const path = points.map((value, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(value).toFixed(1)}`).join(" ");
  const last = points.length - 1;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={name}
      className={cx("block shrink-0 overflow-visible", className)}
    >
      {points.length > 1 && (
        <path d={path} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      )}
      {points.length > 0 && <circle cx={x(last)} cy={y(points[last])} r={3} fill={color} />}
    </svg>
  );
}
