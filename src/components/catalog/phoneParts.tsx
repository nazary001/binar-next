"use client";

import { useCallback } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { showToast } from "@/components/ui/Toast";

// Phone-only pieces of the catalog cluster (mobile pass, C-catalog).

const COPY = {
  added: "Додано у кошик",
  cart: "Кошик",
} as const;

// Same split as the CSS `lg:` (useMediaQuery DESKTOP_QUERY is min-width
// 640): read at tap time, so no hydration question arises.
const PHONE_QUERY = "(max-width: 639.98px)";

// Add-to-cart from a catalog card / row (DECISIONS O-11): on phones the
// line is added WITHOUT opening the full-screen cart sheet; the header
// badge bumps and the toast «Додано у кошик» offers «Кошик» (opens the
// sheet). From 640 the drawer opens as today (desktop frozen). Returns
// true when the phone path ran (the caller may reset its stepper).
// The toast keeps the 5-s auto hide of a plain toast (the timer pauses
// while it holds the finger or the focus) and stays dismissible: the
// cart stays one tap away in the header, so the action is never lost.
// `quiet` (the «Купують разом» discs on the product page): from 640 the
// line is added WITHOUT opening the drawer too - the disc's check and
// count bubble are the feedback, the reader stays on the page.
export function useCatalogAdd(): (id: string, qty: number, quiet?: boolean) => boolean {
  const { add, openCart } = useCart();
  return useCallback(
    (id: string, qty: number, quiet = false) => {
      const phone = typeof window !== "undefined" && window.matchMedia(PHONE_QUERY).matches;
      if (!phone) {
        add(id, qty, !quiet);
        return false;
      }
      add(id, qty, false);
      showToast({
        message: COPY.added,
        action: { label: COPY.cart, onClick: openCart },
        dismissible: true,
        durationMs: 5000,
      });
      return true;
    },
    [add, openCart],
  );
}
