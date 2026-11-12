"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useEffectEvent,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";

// The plumbing of the panel's layers (Modal, Drawer, ConfirmDialog, the
// command palette). Components normally do not call these directly; they
// are exported for a screen that needs a layer of its own shape.
//
//   const box = useRef<HTMLDivElement>(null);
//   const mounted = usePresence(open, 300);          // keeps it for the exit
//   useModalLayer(open, { onClose, containerRef: box });
//   const ready = useClientReady();                  // no portal on the server
//   {ready && mounted && createPortal(
//     <div ref={box} data-admin-layer role="dialog" aria-modal="true" inert={!open} className="fixed inset-0 ...">...</div>,
//     adminRoot(),
//   )}
//
// What useModalLayer guarantees while `open` is true:
// - the page behind does not scroll (lockScroll, on <html>);
// - Escape closes the top-most open layer only (a confirm over a drawer
//   closes first), and not when something inside already used that Escape
//   (an open menu or a select stops it, see below);
// - Tab and Shift+Tab cycle inside the container;
// - focus moves in (initialFocusRef, else `[data-autofocus]`, else the first
//   focusable element that is not a close button, else the container) and
//   goes back to the element that had it when the layer closes.
//
// Floating layers (menus, listboxes, date pickers) must portal into
// floatingRoot(anchor) instead of adminRoot(): the wrapper of a modal layer
// and the card of a Popover carry `data-admin-layer`, so a list opened
// inside one stays inside the aria-modal dialog (screen readers ignore
// everything outside it), paints above its card, and a press on it does
// not count as a press outside the popover. Their Escape handler must stop
// the event's propagation (ui/floating.ts useDismiss does, and so does a
// React onKeyDown that calls stopPropagation): the layers listen on the
// window, so a stopped Escape closes the list and leaves the layer open.

// The element every panel layer is portalled into. Portals straight into
// <body> would leave the [data-admin] subtree, and the panel's CSS scope
// (admin-scroll, the phone word-break rules) with it.
export function adminRoot(): HTMLElement {
  return document.querySelector<HTMLElement>("[data-admin]") ?? document.body;
}

// Where a floating layer opened from `anchor` is portalled: into the
// modal layer that holds the anchor, or the panel root.
export function floatingRoot(anchor: Element | null | undefined): HTMLElement {
  return anchor?.closest<HTMLElement>("[data-admin-layer]") ?? adminRoot();
}

// Writes a node into a ref of either kind (a callback or an object), so a
// component can keep its own ref and still honour the caller's.
export function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

// --- Triggers ----------------------------------------------------------------

// What a layer (DropdownMenu, Popover) hands to the button that opens it.
export type TriggerHandlers = {
  ref: (node: HTMLElement | null) => void;
  onClick: (event: ReactMouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: ReactKeyboardEvent<HTMLElement>) => void;
};

// The handlers a caller's trigger element may already carry.
export type TriggerElementProps = {
  ref?: Ref<HTMLElement>;
  onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: ReactKeyboardEvent<HTMLElement>) => void;
};

// A trigger is either an element (its own ref and handlers still run,
// before the layer's) or a function of the props and the layer's state.
export type TriggerProp<P, S> = ReactElement<TriggerElementProps> | ((props: P, state: S) => ReactNode);

// Renders the caller's trigger with the layer's props merged in. A
// component of its own: the props carry handlers that touch refs, and the
// React rules allow handing those to an element, not calling a function
// with them during the layer's render.
export function TriggerSlot<P extends TriggerHandlers, S>({
  trigger,
  props,
  state,
}: {
  trigger: TriggerProp<P, S>;
  props: P;
  state: S;
}): ReactNode {
  if (typeof trigger === "function") return trigger(props, state);
  if (!isValidElement(trigger)) return null;
  const own = trigger.props;
  const onKeyDown = props.onKeyDown;
  return cloneElement(trigger, {
    ...props,
    ref: (node: HTMLElement | null) => {
      props.ref(node);
      assignRef(own.ref, node);
    },
    onClick: (event: ReactMouseEvent<HTMLElement>) => {
      own.onClick?.(event);
      if (!event.defaultPrevented) props.onClick(event);
    },
    onKeyDown: onKeyDown
      ? (event: ReactKeyboardEvent<HTMLElement>) => {
          own.onKeyDown?.(event);
          if (!event.defaultPrevented) onKeyDown(event);
        }
      : own.onKeyDown,
  } as TriggerElementProps);
}

const noopSubscribe = () => () => {};

// False on the server and during hydration, true afterwards: portals and
// anything that reads `document` render only behind it.
export function useClientReady(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

// True when the visitor asked the system for less motion.
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// --- Scroll lock -----------------------------------------------------------

// One reference-counted lock for every layer. It goes on <html>, never on
// <body>: body{overflow:hidden} re-scopes sticky elements (the top bar) to
// the body scroller and they fly off on a scrolled page. The width of the
// scrollbar that disappears is given back as padding, so the page under
// the scrim does not jump sideways.
let lockCount = 0;
let saved = { overflow: "", paddingRight: "" };

export function lockScroll(): () => void {
  const root = document.documentElement;
  if (lockCount === 0) {
    const scrollbar = window.innerWidth - root.clientWidth;
    saved = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };
    root.style.overflow = "hidden";
    if (scrollbar > 0) {
      const current = parseFloat(getComputedStyle(root).paddingRight) || 0;
      root.style.paddingRight = `${current + scrollbar}px`;
    }
  }
  lockCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount -= 1;
    if (lockCount === 0) {
      root.style.overflow = saved.overflow;
      root.style.paddingRight = saved.paddingRight;
    }
  };
}

