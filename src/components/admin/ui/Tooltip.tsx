"use client";

import {
  Children,
  cloneElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cx } from "../lib/format";
import { useFloating, type Placement } from "./floating";
import { floatingRoot } from "./overlay";
import { FLOAT_SHADOW, Z } from "./tokens";

// Tooltip: a short dark note next to one element, after 300 ms of mouse
// hover or on keyboard focus. Never on touch (a tap would show it and
// leave it hanging), never for anything a person must read to act: use a
// hint or a caption for that.
//
//   <Tooltip content="Скопіювати номер">
//     <IconButton label="Скопіювати" icon={DocumentDuplicateIcon} onClick={copy} />
//   </Tooltip>
//   <Tooltip content={formatDateTime(order.createdAt)} placement="bottom">
//     <span tabIndex={0}>{formatRelative(order.createdAt)}</span>
//   </Tooltip>
//
// Props
// - content: the note (text, a line or two).
// - children: ONE element that takes ref-less event props (a button, a
//   link, a span with tabIndex={0}). A disabled button fires no pointer
//   events: wrap it in a <span tabIndex={0}> to explain why it is disabled.
// - placement: "top" (default), "bottom", "top-start", "bottom-start",
//   "right-start", "left-start" ... (ui/floating.ts); it flips when there is
//   no room.
// - delay: ms before it shows (300).
// - describe: the content becomes the element's aria-describedby (default
//   true). Pass false when the note repeats the element's own label (an
//   IconButton whose tooltip is its label), so it is not read twice.
// - disabled: renders the child alone.
//
// Escape hides it; pressing the element hides it too.

export type TooltipProps = {
  content: ReactNode;
  children: ReactElement;
  placement?: Placement;
  delay?: number;
  describe?: boolean;
  disabled?: boolean;
};

type AnchorProps = {
  "aria-describedby"?: string;
  onPointerEnter?: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave?: (event: PointerEvent<HTMLElement>) => void;
  onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
};

export function Tooltip({ content, children, placement = "top", delay = 300, describe = true, disabled = false }: TooltipProps) {
  const layerId = useId();
  const noteId = useId();
  const anchorRef = useRef<HTMLElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  // `pending` starts the delay; the timer (in an effect) turns it into
  // `open`, so no timer id has to live in a ref.
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  // The element the note points at. It is state (set by the handlers handed
  // to the child) and copied into the ref useFloating reads; this layout
  // effect is declared first, so it runs before useFloating's own.
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    anchorRef.current = anchor;
  });

  useFloating(open, anchorRef, layerRef, { placement, offset: 8 });

  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setOpen(true), delay);
    return () => window.clearTimeout(timer);
  }, [pending, delay]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPending(false);
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const child = Children.only(children) as ReactElement<AnchorProps>;
  if (disabled || content === null || content === undefined || content === "") return child;
  const own = child.props;

  const show = (element: HTMLElement) => {
    setAnchor(element);
    setHost(floatingRoot(element));
    setPending(true);
  };
  const hide = () => {
    setPending(false);
    setOpen(false);
  };

  return (
    <>
      {cloneElement(child, {
        "aria-describedby": describe ? cx(own["aria-describedby"], noteId) : own["aria-describedby"],
        onPointerEnter: (event: PointerEvent<HTMLElement>) => {
          own.onPointerEnter?.(event);
          if (event.pointerType === "mouse") show(event.currentTarget);
        },
        onPointerLeave: (event: PointerEvent<HTMLElement>) => {
          own.onPointerLeave?.(event);
          hide();
        },
        onPointerDown: (event: PointerEvent<HTMLElement>) => {
          own.onPointerDown?.(event);
          hide();
        },
        onFocus: (event: FocusEvent<HTMLElement>) => {
          own.onFocus?.(event);
          // Keyboard focus only: a tap or a click also focuses a button.
          if (event.currentTarget.matches(":focus-visible")) show(event.currentTarget);
        },
        onBlur: (event: FocusEvent<HTMLElement>) => {
          own.onBlur?.(event);
          hide();
        },
      })}
      {/* The description screen readers get, present before the note shows. */}
      {describe && (
        <span id={noteId} hidden>
          {content}
        </span>
      )}
      {open &&
        host &&
        createPortal(
          <div
            ref={layerRef}
            id={layerId}
            role="tooltip"
            className={cx(
              "pointer-events-none fixed max-w-[280px] rounded-xl bg-neutral-900 px-2.5 py-1.5 text-[12px] font-medium leading-4 text-white",
              "transition-opacity duration-150 starting:opacity-0 motion-reduce:transition-none",
              FLOAT_SHADOW,
              Z.dropdown,
            )}
          >
            {content}
          </div>,
          host,
        )}
    </>
  );
}
