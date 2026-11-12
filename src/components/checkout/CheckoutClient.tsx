"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { DESKTOP_QUERY } from "@/components/ui/useMediaQuery";
import { currentAccount, getSnapshot as getAuthSnapshot } from "@/components/auth/store";
import { useCart } from "@/components/cart/CartProvider";
import { cartSubtotal, resolveLines } from "@/components/cart/data";
import { CheckCircleIcon } from "@/components/cart/icons";
import { CartIcon } from "@/components/catalog/icons";
import { formatPrice, type Product } from "@/components/catalog/data";
import { usePartnerPrices } from "@/components/catalog/CatalogRegistry";
import { allProducts, listingProducts, primeProducts } from "@/components/catalog/registry";
import { useHydrated } from "@/components/platform/ui/useHydrated";
import { api } from "@/lib/api/client";
import { refreshSession } from "@/lib/session/bootstrap";
import { CheckoutForm } from "./CheckoutForm";
import { CheckoutItems } from "./CheckoutItems";
import { CHECKOUT_LINES_TITLE_ID } from "./CheckoutLines";
import type { CheckoutValues } from "./data";
import { useCheckoutDraft } from "./useCheckoutDraft";

// Phone-only strings (the desktop copy stays inline below).
const COPY = {
  emptyTitle: "Кошик порожній",
  emptyText: "Додайте товари з каталогу, щоб оформити замовлення.",
  emptyAction: "Перейти в каталог",
  doneLead: "Дякуємо! Замовлення",
  doneTail: "прийнято",
  doneText: (email: string) =>
    `Підтвердження надіслано на ${email}. Менеджер зв'яжеться з вами найближчим часом, щоб узгодити деталі оплати та доставки.`,
  doneAction: "Продовжити покупки",
} as const;

