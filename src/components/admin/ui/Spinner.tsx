import { cx } from "../lib/format";

// Spinner: the ring every busy control of the panel shows (a button that
// saves, a combobox that searches, a table that reloads).
//
//   <Spinner />                          decorative, next to text that says what happens
//   <Spinner size="lg" label="Завантажуємо замовлення" />   announced to screen readers
//
// Props
// - size: "sm" 16 px (inside sm controls and badges), "md" 20 px (default,
//   the icon size of the kit), "lg" 32 px (a whole card is loading).
// - label: when given, the ring is wrapped in role="status" with the label
//   as visually hidden text; without it the ring is aria-hidden, because the
//   control around it already says it is busy (aria-busy).
// - className: colour and spacing. The ring draws in currentColor, so it
//   takes the colour of the text it sits in.
//
// Reduced motion: the ring keeps turning (it is the only sign of progress)
// but at a third of the speed.

export type SpinnerSize = "sm" | "md" | "lg";

const BOX: Record<SpinnerSize, string> = {
  sm: "size-4",
  md: "size-5",
  lg: "size-8",
};

// Thinner strokes on the big ring keep the same visual weight.
const STROKE: Record<SpinnerSize, number> = { sm: 3, md: 2.5, lg: 2 };

export type SpinnerProps = {
  size?: SpinnerSize;
  label?: string;
  className?: string;
};

export function Spinner({ size = "md", label, className }: SpinnerProps) {
  const ring = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cx(
        "shrink-0 animate-spin motion-reduce:[animation-duration:3s]",
        BOX[size],
        label ? undefined : className,
      )}
    >
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth={STROKE[size]} />
      <path d="M21.5 12A9.5 9.5 0 0 0 12 2.5" stroke="currentColor" strokeLinecap="round" strokeWidth={STROKE[size]} />
    </svg>
  );
  if (!label) return ring;
  return (
    <span role="status" className={cx("inline-flex items-center", className)}>
      {ring}
      <span className="sr-only">{label}</span>
    </span>
  );
}
