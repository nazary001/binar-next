import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Shared dialog plumbing for the cart drawer and the stock modal:
// - Escape closes;
// - the page behind cannot scroll (the lock goes on <html>, not <body>:
//   body{overflow:hidden} re-scopes the sticky header to the body scroller
//   and the header flies off-screen on scrolled pages);
// - Tab / Shift+Tab cycle inside the dialog (WCAG 2.4.3);
// - anything matched by `inertSelector` (the sticky header, which paints
//   above the drawer's scrim) is made inert while open;
// - focus moves to `initial` on open and returns to the opener on close.
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
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    const inerted = inertSelector
      ? [...document.querySelectorAll<HTMLElement>(inertSelector)].filter(
          (el) => !el.hasAttribute("inert") && !el.contains(container.current),
        )
      : [];
    inerted.forEach((el) => el.setAttribute("inert", ""));

    (initial?.current ?? container.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !container.current) return;
      const nodes = [...container.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
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
      root.style.overflow = prevOverflow;
      inerted.forEach((el) => el.removeAttribute("inert"));
      if (opener && opener.isConnected && typeof opener.focus === "function") {
        opener.focus();
      }
    };
  }, [open, onClose, container, initial, inertSelector]);
}