// Figma «Оформити замовлення» (4329:40697): the 843-px order table and
// the 627-px form panel 80 px apart (843fr / 627fr of the fluid content
// width), 104 px under the H1 block, 148 px above the footer.
//
// Phones (checkout spec 2.3, 2.9, 2.11, 2.12): the lines (CheckoutLines)
// 48 above the form card; the empty and success states are the A14 ring
// panels (lg:hidden twins next to the untouched desktop panels); after an
// order the visible title takes the focus and the page scrolls so the
// whole panel (incl. its button) shows when it fits.
export function CheckoutClient() {
  const cart = useCart();
  const { clear, checkout, issues } = cart;
  const prices = usePartnerPrices();
  // Bumped when a stock or price refusal of POST /api/orders corrected the
  // browser's catalog (adoptServerStock): from then on the lines are
  // resolved again here, because the cart's own entries follow only a
  // change of its lines. Until then the cart's values are used as they are.
  const [catalogFixes, setCatalogFixes] = useState(0);
  const entries = useMemo(
    () => (catalogFixes === 0 ? cart.entries : resolveLines(cart.lines)),
    [catalogFixes, cart.entries, cart.lines],
  );
  const subtotal = useMemo(
    () => (catalogFixes === 0 ? cart.subtotal : cartSubtotal(entries, cart.priceMode, prices)),
    [catalogFixes, cart.subtotal, entries, cart.priceMode, prices],
  );
  const draft = useCheckoutDraft();
  // The cart lives in localStorage, so the server (and the hydrating
  // first client render) sees an empty cart: «Кошик порожній» may only
  // show once the stored lines are known, never as a flash before the
  // table + form of a filled cart.
  const hydrated = useHydrated();
  const [placed, setPlaced] = useState<{ number: string; email: string } | null>(null);
  const doneRef = useRef<HTMLHeadingElement | null>(null);
  const donePhoneRef = useRef<HTMLElement | null>(null);
  const emptyPhoneRef = useRef<HTMLElement | null>(null);
  // Set when the last phone line was removed: the empty title takes the
  // focus once it mounts.
  const emptiedRef = useRef(false);
  // The stock gate runs once per visit, then again on every submit.
  const gateRanRef = useRef(false);
  const gateOpenRef = useRef(false);
  const prevIssuesRef = useRef(issues);
  // An order request is on its way: a second press of the submit button
  // must not place the order twice.
  const placingRef = useRef(false);

  // The form (and the focused submit button) unmounts on success: move
  // focus to the confirmation heading so keyboard and screen-reader
  // users land on the result. Phones: focus without a jump, then show
  // the whole panel (scroll to the top when crumb + H1 + panel fit,
  // else the panel top 24 under the 66-px header).
  useEffect(() => {
    if (!placed) return;
    if (window.matchMedia(DESKTOP_QUERY).matches) {
      doneRef.current?.focus();
      return;
    }
    const title = donePhoneRef.current;
    const panel = title?.closest<HTMLElement>('[role="status"]');
    if (!title || !panel) return;
    title.focus({ preventScroll: true });
    const top = panel.getBoundingClientRect().top + window.scrollY;
    const fits = top + panel.offsetHeight <= window.innerHeight - 24;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: fits ? 0 : Math.max(0, top - 66 - 24), behavior: reduced ? "auto" : "smooth" });
  }, [placed]);

  // Stock gate on arrival (checkout spec 2.13 / S15): a stale cart opened
  // straight on /checkout (sold-out / promo lines) gets the stock check
  // before anything is ordered. "checkout" tells the cart that closing the
  // stock sheet only dismisses it (the "Кошик" h2 of the phone lines takes
  // the focus) instead of opening the cart sheet over the form.
  useEffect(() => {
    if (!hydrated || gateRanRef.current || entries.length === 0) return;
    gateRanRef.current = true;
    if (!checkout("checkout")) gateOpenRef.current = true;
  }, [hydrated, entries.length, checkout]);

  // The gate's stock sheet closed (issues -> null): the "Кошик" h2 of the
  // phone lines takes the focus without moving the page (it is hidden on
  // desktop, where the dialog's own focus return stays as it was).
  useEffect(() => {
    const was = prevIssuesRef.current;
    prevIssuesRef.current = issues;
    if (!was || issues || !gateOpenRef.current) return;
    gateOpenRef.current = false;
    requestAnimationFrame(() => {
      const h = document.getElementById(CHECKOUT_LINES_TITLE_ID);
      if (h && h.getClientRects().length > 0) h.focus({ preventScroll: true });
    });
  }, [issues]);

  // Last phone line removed: focus the empty-state title.
  useEffect(() => {
    if (entries.length > 0 || !emptiedRef.current) return;
    emptiedRef.current = false;
    const t = emptyPhoneRef.current;
    if (t && t.getClientRects().length > 0) {
      t.focus({ preventScroll: true });
      t.scrollIntoView({ block: "nearest" });
    }
  }, [entries.length]);

  const place = (values: CheckoutValues) => {
    if (placingRef.current) return;
    if (!checkout("checkout")) {
      gateOpenRef.current = true;
      return;
    }
    // POST /api/orders: the server validates the form again, re-checks the
    // stock, prices the lines itself and answers the order number; the sum
    // the form shows travels along for comparison only. The form stays as
    // it is until then (no new UI). A stock or price refusal carries the
    // products as the database has them: the browser's catalog (which may
    // be a cache period old) takes them over, the lines here resolve again
    // (catalogFixes) and the stock check runs again - a line the server
    // sold out opens the stock flow the same way the gate above does, a
    // changed price shows as the new sum of the lines and the form, which
    // the next press sends.
    placingRef.current = true;
    const lines = entries.map((e) => ({ id: e.line.id, qty: e.line.qty }));
    void (async () => {
      const result = await api<{ ok: true; number: string }>("/api/orders", { body: { values, lines, subtotal } });
      placingRef.current = false;
      if (!result.ok) {
        if (result.status !== 409 || (result.error !== "stock" && result.error !== "price")) return;
        adoptServerStock(result.data, result.error === "stock");
        // A partner's own prices (and who the server sees signed in) come
        // with the session.
        if (result.error === "price" && currentAccount(getAuthSnapshot())) await refreshSession();
        setCatalogFixes((n) => n + 1);
        if (!checkout("checkout")) gateOpenRef.current = true;
        return;
      }
      setPlaced({ number: result.data.number, email: values.email.trim() });
      // The cart's own "Очистити" (the server emptied the stored copy): the
      // phone cart sheet then reads "Кошик очищено" and offers the lines
      // back until the route changes, as it always did after an order.
      clear();
      draft.clear();
      // A partner's order is listed in the cabinet: the next session answer
      // carries it.
      if (currentAccount(getAuthSnapshot())?.type === "b2b") void refreshSession();
      if (window.matchMedia(DESKTOP_QUERY).matches) window.scrollTo({ top: 0, behavior: "smooth" });
    })();
  };

  if (placed) {
    return (
      <>
        <div
          role="status"
          className="flex w-full max-w-[627px] flex-col overflow-clip rounded-3xl max-lg:hidden"
        >
          <div className="flex flex-col gap-6 bg-bg-subtle p-6 sm:p-8">
            <h2
              ref={doneRef}
              tabIndex={-1}
              className="text-[24px] font-bold leading-7 tracking-[-0.48px] text-neutral-900 outline-none"
            >
              Дякуємо! Замовлення {placed.number} прийнято
            </h2>
            <p className="text-body-sm text-neutral-800">
              Підтвердження надіслано на {placed.email}. Менеджер зв&apos;яжеться з вами
              найближчим часом, щоб узгодити деталі оплати та доставки.
            </p>
          </div>
          <div className="flex flex-col gap-4 bg-neutral-900 p-6 sm:p-8">
            <Button href="/catalog" variant="accent" fullWidth>
              Продовжити покупки
            </Button>
          </div>
        </div>
        <EmptyState
          className="lg:hidden"
          surface="ring"
          role="status"
          icon={<CheckCircleIcon className="size-6 text-brand" />}
          titleRef={donePhoneRef}
          title={
            <>
              {COPY.doneLead} <span className="whitespace-nowrap">{placed.number}</span> {COPY.doneTail}
            </>
          }
          text={COPY.doneText(placed.email)}
          action={
            <Button href="/catalog" size="small" arrow>
              {COPY.doneAction}
            </Button>
          }
        />
      </>
    );
  }

  if (!hydrated) {
    // Neutral stand-in that keeps the footer from jumping up under the
    // H1 for the few hundred ms before the cart is read.
    return <div aria-hidden className="min-h-[60vh] max-lg:min-h-[60dvh]" />;
  }

  if (entries.length === 0) {
    return (
      <>
        <div className="flex w-full max-w-[627px] flex-col items-start gap-6 rounded-3xl bg-bg-subtle p-6 sm:p-8 max-lg:hidden">
          <h2 className="text-[24px] font-bold leading-7 tracking-[-0.48px] text-neutral-900">
            Кошик порожній
          </h2>
          <p className="text-body-sm text-neutral-800">
            Додайте товари з каталогу, щоб оформити замовлення.
          </p>
          <Button href="/catalog" arrow size="responsive">
            Перейти в каталог
          </Button>
        </div>
        <EmptyState
          className="lg:hidden"
          surface="ring"
          icon={<CartIcon className="size-6" />}
          titleRef={emptyPhoneRef}
          title={COPY.emptyTitle}
          text={COPY.emptyText}
          action={
            <Button href="/catalog" size="small" arrow>
              {COPY.emptyAction}
            </Button>
          }
        />
      </>
    );
  }

  // minmax(0, …) tracks: a track's automatic minimum would otherwise grow
  // to the widest unbreakable product name and push the page past the
  // phone viewport.
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,843fr)_minmax(0,627fr)] lg:items-start lg:gap-20">
      <CheckoutItems
        entries={entries}
        onEmptied={() => {
          emptiedRef.current = true;
        }}
      />
      <CheckoutForm subtotal={subtotal} onSubmit={place} />
      <p className="sr-only" aria-live="polite">
        Сума замовлення {formatPrice(subtotal)}
      </p>
    </div>
  );
}

