"use client";

import { useCallback } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { flyToCart } from "@/components/cart/flyToCart";
import { showToast } from "@/components/ui/Toast";

// Phone-only pieces of the catalog cluster (mobile pass, C-catalog).

const COPY = {
  added: "Додано у кошик",
  cart: "Кошик",
} as const;

// Same split as the CSS `lg:` (useMediaQuery DESKTOP_QUERY is min-width
// 640): read at tap time, so no hydration question arises.
const PHONE_QUERY = "(max-width: 639.98px)";

// Add-to-cart of a single product (the catalog cards and rows, the
// «Купують разом» discs, the product page «Додати у кошик»): on every
// width the line is added WITHOUT opening the cart (drawer or phone
// sheet); the product flies from the pressed control into the header
// cart, which bumps (cart/flyToCart.ts; designer 2026-11-11: «не корзину
// відкривати, а дамо легку анімацію, що товар полетів в корзину»).
// Phones also keep the toast «Додано у кошик» with «Кошик» (opens the
// sheet; DECISIONS O-11 and C19). Returns true when the phone path ran
// (the caller may reset its stepper).
// The toast keeps the 5-s auto hide of a plain toast (the timer pauses
// while it holds the finger or the focus) and stays dismissible: the
// cart stays one tap away in the header, so the action is never lost.
// `from` = the pressed control (where the flight starts) and the product
// photo for the flying thumbnail.
export function useCatalogAdd(): (
  id: string,
  qty: number,
  from?: { el?: Element | null; image?: string },
) => boolean {
  const { add, openCart } = useCart();
  return useCallback(
    (id: string, qty: number, from?: { el?: Element | null; image?: string }) => {
      add(id, qty, false);
      flyToCart(from?.el, from?.image);
      const phone = typeof window !== "undefined" && window.matchMedia(PHONE_QUERY).matches;
      if (!phone) return false;
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
