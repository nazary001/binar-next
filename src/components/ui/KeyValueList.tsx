import Link from "next/link";
import type { ReactNode } from "react";

// Key / value blocks (TR-27, system spec A15): one column always - the
// label 14/20 Medium #777779 over the value 16/24 #1d1d1f (emphasis =
// 22/28 SemiBold), rows 16 apart with 1-px #d2d2d2 lines between them.
// Only real links are underlined. Rows carry `id`, never `key` (spreading
// `key` into JSX is a React 19 error). Phone atoms: callers render them
// `lg:hidden` next to the desktop summary rows.
export type KeyValueRow = { id?: string; label: ReactNode; value: ReactNode; href?: string; emphasis?: boolean };

const VALUE = "text-[16px] leading-6 text-neutral-900";
const VALUE_EMPHASIS = "text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900";
const LINK =
  "underline decoration-1 underline-offset-4 transition-colors duration-200 motion-reduce:transition-none hover:text-brand active:text-brand";

function Value({ row }: { row: KeyValueRow }) {
  if (!row.href) return <>{row.value}</>;
  return row.href.startsWith("/") ? (
    <Link href={row.href} className={LINK}>
      {row.value}
    </Link>
  ) : (
    <a href={row.href} className={LINK}>
      {row.value}
    </a>
  );
}

export function KeyValueList({ rows, className = "" }: { rows: KeyValueRow[]; className?: string }) {
  return (
    <dl className={`flex flex-col ${className}`}>
      {rows.map((row, i) => (
        <div
          key={row.id ?? i}
          className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 [&+&]:border-t [&+&]:border-stroke-subtle"
        >
          <dt className="text-[14px] font-medium leading-5 text-neutral-500">{row.label}</dt>
          <dd className={row.emphasis ? VALUE_EMPHASIS : VALUE}>
            <Value row={row} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

// The same list in a white r32 card with p 24 and an optional Title
// Large heading 24 above it (`flush` drops the radius when the card sits
// inside another surface; `surface="subtle"` = the #f8f8f8 filled card of
// the auth account summary).
export function KeyValueCard({
  title,
  titleAs = "h2",
  rows,
  flush = false,
  surface = "white",
  className = "",
}: {
  title?: ReactNode;
  titleAs?: "h2" | "h3";
  rows: KeyValueRow[];
  flush?: boolean;
  surface?: "white" | "subtle";
  className?: string;
}) {
  const Title = titleAs;
  return (
    <section
      className={`flex flex-col gap-6 p-6 ${surface === "subtle" ? "bg-bg-subtle" : "bg-white"} ${flush ? "" : "rounded-[32px]"} ${className}`}
    >
      {title && <Title className="text-title-lg text-neutral-900">{title}</Title>}
      <KeyValueList rows={rows} />
    </section>
  );
}
