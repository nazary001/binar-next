"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "../lib/format";
import { useFloating, type Placement } from "./floating";
import { adminRoot, floatingRoot, focusableIn, TriggerSlot, useClientReady, useEscapeLayer, type TriggerProp } from "./overlay";
import { SURFACE, Z } from "./tokens";

// A small floating card opened by a click: a filter set, a quick form, a
// detail that does not deserve a modal. Not modal: the page stays usable,
// a press outside or Escape closes it, focus moves in on open and back to
// the trigger on Escape.
//
//   <Popover
//     label="Фільтри замовлень"
//     width={340}
//     trigger={<Button variant="secondary" iconLeft={FunnelIcon}>Фільтри</Button>}
//   >
//     {({ close }) => (
//       <form onSubmit={(event) => { event.preventDefault(); apply(); close(); }}>...</form>
//     )}
//   </Popover>
//
// Props
// - trigger: a button element (its own onClick / onKeyDown / ref still
//   run), or a function (props, { open }) => element that spreads `props`.
// - children: the content, or a function of { close } for content that
//   closes the card itself ("Застосувати").
// - placement: from ui/floating.ts, default "bottom-start".
// - width: px (default 320) or "anchor" (at least as wide as the trigger).
// - open, onOpenChange: optional control from outside; without them the
//   popover keeps its own state.
// - label: the card's accessible name (default: the trigger's text).
// - padding: false for content that brings its own (a list).
// Selects, menus and pickers inside the card must portal into
// floatingRoot(anchor) (ui/overlay.ts); the card carries `data-admin-layer`,
// so their lists stay inside it and a press on them does not close it.

export type PopoverTriggerProps = {
  ref: (node: HTMLElement | null) => void;
  id: string;
  "aria-haspopup": "dialog";
  "aria-expanded": boolean;
  "aria-controls"?: string;
  onClick: (event: MouseEvent<HTMLElement>) => void;
};

export type PopoverProps = {
  trigger: TriggerProp<PopoverTriggerProps, { open: boolean }>;
  children: ReactNode | ((api: { close: () => void }) => ReactNode);
  placement?: Placement;
  width?: number | "anchor";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  label?: string;
  padding?: boolean;
};

// Opacity only: a scale or translate on the card would become the
// containing block of the fixed lists opened inside it.
const CARD = "fixed overflow-y-auto outline-none admin-scroll transition-opacity duration-150 motion-reduce:transition-none starting:opacity-0";

// The content, rendered by a component of its own (the trigger goes
// through TriggerSlot of overlay.ts): `close` touches refs, and the React
// rules allow handing it to an element, not calling a function with it
// during render.
function ContentSlot({ content, close }: { content: PopoverProps["children"]; close: () => void }) {
  return <>{typeof content === "function" ? content({ close }) : content}</>;
}

export function Popover({
  trigger,
  children,
  placement = "bottom-start",
  width = 320,
  open: openProp,
  onOpenChange,
  label,
  padding = true,
}: PopoverProps) {
  const [inner, setInner] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : inner;
  const ready = useClientReady();
  const anchorRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();
  const cardId = useId();

  const setOpen = useCallback(
    (value: boolean) => {
      if (!controlled) setInner(value);
      onOpenChange?.(value);
    },
    [controlled, onOpenChange],
  );

  useFloating(open, anchorRef, cardRef, { placement, offset: 8, matchWidth: width === "anchor" });

  // A press outside closes the card; focus goes where the press lands.
  // (Not ui/floating.ts useDismiss: its Escape listener would also fire for
  // an Escape that a select inside the card spends on its own list.)
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (anchorRef.current?.contains(target) || cardRef.current?.contains(target))) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer, true);
    return () => document.removeEventListener("pointerdown", onPointer, true);
  }, [open, setOpen]);

  // Escape, on the layer stack of ui/overlay.ts: a popover in a modal closes
  // first, and a list inside the popover that handles the key keeps it open.
  useEscapeLayer(open, () => {
    const active = document.activeElement;
    const focusInside = Boolean(active && cardRef.current?.contains(active)) || active === document.body;
    setOpen(false);
    if (focusInside) anchorRef.current?.focus({ preventScroll: true });
  });

  // Focus moves in once the card is on screen: a marked element, the first
  // field or button, else the card itself.
  useEffect(() => {
    if (!open) return;
    const card = cardRef.current;
    if (!card) return;
    const marked = card.querySelector<HTMLElement>("[data-autofocus]");
    (marked ?? focusableIn(card)[0] ?? card).focus({ preventScroll: true });
  }, [open]);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) anchorRef.current?.focus({ preventScroll: true });
  };

  const setAnchor = useCallback((node: HTMLElement | null) => {
    anchorRef.current = node;
  }, []);

  const triggerProps: PopoverTriggerProps = {
    ref: setAnchor,
    id: triggerId,
    "aria-haspopup": "dialog",
    "aria-expanded": open,
    "aria-controls": open ? cardId : undefined,
    onClick: (event) => {
      if (open) {
        close(false);
        return;
      }
      setHost(floatingRoot(event.currentTarget));
      setOpen(true);
    },
  };

  const onCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const card = cardRef.current;
    if (!card) return;
    const nodes = focusableIn(card);
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    // Leaving the card closes it. Forwards: back on the trigger first, so
    // the browser's Tab moves on from there; backwards: the trigger itself.
    if (!event.shiftKey && (nodes.length === 0 || active === last)) {
      anchorRef.current?.focus({ preventScroll: true });
      setOpen(false);
    } else if (event.shiftKey && (nodes.length === 0 || active === first || active === card)) {
      event.preventDefault();
      close(true);
    }
  };

  return (
    <>
      <TriggerSlot trigger={trigger} props={triggerProps} state={{ open }} />
      {ready &&
        open &&
        createPortal(
          <div
            ref={cardRef}
            id={cardId}
            role="dialog"
            aria-label={label}
            aria-labelledby={label ? undefined : triggerId}
            tabIndex={-1}
            data-admin-layer=""
            onKeyDown={onCardKeyDown}
            style={typeof width === "number" ? { width: `min(${width}px, calc(100vw - 16px))` } : undefined}
            className={cx(CARD, SURFACE.float, Z.dropdown, padding && "p-4")}
          >
            <ContentSlot content={children} close={() => close(true)} />
          </div>,
          // Opened from outside (controlled) without a press: the panel root.
          host ?? adminRoot(),
        )}
    </>
  );
}
