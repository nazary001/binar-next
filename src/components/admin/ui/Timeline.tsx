import type { ReactNode } from "react";
import { cx, formatDateTime } from "../lib/format";
import { TEXT, TONES, type Tone } from "./tokens";

// A vertical history, newest first as the caller orders it: a tinted dot
// (or a small icon disc) per entry on a hairline rail, the title, who and
// when, and an optional text. Order history, the journal of a record,
// waybill events.
//
//   <Timeline
//     items={order.history.map((entry, i) => ({
//       id: `${i}`,
//       at: entry.at,
//       title: <>Статус: <OrderStatusBadge status={entry.to} size="sm" /></>,
//       actor: entry.by.name,
//       tone: "indigo",
//       text: entry.text,
//     }))}
//   />
//
// Props
// - items: { id, at (ISO string or Date), title, text?, actor?, tone?, icon? }[].
//   `tone` colours the dot (neutral by default); `icon` (a 20-px solid
//   Heroicon) replaces the dot with a 24-px tinted disc for entries that
//   matter more (created, cancelled, paid).
// - empty: shown when there are no entries (default "Подій ще немає").
//
// No hooks: renders in server pages too.

export type TimelineItem = {
  id: string;
  at: string | Date;
  title: ReactNode;
  text?: ReactNode;
  actor?: string;
  tone?: Tone;
  icon?: ReactNode;
};

function isoOf(value: string | Date): string | undefined {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function Timeline({ items, empty, className }: { items: TimelineItem[]; empty?: ReactNode; className?: string }) {
  if (items.length === 0) {
    return <p className={cx(TEXT.muted, "py-2", className)}>{empty ?? "Подій ще немає"}</p>;
  }
  return (
    <ol className={cx("flex min-w-0 flex-col", className)}>
      {items.map((item, index) => {
        const tone = TONES[item.tone ?? "neutral"] ?? TONES.neutral;
        const lastItem = index === items.length - 1;
        return (
          <li key={item.id} className="relative grid grid-cols-[24px_minmax(0,1fr)] gap-x-3">
            {!lastItem && <span aria-hidden className="absolute bottom-0 left-[11.5px] top-7 w-px bg-stroke-subtle" />}
            <span aria-hidden className="relative flex h-6 items-center justify-center">
              {item.icon ? (
                <span
                  className="flex size-6 items-center justify-center rounded-full [&>svg]:size-3.5"
                  style={{ backgroundColor: tone.bg, color: tone.text }}
                >
                  {item.icon}
                </span>
              ) : (
                <span className="size-2.5 rounded-full ring-2 ring-white" style={{ backgroundColor: tone.dot }} />
              )}
            </span>
            <div className={cx("min-w-0", lastItem ? "pb-0" : "pb-5")}>
              <div className={cx(TEXT.bodyStrong, "flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1")}>{item.title}</div>
              <p className={cx(TEXT.caption, "mt-0.5 flex flex-wrap items-center gap-x-1.5")}>
                {item.actor && (
                  <>
                    <span>{item.actor}</span>
                    <span aria-hidden className="size-[3px] rounded-full bg-neutral-400" />
                  </>
                )}
                <time dateTime={isoOf(item.at)} className="tabular-nums">
                  {formatDateTime(item.at)}
                </time>
              </p>
              {item.text && <div className={cx(TEXT.muted, "mt-1.5 [overflow-wrap:anywhere]")}>{item.text}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
