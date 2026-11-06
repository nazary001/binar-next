"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { RollingNumber } from "@/components/ui/RollingNumber";

const COPY = {
  more: "Показати більше",
  less: "Приховати",
  // "Показано N із M"; both numbers roll (ui/RollingNumber.tsx).
  shown: "Показано",
  of: "із",
} as const;

// Load-more block of every phone list (D4 / TR-12, system spec A9; blog
// master 3176:5601, BlogList.tsx): the counter "Показано N із M" (14/20
// #777779, NOT a live region - the focus rule carries the change) 16
// above the Button/Small "Показати більше" with the plus disc, centred.
// Renders nothing once everything is shown (A-5), unless `onLess` is
// given (dashboard payments): then the counter stays with "Приховати" and
// the minus disc. Callers pass `onLess` only while the list is longer
// than its first batch, and place the block 48 under the list
// (`className="mt-12 lg:hidden"`).
//
// Focus (one rule for every list; A9 as amended by DECISIONS round 3):
// after EVERY batch the first newly shown item takes the focus -
// `focusAfterLast()` (the name the area specs use; it is called after
// every batch, not only the last one) returns that item's primary link,
// computed from the `shown` of the render the tap happened in. The new
// items append in place; the item's row (its closest `li`, else the
// element itself) is then scrolled into view only as far as needed
// (`block: "nearest"`, instant under reduced motion), so a keyboard
// user's next Tab walks the new rows. Without a target (no getter, or
// nothing rendered yet) the focus stays on the button without scrolling
// (iOS does not focus a tapped button by itself). After "Приховати" the
// list shrinks: the button is focused and brought back into view.
export function LoadMore({
  shown,
  total,
  onMore,
  onLess,
  label = COPY.more,
  lessLabel = COPY.less,
  className = "",
  focusAfterLast,
}: {
  shown: number;
  total: number;
  onMore: () => void;
  onLess?: () => void;
  label?: string;
  lessLabel?: string;
  className?: string;
  focusAfterLast?: () => HTMLElement | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const count = Math.min(shown, total);
  const more = count < total;
  if (!more && !onLess) return null;

  // Runs a frame after the tap, when React has committed the new list.
  const settleFocus = (after: "more" | "less") => {
    requestAnimationFrame(() => {
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
      const button = rootRef.current?.querySelector("button") ?? null;
      const item = after === "more" ? (focusAfterLast?.() ?? null) : null;
      const target = item ?? button;
      if (!target) return;
      target.focus({ preventScroll: true });
      if (item) (item.closest("li") ?? item).scrollIntoView({ block: "nearest", behavior });
      else if (after === "less") target.scrollIntoView({ block: "nearest", behavior });
    });
  };

  return (
    <div ref={rootRef} className={`flex flex-col items-center gap-4 ${className}`}>
      <p className="whitespace-nowrap text-[14px] leading-5 text-neutral-500">
        {COPY.shown} <RollingNumber value={count} /> {COPY.of} <RollingNumber value={total} />
      </p>
      {more ? (
        <Button
          size="small"
          plus
          onClick={() => {
            onMore();
            settleFocus("more");
          }}
        >
          {label}
        </Button>
      ) : (
        <Button
          size="small"
          minus
          onClick={() => {
            onLess?.();
            settleFocus("less");
          }}
        >
          {lessLabel}
        </Button>
      )}
    </div>
  );
}
