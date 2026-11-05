import { useEffect, useEffectEvent, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// What a full-screen overlay makes inert besides itself: the sticky header
// (public or platform) and the two phone menu sheets. Elements that are
// already inert when the overlay opens (a closed menu, which React keeps
// `inert`) are skipped, so React stays the only owner of their attribute.
export const OVERLAY_INERT = "body > header, #mobile-nav, #cabinet-nav";

// What a phone menu sheet (z-45, under the header) makes inert: every body
// child except the header, the menus themselves and the toast host.
export const MENU_INERT =
  "body > :not(header):not(#mobile-nav):not(#cabinet-nav):not([data-toast-host])";

// One reference-counted owner of the page scroll lock. The lock goes on
// <html>, not <body>: body{overflow:hidden} re-scopes the sticky header to
// the body scroller and the header flies off-screen on scrolled pages.
// Stacked overlays (cart sheet + stock sheet, a viewer + the auth sheet)
// each hold one reference; scrolling comes back only when the last one is
// released, in whatever order they close.
let lockCount = 0;
let savedOverflow = "";

export function acquireScrollLock(): () => void {
  const root = document.documentElement;
  if (lockCount === 0) {
    savedOverflow = root.style.overflow;
    root.style.overflow = "hidden";
  }
  lockCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount -= 1;
    if (lockCount === 0) root.style.overflow = savedOverflow;
  };
}

// Open dialogs, newest last. Only the top one handles Escape / Tab, so a
// stacked pair (a confirm over a sheet, the auth drawer over the materials
// preview) closes top-first and Tab cycles inside the top dialog. A dialog
// can still close from under another one (a phone sheet closes on the 640
// crossing or a route change while a confirm card stays open over it): it
// then leaves focus in the top dialog, and a dialog opened from inside it
// inherits its opener, so focus has a live target when that one closes.
type Layer = { opener: HTMLElement | null; box: HTMLElement | null };
const layers: Layer[] = [];

// Elements made inert by open dialogs, with the number of dialogs holding
// each (a stacked pair shares the header): the attribute goes only when the
// last holder closes, in whatever order they close. Elements that are
// already inert and not held here (a closed menu, which React keeps
// `inert`) are skipped, so React stays the only owner of their attribute.
const inertHolds = new Map<HTMLElement, number>();

function holdInert(selector: string, box: HTMLElement | null): HTMLElement[] {
  const held: HTMLElement[] = [];
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    if (box && el.contains(box)) continue;
    const count = inertHolds.get(el);
    if (count === undefined) {
      if (el.hasAttribute("inert")) continue;
      el.setAttribute("inert", "");
    }
    inertHolds.set(el, (count ?? 0) + 1);
    held.push(el);
  }
  return held;
}

// The phone menus own their `inert` (React sets it while they are closed).
// A menu that was OPEN when a dialog took it and closed under the dialog
// (route change, cart disc) got React's `inert` on an attribute that was
// already set; removing it on release would leave the closed, invisible
// menu in the tab order. Closed = every toggle that controls it reports
// aria-expanded="false" (or, with no toggle, the menu is aria-hidden).
const MENU_IDS = ["mobile-nav", "cabinet-nav"];

function menuClosed(el: HTMLElement): boolean {
  if (!MENU_IDS.includes(el.id)) return false;
  const toggles = [...document.querySelectorAll(`[aria-controls="${el.id}"][aria-expanded]`)];
  if (toggles.length === 0) return el.getAttribute("aria-hidden") === "true";
  return toggles.every((t) => t.getAttribute("aria-expanded") === "false");
}

function releaseInert(held: HTMLElement[]) {
  for (const el of held) {
    const count = (inertHolds.get(el) ?? 1) - 1;
    if (count > 0) {
      inertHolds.set(el, count);
    } else {
      inertHolds.delete(el);
      if (!menuClosed(el)) el.removeAttribute("inert");
    }
  }
}

// Shared dialog plumbing for the drawers, sheets and modals:
// - Escape closes (the top dialog of a stack, see layers);
// - the page behind cannot scroll (acquireScrollLock);
// - Tab / Shift+Tab cycle inside the (top) dialog (WCAG 2.4.3);
// - anything matched by `inertSelector` (the sticky header, which paints
//   above the drawer's scrim; OVERLAY_INERT for full-screen sheets) is made
//   inert while open;
// - focus moves to `initial` on open and returns to the opener on close,
//   both without scrolling the page (the opener usually sits in the sticky
//   header, and `scroll-padding-top` would otherwise jump the page).
export function useModalBehavior({
  open,
  onClose,
  container,
  initial,
  inertSelector,
}: {
  open: boolean;
  onClose: () => void;
  container: RefObject<HTMLElement | null>;
  initial?: RefObject<HTMLElement | null>;
  inertSelector?: string;
}) {
  // The latest onClose, outside the effect's dependencies: a dialog whose
  // onClose changes identity while open (an inline callback, or a parent
  // re-render while it sits under another dialog) must not re-run the
  // effect, which would push it back on top, steal focus and take Escape.
  const close = useEffectEvent(onClose);

  useEffect(() => {
    if (!open) return;
    const layer: Layer = {
      opener: document.activeElement as HTMLElement | null,
      box: container.current,
    };
    const releaseLock = acquireScrollLock();
    const held = inertSelector ? holdInert(inertSelector, layer.box) : [];

    (initial?.current ?? container.current)?.focus({ preventScroll: true });

    layers.push(layer);

    const onKey = (e: KeyboardEvent) => {
      if (layers[layers.length - 1] !== layer) return;
      if (e.key === "Escape") {
        // A field inside the dialog already used this Escape to close
        // its own menu (checkout/fields.tsx selects, KebabMenu).
        if (e.defaultPrevented) return;
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !container.current) return;
      // Visible and not inside an inert subtree (a hidden popup kept in
      // the DOM for its exit transition cannot take focus).
      const nodes = [...container.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null && !el.closest("[inert]"),
      );
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && container.current.contains(active);
      if (e.shiftKey ? active === first || !inside : active === last || !inside) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      const index = layers.indexOf(layer);
      const wasTop = index === layers.length - 1;
      if (index !== -1) layers.splice(index, 1);
      releaseLock();
      releaseInert(held);
      if (!wasTop) {
        // Closed under another dialog: focus stays where it is (in the top
        // dialog); dialogs opened from inside this one return to its opener.
        for (const above of layers.slice(index)) {
          if (above.opener && layer.box?.contains(above.opener)) above.opener = layer.opener;
        }
        return;
      }
      const opener = layer.opener;
      if (opener && opener.isConnected && typeof opener.focus === "function") {
        opener.focus({ preventScroll: true });
      }
    };
  }, [open, container, initial, inertSelector]);
}
