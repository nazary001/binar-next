import { ArrowDownIcon, ArrowUpIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "../lib/format";
import { CountBadge } from "./Badge";
import { Skeleton } from "./Skeleton";
import { COLOR_TRANSITION, FOCUS_RING, FOCUS_RING_INSET, SURFACE, TEXT, TONES, type Tone } from "./tokens";

// Cards of the panel: the white r24 block on the slab (no shadow, no
// border), the dark KPI tile and the "needs attention" row.
//
//   <Card title="Останні замовлення" subtitle="За 7 днів" actions={<LinkButton ...>} padding="none">
//     <DataTable ... />
//   </Card>
//   <StatCard tone="dark" label="Виручка за тиждень" value="1 284 300 ₴"
//     delta={{ value: 12.4 }} hint="до попереднього тижня" icon={<BanknotesIcon />} href="/admin/orders" />
//   <AttentionItem title="Нові замовлення" text="Чекають на менеджера" count={7} href="/admin/orders?status=new" />
//
// Card({ title?, subtitle?, actions?, padding? = "md", tone? = "white",
//   titleAs? = "h2", children, className? }):
//   padding "none" keeps the head padded and lets the body run flush
//   (tables, lists); "lg" is for roomy single-purpose cards. tone "dark" is
//   the black tile, "inset" the quieter #f8f8f8 r16 tile inside a white card.
// StatCard({ label, value, hint?, delta?, icon?, tone? = "dark", href?,
//   loading? }): the cabinet's KPI tile. `delta.value` is a percent;
//   `goodWhen` says which direction is good ("up" by default; "down" for
//   overdue debt, returns ...): good is green, bad is red, 0 is neutral, and
//   the direction is also spelled out for screen readers. `icon` is a
//   24-px outline Heroicon (it is sized here). With `href` the whole tile is
//   a link.
// AttentionItem({ icon?, title, text?, count?, href, tone? = "orange" }): a
//   row of a "needs attention" list; a count above zero is the brand pill.

export type CardTone = "white" | "dark" | "inset";
export type CardPadding = "none" | "md" | "lg";

const TONE: Record<CardTone, string> = {
  white: SURFACE.card,
  dark: SURFACE.dark,
  inset: SURFACE.inset,
};

const PADDING: Record<CardPadding, string> = {
  none: "",
  md: SURFACE.cardPadding,
  lg: "p-6 min-[1024px]:p-8",
};

export type CardProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  padding?: CardPadding;
  tone?: CardTone;
  titleAs?: "h2" | "h3";
  children?: ReactNode;
  className?: string;
};