// --- Focus -----------------------------------------------------------------

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

// The elements Tab can reach inside `container`, in document order:
// rendered (has a box) and not inside an inert subtree (a closing layer
// kept for its exit animation).
export function focusableIn(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.getClientRects().length > 0 && !el.closest("[inert]") && el.tabIndex >= 0,
  );
}

function initialTarget(container: HTMLElement, preferred: HTMLElement | null | undefined): HTMLElement {
  if (preferred && preferred.isConnected) return preferred;
  const marked = container.querySelector<HTMLElement>("[data-autofocus]");
  if (marked && marked.getClientRects().length > 0) return marked;
  const nodes = focusableIn(container);
  // The close cross (and the small actions of a header) come first in most
  // layers; landing there reads badly and an Enter would close the layer.
  // Prefer the first field or the safe button of the footer: anything not
  // inside an element marked `data-no-autofocus`.
  return nodes.find((el) => !el.closest("[data-no-autofocus]")) ?? nodes[0] ?? container;
}

// --- The stack of open layers ----------------------------------------------

// Modal layers (useModalLayer) and non-modal ones that close on Escape
// (useEscapeLayer: popovers), newest last. Only the top one reacts to a
// key, so a popover in a drawer closes before the drawer.
type Layer = { opener: HTMLElement | null; box: HTMLElement | null };
const layers: Layer[] = [];

// True while any layer is open (the palette's "/" shortcut stays quiet then).
export function hasOpenLayer(): boolean {
  return layers.length > 0;
}

// A non-modal layer on the same stack: while `open`, Escape runs
// `onEscape` when this layer is the top one and nothing inside used the
// key first (a select's list stops it at the document, see above).
export function useEscapeLayer(open: boolean, onEscape: () => void): void {
  const escape = useEffectEvent(onEscape);
  useEffect(() => {
    if (!open) return;
    const layer: Layer = { opener: null, box: null };
    layers.push(layer);
    const onKey = (event: KeyboardEvent) => {
      if (layers[layers.length - 1] !== layer) return;
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
      event.preventDefault();
      escape();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      const index = layers.indexOf(layer);
      if (index !== -1) layers.splice(index, 1);
    };
  }, [open]);
}

export type ModalLayerOptions = {
  onClose: () => void;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  // While true, Escape does nothing (a request is running).
  locked?: boolean;
};

export function useModalLayer(open: boolean, { onClose, containerRef, initialFocusRef, locked = false }: ModalLayerOptions): void {
  // The layer's portal renders only after hydration; the effect waits for
  // it, so the container exists when focus moves in.
  const ready = useClientReady();

  // The latest callbacks without re-running the effect: a layer whose
  // onClose changes identity on every render must not be pushed back on
  // top of the stack (that would steal focus and Escape).
  const close = useEffectEvent(() => {
    if (!locked) onClose();
  });

  useEffect(() => {
    if (!open || !ready) return;
    const box = containerRef.current;
    const active = document.activeElement;
    const layer: Layer = {
      opener: active instanceof HTMLElement && active !== document.body ? active : null,
      box,
    };
    layers.push(layer);
    const release = lockScroll();

    // preventScroll: the card may still be translated by its enter
    // animation, and focus() would scroll its overflow:hidden parents.
    if (box) initialTarget(box, initialFocusRef?.current).focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (layers[layers.length - 1] !== layer) return;
      if (event.key === "Escape") {
        if (event.defaultPrevented || event.isComposing) return;
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !box) return;
      const nodes = focusableIn(box);
      if (nodes.length === 0) {
        event.preventDefault();
        box.focus({ preventScroll: true });
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const current = document.activeElement;
      const inside = current instanceof Node && box.contains(current);
      if (event.shiftKey ? current === first || !inside : current === last || !inside) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    // The window, not the document: a menu or a select inside the layer
    // handles its own Escape at the document and stops the propagation, so
    // that Escape closes the menu and not the layer.
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      const index = layers.indexOf(layer);
      const wasTop = index === layers.length - 1;
      if (index !== -1) layers.splice(index, 1);
      release();
      if (!wasTop) {
        // Closed from under another layer: focus stays in the top one, and
        // layers opened from inside this one return to its opener instead.
        for (const above of layers.slice(Math.max(index, 0))) {
          if (above.opener && box?.contains(above.opener)) above.opener = layer.opener;
        }
        return;
      }
      const opener = layer.opener;
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open, ready, containerRef, initialFocusRef]);
}

// --- Presence (exit animations) ----------------------------------------------

// Keeps a layer mounted for `ms` after `open` turns false, so its exit
// transition can play; returns whether it should be rendered. The enter
// animation needs nothing from here: mount the layer with its open classes
// plus `starting:` ones (CSS @starting-style). While closing, render the
// closed classes and `inert`.
export function usePresence(open: boolean, ms: number): boolean {
  const [mounted, setMounted] = useState(open);
  // Opening mounts in the same render (state adjusted behind a comparison).
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open || !mounted) return;
    const timer = window.setTimeout(() => setMounted(false), prefersReducedMotion() ? 0 : ms);
    return () => window.clearTimeout(timer);
  }, [open, mounted, ms]);

  return mounted;
}
