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
import { usePathname } from "next/navigation";
import type { Product } from "@/components/catalog/data";
import { usePartnerPrices } from "@/components/catalog/CatalogRegistry";
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

// Who opened the stock check (cart spec 2.6, S23): the phone stock sheet
// closes differently for each - "cart" hands back to the cart sheet the
// user was reviewing, "buyNow" (PDP) just dismisses, "checkout" (the
// CheckoutClient gate) dismisses and focuses the checkout lines' title.
export type IssuesFrom = "cart" | "buyNow" | "checkout";

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
  // The lines the last "Очистити" removed, until the cart closes, the
  // route changes or something is added (the phone sheet's empty state
  // then reads "Кошик очищено" and offers "Повернути товари").
  lastCleared: CartLine[] | null;
  restoreCleared: () => void;
  // Puts a removed line back at its old index (the phone sheet's
  // "Повернути" after a trash tap); a no-op when the id is already in.
  restoreLine: (line: CartLine, index: number) => void;
  // «Оформити замовлення»: runs the stock check. Returns true when the
  // cart is clean (the caller navigates to /checkout); sold-out lines
  // open the «Деякі товари закінчилися» modal instead and return false.
  // `from` = "checkout" when the checkout page's own gate calls it.
  checkout: (from?: "cart" | "checkout") => boolean;
  // PDP "Купити зараз": sets the line to exactly `qty` (adding it when
  // absent) without opening the drawer and runs the same stock check on
  // the updated cart. True = go to /checkout; false = the stock modal
  // took over.
  buyNow: (id: string, qty?: number) => boolean;
  issues: StockIssue[] | null;
  issuesFrom: IssuesFrom;
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
  const [issuesFrom, setIssuesFrom] = useState<IssuesFrom>("cart");
  const [lastCleared, setLastCleared] = useState<CartLine[] | null>(null);

  // A route change closes the cart and the stock check (a row link, the
  // CTA hand-off, Back): render-phase adjustment, the Header.tsx pattern,
  // so the closed state paints in the same commit as the new page.
  const pathname = usePathname();
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
    setIssues(null);
    setLastCleared(null);
  }

  const priceMode = usePriceMode();
  // The partner's price map (SessionData.prices): the boot's GET
  // /api/session may replace the mirrored one, and the subtotal and the
  // unit prices (so every cart consumer) must follow it.
  const prices = usePartnerPrices();
  const entries = useMemo(() => resolveLines(lines), [lines]);
  const count = useMemo(() => cartCount(lines), [lines]);
  const subtotal = useMemo(() => cartSubtotal(entries, priceMode, prices), [entries, priceMode, prices]);
  const priceOf = useCallback((p: Product) => unitPrice(p, priceMode, prices), [priceMode, prices]);

  const openCart = useCallback(() => setOpen(true), []);
  const closeCart = useCallback(() => {
    setOpen(false);
    setLastCleared(null);
  }, []);

  const add = useCallback((id: string, qty = 1, show = true) => {
    updateLines((prev) => {
      const existing = prev.find((l) => l.id === id);
      if (existing) {
        return prev.map((l) => (l.id === id ? { ...l, qty: l.qty + qty } : l));
      }
      return [...prev, { id, qty }];
    });
    setLastCleared(null);
    if (show) setOpen(true);
  }, []);

  const buyNow = useCallback(
    (id: string, qty = 1) => {
      updateLines((prev) =>
        prev.some((l) => l.id === id)
          ? prev.map((l) => (l.id === id ? { ...l, qty } : l))
          : [...prev, { id, qty }],
      );
      setLastCleared(null);
      // The store is synchronous, so its snapshot already holds the new
      // line (the `lines` of this render do not yet).
      const found = checkStock(resolveLines(getSnapshot()), priceMode);
      setOpen(false);
      if (found.length === 0) return true;
      setIssuesFrom("buyNow");
      setIssues(found);
      return false;
    },
    [priceMode],
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

  const clear = useCallback(() => {
    const before = getSnapshot();
    if (before.length > 0) setLastCleared(before);
    updateLines(() => []);
  }, []);

  const restoreCleared = useCallback(() => {
    if (!lastCleared) return;
    const back = lastCleared;
    updateLines((prev) => [...back, ...prev.filter((l) => !back.some((b) => b.id === l.id))]);
    setLastCleared(null);
  }, [lastCleared]);

  const restoreLine = useCallback((line: CartLine, index: number) => {
    updateLines((prev) =>
      prev.some((l) => l.id === line.id)
        ? prev
        : [...prev.slice(0, index), line, ...prev.slice(index)],
    );
  }, []);

  const checkout = useCallback(
    (from: "cart" | "checkout" = "cart") => {
      const found = checkStock(resolveLines(lines), priceMode);
      setOpen(false);
      if (found.length === 0) return true;
      setIssuesFrom(from);
      setIssues(found);
      return false;
    },
    [lines, priceMode],
  );

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
      lastCleared,
      restoreCleared,
      restoreLine,
      checkout,
      buyNow,
      issues,
      issuesFrom,
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
      lastCleared,
      restoreCleared,
      restoreLine,
      checkout,
      buyNow,
      issues,
      issuesFrom,
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