export function Card({ title, subtitle, actions, padding = "md", tone = "white", titleAs = "h2", children, className }: CardProps) {
  const hasHead = Boolean(title || subtitle || actions);
  const Title = titleAs;
  const dark = tone === "dark";
  return (
    <div className={cx("flex min-w-0 flex-col", TONE[tone], PADDING[padding], className)}>
      {hasHead && (
        <div
          className={cx(
            "flex flex-wrap items-start justify-between gap-x-4 gap-y-2",
            padding === "none" ? "px-5 pt-5 pb-4 min-[1024px]:px-6 min-[1024px]:pt-6" : "pb-4",
          )}
        >
          <div className="min-w-0">
            {title && <Title className={cx(TEXT.cardTitle, dark && "text-white")}>{title}</Title>}
            {subtitle && <p className={cx(TEXT.muted, "mt-0.5", dark && "text-neutral-300")}>{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

const PERCENT = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 });

export type StatDelta = { value: number; goodWhen?: "up" | "down" };

function DeltaPill({ delta }: { delta: StatDelta }) {
  const value = Number.isFinite(delta.value) ? delta.value : 0;
  const up = value > 0;
  const flat = value === 0;
  const good = flat ? null : up === ((delta.goodWhen ?? "up") === "up");
  const tone = good === null ? TONES.neutral : good ? TONES.green : TONES.red;
  const Icon = up ? ArrowUpIcon : ArrowDownIcon;
  const text = `${up ? "+" : value < 0 ? "-" : ""}${PERCENT.format(Math.abs(value))} %`;
  const spoken = flat ? "без змін" : `${up ? "зростання" : "зниження"} на ${PERCENT.format(Math.abs(value))} %`;
  return (
    <span
      className="inline-flex h-6 shrink-0 items-center gap-0.5 rounded-full px-2 text-[12px] font-semibold leading-4 tabular-nums"
      style={{ backgroundColor: tone.bg, color: tone.text }}
    >
      {!flat && <Icon aria-hidden className="size-3.5" />}
      <span aria-hidden>{text}</span>
      <span className="sr-only">{spoken}</span>
    </span>
  );
}

export type StatCardProps = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  delta?: StatDelta;
  icon?: ReactNode;
  tone?: "dark" | "white";
  href?: string;
  loading?: boolean;
  className?: string;
};

export function StatCard({ label, value, hint, delta, icon, tone = "dark", href, loading = false, className }: StatCardProps) {
  const dark = tone === "dark";
  const body = (
    <>
      {(icon || href) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          {icon ? (
            <span
              aria-hidden
              className={cx(
                "flex size-11 shrink-0 items-center justify-center rounded-xl [&>svg]:size-6 [&>svg]:[stroke-width:1.7]",
                dark ? "bg-neutral-800 text-white" : "bg-bg-cabinet text-neutral-900",
              )}
            >
              {icon}
            </span>
          ) : (
            <span />
          )}
          {href && (
            <ArrowUpRightIcon
              aria-hidden
              strokeWidth={1.7}
              className={cx(
                "size-5 shrink-0 motion-reduce:transition-none",
                COLOR_TRANSITION,
                dark ? "text-neutral-500 group-hover:text-white" : "text-neutral-400 group-hover:text-neutral-900",
              )}
            />
          )}
        </div>
      )}
      <p className={cx("text-[14px] font-medium leading-5", dark ? "text-neutral-300" : "text-neutral-500")}>{label}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        {loading ? (
          <>
            {/* The shimmer is light grey: on the dark tile a quiet white wash instead. */}
            {dark ? <span aria-hidden className="block h-9 w-32 rounded-lg bg-white/10" /> : <Skeleton className="h-9 w-32" />}
            <span className="sr-only">Завантаження...</span>
          </>
        ) : (
          <>
            <span className={cx(TEXT.figure, "min-w-0 [overflow-wrap:anywhere]", dark ? "text-white" : "text-neutral-900")}>{value}</span>
            {delta && <DeltaPill delta={delta} />}
          </>
        )}
      </div>
      {hint && !loading && (
        <p className={cx("mt-1.5 text-[12px] font-medium leading-4", dark ? "text-neutral-400" : "text-neutral-500")}>{hint}</p>
      )}
    </>
  );

  const shell = cx(
    "group flex min-w-0 flex-col rounded-3xl p-5 min-[1024px]:p-6",
    dark ? "bg-neutral-900" : "bg-white",
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cx(
          shell,
          "motion-reduce:transition-none",
          COLOR_TRANSITION,
          FOCUS_RING,
          dark ? "hover:bg-[#2a2a2c]" : "hover:bg-bg-subtle",
        )}
      >
        {body}
      </Link>
    );
  }
  return (
    <div className={shell} aria-busy={loading || undefined}>
      {body}
    </div>
  );
}

export type AttentionItemProps = {
  icon?: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  count?: number;
  href: string;
  tone?: Tone;
  className?: string;
};

export function AttentionItem({ icon, title, text, count, href, tone = "orange", className }: AttentionItemProps) {
  const colors = TONES[tone] ?? TONES.orange;
  const hasCount = typeof count === "number";
  return (
    <Link
      href={href}
      className={cx(
        "group flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-bg-subtle motion-reduce:transition-none",
        COLOR_TRANSITION,
        FOCUS_RING_INSET,
        className,
      )}
    >
      {icon && (
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-xl [&>svg]:size-5 [&>svg]:[stroke-width:1.7]"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cx(TEXT.bodyStrong, "truncate")}>{title}</span>
        {text && <span className={cx(TEXT.caption, "truncate")}>{text}</span>}
      </span>
      {hasCount && <CountBadge value={count} tone={count > 0 ? "brand" : "neutral"} max={999} showZero />}
      <ChevronRightIcon
        aria-hidden
        className={cx("size-5 shrink-0 text-neutral-400 group-hover:text-neutral-900 motion-reduce:transition-none", COLOR_TRANSITION)}
      />
    </Link>
  );
}
