import { TONES } from "../tokens";

// Shared helpers of the panel's hand-written SVG charts (AreaChart,
// BarChart, DonutChart, Sparkline). Pure functions only, so a server page
// may import them (the box-measuring hook lives in useChartWidth.ts, a
// client module).
//
//   const y = niceScale(0, 1234, 4);      // { min: 0, max: 1500, step: 500, ticks: [0, 500, 1000, 1500] }
//   const toY = linear([y.min, y.max], [200, 0]);
//   formatCompact(12500)                  // "12,5 тис."
//   seriesColor(1)                        // "#f85a0b"

// The fixed order of series colours: ink first, brand orange second, then
// the dots of the status tones. A colour follows the series (its index in
// the `series` prop), never its rank, so a filter never repaints the rest.
// Past six series a chart is the wrong form: fold the tail into "Інше".
export const CHART_COLORS: readonly string[] = [
  "#1d1d1f",
  "#f85a0b",
  TONES.indigo.dot,
  TONES.green.dot,
  TONES.amber.dot,
  TONES.blue.dot,
];

export function seriesColor(index: number): string {
  return CHART_COLORS[Math.min(Math.max(index, 0), CHART_COLORS.length - 1)];
}

// Recessive chrome: gridlines one step off the white card, the baseline and
// the crosshair a step darker, axis text in the caption grey.
export const CHART_GRID = "#ececed";
export const CHART_BASELINE = "#d2d2d2";
export const CHART_CROSSHAIR = "#a5a5a5";
export const CHART_TEXT = "#777779";

export type NiceScale = { min: number; max: number; step: number; ticks: number[] };

// Rounds away float noise (0.1 + 0.2) so tick labels stay clean.
function clean(value: number): number {
  return Number(value.toPrecision(12));
}

const MANTISSAS = [1, 2, 2.5, 5, 10];

// A domain rounded out to clean numbers with at most `ticks` intervals:
// niceScale(0, 1234, 4) -> 0 / 500 / 1000 / 1500. The step is the smallest
// of 1, 2, 2.5, 5 x 10^n that covers the range in `ticks` steps, so the grid
// never gets denser than asked. A flat or empty domain still gives a usable
// scale (0..1, or 0..value).
export function niceScale(min: number, max: number, ticks = 4): NiceScale {
  let lo = Number.isFinite(min) ? min : 0;
  let hi = Number.isFinite(max) ? max : 0;
  if (lo > hi) [lo, hi] = [hi, lo];
  if (lo === hi) {
    if (hi === 0) hi = 1;
    else if (hi > 0) lo = 0;
    else hi = 0;
  }
  const count = Math.max(1, Math.round(ticks));
  const raw = (hi - lo) / count;
  const exponent = Math.floor(Math.log10(raw));
  const magnitude = 10 ** exponent;
  let step = MANTISSAS[MANTISSAS.length - 1] * magnitude;
  for (const mantissa of MANTISSAS) {
    const candidate = mantissa * magnitude;
    if (candidate >= raw - 1e-12 && Math.ceil(clean(hi / candidate)) - Math.floor(clean(lo / candidate)) <= count) {
      step = candidate;
      break;
    }
  }
  const niceMin = clean(Math.floor(clean(lo / step)) * step);
  const niceMax = clean(Math.ceil(clean(hi / step)) * step);
  const values: number[] = [];
  for (let value = niceMin; value <= niceMax + step / 2; value += step) values.push(clean(value));
  return { min: niceMin, max: niceMax, step, ticks: values };
}

// A linear map from a domain to a range; a zero-width domain maps to the
// start of the range.
export function linear(domain: readonly [number, number], range: readonly [number, number]): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  return (value: number) => (span === 0 ? r0 : r0 + ((value - d0) / span) * (r1 - r0));
}

const COMPACT = new Intl.NumberFormat("uk-UA", { notation: "compact", maximumFractionDigits: 1 });
const FULL = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 });
const PERCENT = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 });

// Axis ticks: in full under 10 000, compact from there ("12 тис.", "1,2 млн").
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return Math.abs(value) < 10_000 ? FULL.format(value) : COMPACT.format(value);
}

// "12,5 %"
export function formatPercent(value: number): string {
  return Number.isFinite(value) ? `${PERCENT.format(value)} %` : "-";
}

// A rough width of a label in Manrope at `size` px. Charts need it before
// anything is drawn (to size the y gutter and to thin the x labels), and
// measuring real text would mean a second render.
export function textWidth(text: string, size = 12): number {
  return Math.ceil(text.length * size * 0.6);
}

// Shortens a label to `maxWidth` px, ending it with "...".
export function fitText(text: string, maxWidth: number, size = 12): string {
  if (textWidth(text, size) <= maxWidth) return text;
  const chars = Math.max(1, Math.floor(maxWidth / (size * 0.6)) - 3);
  return `${text.slice(0, chars).trimEnd()}...`;
}

// Every how many points an x label fits: labels of `labelWidth` px along
// `available` px for `count` points.
export function labelStep(count: number, available: number, labelWidth: number): number {
  if (count <= 1) return 1;
  const fit = Math.max(1, Math.floor(available / Math.max(1, labelWidth)));
  return Math.max(1, Math.ceil(count / fit));
}

// A number from a datum field: anything that is not a finite number is 0.
export function numberOf(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
