import type { ReactNode } from "react";
import { cx, formatNumber } from "../lib/format";
import { TONES, type Tone } from "./tokens";

// Badge: the cabinet's r40 status pill, one size denser. Colours come from
// the nine TONES of tokens.ts as inline styles (as the cabinet's
// StatusPill does), so any tone works without a Tailwind class per colour.
//
//   <Badge tone="blue">Нове</Badge>
//   <Badge tone="green" dot>Оплачено</Badge>
//   <Badge tone="amber" size="md">На розгляді</Badge>
//   <CountBadge value={3} />                       brand counter, "needs attention"
//   <CountBadge value={128} tone="neutral" label="Усього товарів: 128" />
//
// Badge props
// - tone: one of the nine tones (blue, orange, indigo, green, amber, mint,
//   red, neutral, brand). Status maps (ORDER_STATUS_META and friends) give
//   the tone of each status.
// - size: "sm" 24 px, 12/16 medium (tables, lists, default); "md" 28 px,
//   13/18 medium (page heads, cards). The cabinet's pill is 30 px at 14;
//   the panel is one step denser.
// Every status badge of status.tsx (OrderStatusBadge ...) is a Badge.
// - dot: a 6-px dot of the tone's dot colour before the text.
// - title: a native tooltip (the full status name when the pill is short).
//
// CountBadge props
// - value: the count; 0 or less renders nothing unless showZero.
// - tone: "brand" by default (orange = needs attention); any other tone for
//   a calm counter (neutral for totals).
// - max: above it the badge shows "99+" (default 99).
// - label: the accessible name ("Нових заявок: 3"); without it the number
//   itself is read.

export type BadgeSize = "sm" | "md";

const BOX: Record<BadgeSize, string> = {
  sm: "h-6 gap-1.5 text-[12px] leading-4",
  md: "h-7 gap-1.5 text-[13px] leading-[18px]",
};
const PAD: Record<BadgeSize, string> = { sm: "px-2.5", md: "px-3" };
const PAD_DOT: Record<BadgeSize, string> = { sm: "pl-2 pr-2.5", md: "pl-2.5 pr-3" };

export type BadgeProps = {
  tone: Tone;
  size?: BadgeSize;
  dot?: boolean;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Badge({ tone, size = "sm", dot = false, title, children, className }: BadgeProps) {
  // A tone the map does not know (data newer than the code) stays readable.
  const colors = TONES[tone] ?? TONES.neutral;
  return (
    <span
      title={title}
      className={cx(
        "inline-flex max-w-full shrink-0 items-center whitespace-nowrap rounded-[40px] font-medium",
        BOX[size],
        dot ? PAD_DOT[size] : PAD[size],
        className,
      )}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {dot && <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: colors.dot }} />}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

export type CountBadgeProps = {
  value: number;
  tone?: Tone;
  max?: number;
  showZero?: boolean;
  label?: string;
  className?: string;
};

export function CountBadge({ value, tone = "brand", max = 99, showZero = false, label, className }: CountBadgeProps) {
  if (!Number.isFinite(value) || (value <= 0 && !showZero)) return null;
  const colors = TONES[tone];
  const text = value > max ? `${max}+` : formatNumber(value);
  return (
    <span
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none tabular-nums",
        className,
      )}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {text}
    </span>
  );
}
