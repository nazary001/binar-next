"use client";

import { ArrowTopRightOnSquareIcon, InformationCircleIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import type { ReactNode } from "react";
import { cx, formatNumber, qs } from "../lib/format";
import { Badge } from "../ui/Badge";
import { Tooltip } from "../ui/Tooltip";
import { COLOR_TRANSITION, FOCUS_RING, TEXT, TONES, type Tone } from "../ui/tokens";

// Small parts shared by /admin/categories and /admin/pricing.

// The products list filtered the way the list route reads its address
// (direction, category, listed, available, archived, brand).
export function productsHref(filters: Record<string, string | undefined>): string {
  const query = qs(filters);
  return query ? `/admin/products?${query}` : "/admin/products";
}

// A column head (or a field label) with a note behind an info glyph. The
// note repeats nothing on screen: it explains what the value does.
export function HeadHint({ label, hint, light = false }: { label: string; hint: ReactNode; light?: boolean }) {
  return (
    <Tooltip content={hint} placement="bottom">
      <span
        tabIndex={0}
        className={cx("inline-flex cursor-help items-center gap-1 rounded-md", FOCUS_RING, light ? "focus-visible:ring-offset-neutral-800" : "")}
      >
        {label}
        <InformationCircleIcon aria-hidden className={cx("size-4 shrink-0", light ? "text-white/55" : "text-neutral-400")} />
      </span>
    </Tooltip>
  );
}

// A count that opens the filtered products list; a zero is plain muted
// text (a link to an empty list helps nobody).
export function CountLink({ value, href, label, strong = true }: { value: number; href: string; label: string; strong?: boolean }) {
  if (value <= 0) return <span className="tabular-nums text-neutral-400">0</span>;
  return (
    <Link
      href={href}
      aria-label={label}
      className={cx(
        "rounded-md tabular-nums underline decoration-neutral-300 underline-offset-4 hover:text-brand hover:decoration-brand motion-reduce:transition-none",
        strong ? "font-semibold text-neutral-900" : "text-neutral-800",
        COLOR_TRANSITION,
        FOCUS_RING,
      )}
    >
      {formatNumber(value)}
    </Link>
  );
}

// A state pill with a count that opens the matching products ("Приховано 6").
// The words and tones are those of the products list's own state badges.
export function StateLink({ tone, label, value, href, title }: { tone: Tone; label: string; value: number; href: string; title: string }) {
  return (
    <Link href={href} title={title} className={cx("rounded-full hover:opacity-80", FOCUS_RING)}>
      <Badge tone={tone}>
        {label} <span className="tabular-nums">{formatNumber(value)}</span>
      </Badge>
    </Link>
  );
}

// A small glyph link to a storefront page (opens a new tab).
export function SiteLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-bg-cabinet hover:text-neutral-900 motion-reduce:transition-none",
        COLOR_TRANSITION,
        FOCUS_RING,
        className,
      )}
    >
      <ArrowTopRightOnSquareIcon aria-hidden className="size-4" />
    </a>
  );
}

// A quiet note on a tinted tile (an explanation next to a form, a
// warning inside a dialog).
export function Note({ tone = "neutral", icon, children, className }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  const colors = TONES[tone];
  const neutral = tone === "neutral";
  return (
    <div
      className={cx("flex items-start gap-2.5 rounded-2xl px-4 py-3", TEXT.body, neutral && "bg-bg-subtle", className)}
      style={neutral ? undefined : { backgroundColor: colors.bg, color: colors.text }}
    >
      {icon && <span className="mt-0.5 flex shrink-0 [&>svg]:size-4">{icon}</span>}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
