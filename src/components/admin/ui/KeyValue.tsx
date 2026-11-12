"use client";

import { CheckIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "../lib/format";
import { COLOR_TRANSITION, FOCUS_RING, TEXT, TONES } from "./tokens";

// Facts of a record: a label over its value, in one column with hairlines
// between the rows, or as a grid of two or three columns.
//
//   <KeyValueList
//     columns={2}
//     items={[
//       { label: "Номер", value: "10042381", copy: "10042381" },
//       { label: "Компанія", value: "ТОВ «Готель Дністер»", hint: "ЄДРПОУ 41234567" },
//       { label: "Сума", value: formatMoney(18400) },
//     ]}
//   />
//
// Props
// - items: { label, value, hint?, copy? }[]. `copy` is the text a small
//   button next to the value writes to the clipboard (a waybill, an id, a
//   phone); the button shows a check for 1.5 s and the change is announced.
// - columns: 1 (default, hairlines between rows), 2 or 3 (a grid from 640
//   / 1024 px; one column on phones).
// - dense: tighter rows (side panels, drawers).

export type KeyValueItem = { label: string; value: ReactNode; hint?: string; copy?: string };

export type KeyValueListProps = {
  items: KeyValueItem[];
  columns?: 1 | 2 | 3;
  dense?: boolean;
  className?: string;
};

// Writes text to the clipboard; the old textarea route covers browsers or
// contexts without the async Clipboard API.
async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the textarea.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const done = document.execCommand("copy");
    area.remove();
    return done;
  } catch {
    return false;
  }
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    const done = await writeClipboard(text);
    if (!done) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={`Скопіювати: ${label}`}
        title="Скопіювати"
        className={cx(
          "-my-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-500 hover:bg-bg-cabinet hover:text-neutral-900 motion-reduce:transition-none",
          COLOR_TRANSITION,
          FOCUS_RING,
        )}
        style={copied ? { color: TONES.green.text } : undefined}
      >
        {copied ? (
          <CheckIcon aria-hidden className="size-4" strokeWidth={2} />
        ) : (
          <DocumentDuplicateIcon aria-hidden className="size-4" strokeWidth={1.7} />
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Скопійовано" : ""}
      </span>
    </>
  );
}

const GRID: Record<2 | 3, string> = {
  2: "grid grid-cols-1 gap-x-6 min-[640px]:grid-cols-2",
  3: "grid grid-cols-1 gap-x-6 min-[640px]:grid-cols-2 min-[1024px]:grid-cols-3",
};

export function KeyValueList({ items, columns = 1, dense = false, className }: KeyValueListProps) {
  const single = columns === 1;
  return (
    <dl
      className={cx(
        "min-w-0",
        single ? "flex flex-col divide-y divide-stroke-subtle" : GRID[columns],
        !single && (dense ? "gap-y-3" : "gap-y-4"),
        className,
      )}
    >
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className={cx("flex min-w-0 flex-col gap-1", single && (dense ? "py-2 first:pt-0 last:pb-0" : "py-3 first:pt-0 last:pb-0"))}
        >
          <dt className={TEXT.caption}>{item.label}</dt>
          <dd className={cx(TEXT.body, "flex min-w-0 items-center gap-1")}>
            <span className="min-w-0 [overflow-wrap:anywhere]">{item.value}</span>
            {item.copy && <CopyButton text={item.copy} label={item.label} />}
          </dd>
          {item.hint && <dd className={TEXT.caption}>{item.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
