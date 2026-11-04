"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Product } from "@/components/catalog/data";
import * as authStore from "@/components/auth/store";
import {
  cartCount,
  cartSubtotal,
  checkStock,
  resolveLines,
  unitPrice,
  type CartEntry,
  type CartLine,
  type PriceMode,
  type StockIssue,
} from "./data";
import { getServerSnapshot, getSnapshot, subscribe, updateLines } from "./store";
import { CartDrawer } from "./CartDrawer";
import { StockModal } from "./StockModal";

// The provider sits OUTSIDE AuthProvider (app/layout.tsx), so the
// account type is read straight from the auth store: a signed-in B2B
// partner is billed the partner price. Server snapshot = signed out.
function accountTypeSnapshot(): "b2b" | "b2c" | null {
  return authStore.currentAccount(authStore.getSnapshot())?.type ?? null;
}

function usePriceMode(): PriceMode {
  const type = useSyncExternalStore(authStore.subscribe, accountTypeSnapshot, () => null);
  return type === "b2b" ? "partner" : "retail";
}

type CartContextValue = {
  lines: CartLine[];
  entries: CartEntry[];
  count: number;
  subtotal: number;
  // «partner» while a B2B account is signed in; every price the cart
  // shows (rows, totals, the stock modal, checkout) goes through it.
  priceMode: PriceMode;
  unitPrice: (product: Product) => number;
  open: boolean;
  openCart: () => void;
  closeCart: () => void;
  // Adds `qty` of a product (merging into an existing line); `show`
  // slides the drawer open as feedback.
  add: (id: string, qty?: number, show?: boolean) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  // «Оформити замовлення»: runs the stock check. Returns true when the
  // cart is clean (the caller navigates to /checkout); sold-out lines
  // open the «Деякі товари закінчилися» modal instead and return false.
  checkout: () => boolean;
  // PDP «Купити зараз»: adds the line without opening the drawer and
  // runs the same stock check on the updated cart. True = go to
  // /checkout; false = the stock modal took over.
  buyNow: (id: string, qty?: number) => boolean;
  issues: StockIssue[] | null;
  resolveIssue: (lineId: string) => void;
  resolveAll: () => void;
  setIssueQty: (lineId: string, qty: number) => void;
  // Closes the stock modal: the close button, the scrim, «Повернутись до
  // каталогу» and, once everything is resolved, «Оформити замовлення»
  // (the caller then navigates to /checkout).
  dismissIssues: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

// Site-wide cart: the lines come from the localStorage-backed store
// (see store.ts), the drawer and the stock modal render here so any
// page can open them.
export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [open, setOpen] = useState(false);
  const [issues, setIssues] = useState<StockIssue[] | null>(null);

  const priceMode = usePriceMode();
  const entries = useMemo(() => resolveLines(lines), [lines]);
  const count = useMemo(() => cartCount(lines), [lines]);
  const subtotal = useMemo(() => cartSubtotal(entries, priceMode), [entries, priceMode]);
  const priceOf = useCallback((p: Product) => unitPrice(p, priceMode), [priceMode]);

  const openCart = useCallback(() => setOpen(true), []);
  const closeCart = useCallback(() => setOpen(false), []);

  const add = useCallback((id: string, qty = 1, show = true) => {
    updateLines((prev) => {
      const existing = prev.find((l) => l.id === id);
      if (existing) {
        return prev.map((l) => (l.id === id ? { ...l, qty: l.qty + qty } : l));
      }
      return [...prev, { id, qty }];
    });
    if (show) setOpen(true);
  }, []);

  const buyNow = useCallback(
    (id: string, qty = 1) => {
      add(id, qty, false);
      // The store is synchronous, so its snapshot already holds the new
      // line (the `lines` of this render do not yet).
      const found = checkStock(resolveLines(getSnapshot()), priceMode);
      setOpen(false);
      if (found.length === 0) return true;
      setIssues(found);
      return false;
    },
    [add, priceMode],
  );

  const setQty = useCallback((id: string, qty: number) => {
    updateLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.id !== id)
        : prev.map((l) => (l.id === id ? { ...l, qty } : l)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    updateLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clear = useCallback(() => updateLines(() => []), []);

  const checkout = useCallback(() => {
    const found = checkStock(resolveLines(lines), priceMode);
    setOpen(false);
    if (found.length === 0) return true;
    setIssues(found);
    return false;
  }, [lines, priceMode]);

  // Replacing swaps the sold-out line for the alternative at the chosen
  // quantity (merging if the alternative is already in the cart); with
  // no alternative the sold-out line is simply removed.
  const applyReplacement = useCallback((issue: StockIssue) => {
    const replacement = issue.replacement;
    updateLines((prev) => {
      const without = prev.filter((l) => l.id !== issue.lineId);
      if (!replacement) return without;
      const existing = without.find((l) => l.id === replacement.id);
      return existing
        ? without.map((l) =>
            l.id === replacement.id ? { ...l, qty: l.qty + issue.qty } : l,
          )
        : [...without, { id: replacement.id, qty: issue.qty }];
    });
  }, []);

  const resolveIssue = useCallback(
    (lineId: string) => {
      const target = issues?.find((i) => i.lineId === lineId && !i.resolved);
      if (!target) return;
      applyReplacement(target);
      setIssues((prev) =>
        prev ? prev.map((i) => (i.lineId === lineId ? { ...i, resolved: true } : i)) : prev,
      );
    },
    [issues, applyReplacement],
  );

  const resolveAll = useCallback(() => {
    issues?.filter((i) => !i.resolved).forEach(applyReplacement);
    setIssues((prev) => (prev ? prev.map((i) => ({ ...i, resolved: true })) : prev));
  }, [issues, applyReplacement]);

  const setIssueQty = useCallback((lineId: string, qty: number) => {
    setIssues((prev) =>
      prev
        ? prev.map((i) => (i.lineId === lineId ? { ...i, qty: Math.max(1, qty) } : i))
        : prev,
    );
  }, []);

  const dismissIssues = useCallback(() => setIssues(null), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      entries,
      count,
      subtotal,
      priceMode,
      unitPrice: priceOf,
      open,
      openCart,
      closeCart,
      add,
      setQty,
      remove,
      clear,
      checkout,
      buyNow,
      issues,
      resolveIssue,
      resolveAll,
      setIssueQty,
      dismissIssues,
    }),
    [
      lines,
      entries,
      count,
      subtotal,
      priceMode,
      priceOf,
      open,
      openCart,
      closeCart,
      add,
      setQty,
      remove,
      clear,
      checkout,
      buyNow,
      issues,
      resolveIssue,
      resolveAll,
      setIssueQty,
      dismissIssues,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
      <StockModal />
    </CartContext.Provider>
  );
}