// The products of a stock or price refusal of POST /api/orders, as the
// database has them now ({ id, price, oldPrice?, available, preorder? }):
// the browser's product registry takes their stock and price fields over,
// so the cart's stock check and sums agree with the server. `soldOut` =
// the server's stock rule refused `ids`: those stay flagged for the stock
// check even when the answer carries no product fields.
function adoptServerStock(data: Record<string, unknown>, soldOut: boolean) {
  const fresh = new Map<string, Pick<Product, "price" | "oldPrice" | "available" | "preorder">>();
  for (const raw of Array.isArray(data.products) ? data.products : []) {
    const p = raw as Record<string, unknown> | null;
    if (!p || typeof p.id !== "string" || typeof p.price !== "number" || !Number.isFinite(p.price)) continue;
    if (typeof p.available !== "boolean") continue;
    fresh.set(p.id, {
      price: p.price,
      oldPrice: typeof p.oldPrice === "number" && Number.isFinite(p.oldPrice) ? p.oldPrice : undefined,
      available: p.available,
      preorder: p.preorder === true ? true : undefined,
    });
  }
  const refused = new Set(
    soldOut && Array.isArray(data.ids) ? data.ids.filter((id): id is string => typeof id === "string") : [],
  );
  if (fresh.size === 0 && refused.size === 0) return;

  const patch = (product: Product): Product => {
    const now = fresh.get(product.id);
    let next = product;
    if (now) {
      const copy: Product = { ...product, price: now.price, available: now.available };
      if (now.oldPrice !== undefined) copy.oldPrice = now.oldPrice;
      else delete copy.oldPrice;
      if (now.preorder) copy.preorder = true;
      else delete copy.preorder;
      next = copy;
    }
    // The stock rule (cart/data.ts checkStock) flags an unavailable or a
    // promo line.
    if (refused.has(product.id) && next.available && next.oldPrice === undefined) next = { ...next, available: false };
    return next;
  };
  const listing = listingProducts();
  const extras = allProducts().slice(listing.length);
  primeProducts(listing.map(patch), extras.map(patch));
}
