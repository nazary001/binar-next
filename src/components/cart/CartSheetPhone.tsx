"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  PRODUCT_LINE_TOTAL,
  ProductLine,
  ProductLineRemove,
  type ProductLineStatus,
} from "@/components/ui/ProductLine";
import { SHEET_BAR, SHEET_SCROLLER, SHEET_TITLE } from "@/components/ui/Sheet";
import { STICKY_BAR_DARK, SUMMARY_AMOUNT, SUMMARY_LABEL } from "@/components/ui/StickyBar";
import { QtyStepper } from "@/components/catalog/QtyStepper";
import { CartIcon, XMarkIcon } from "@/components/catalog/icons";
import { formatPrice, productHref, type Product } from "@/components/catalog/data";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { useShopConfig } from "@/lib/session/config";
import { useCart } from "./CartProvider";
import {
  METER_MOTION,
  itemsPhrase,
  lineMeta,
  lineTotal,
  type CartEntry,
  type CartLine,
} from "./data";
import { CheckCircleIcon } from "./icons";
import { LeavingRow, useLeavingRows } from "./LeavingRow";

const COPY = {
  title: "Кошик",
  clear: "Очистити",
  undo: "Повернути",
  remove: (title: string) => `Видалити «${title}» з кошика`,
  outOfStock: "Немає в наявності",
  preorder: "Під замовлення",
  fx: "Ціна залежить від курсу",
  sum: "Сума замовлення",
  remaining: "До безкоштовної доставки залишилось:",
  free: "Безкоштовна доставка",
  meter: "Прогрес до безкоштовної доставки",
  checkout: "Оформити замовлення",
  emptyTitle: "Кошик порожній",
  clearedTitle: "Кошик очищено",
  emptyText: "Додайте товари до кошика, щоб оформити замовлення.",
  restoreAll: "Повернути товари",
  browse: "Переглянути каталог",
} as const;

// How long the "Повернути" undo of a trash tap stays in the head row.
const UNDO_MS = 8000;
// Focus targets after a removal / restore besides a line id (product ids
// never contain a colon).
const FOCUS_CLOSE = ":close";
const FOCUS_FIRST = ":first";

// Phone cart sheet (cart spec 2.1-2.3, template T5b): the content twin of
// the desktop drawer below 640. The drawer's layer, aside and its ONE close
// button (floating over the bar's right 72 px) are shared with desktop;
// this subtree is lg:hidden. Bar 66 (Title Large "Кошик") = SheetBar
// geometry; ONE scroller (pt-3, so the 44-px head row centres its text 24
// under the bar) holds the head row (count + "Очистити"), the ProductLine
// rows between 1-px #d2d2d2 lines and the dark summary, sticky at the
// bottom (mt-auto when the list is short, static below 500 px of height).
// Empty = the EmptyState atom ("Кошик очищено" + "Повернути товари" right
// after a clear).
export function CartSheetPhone({
  titleRef,
  onFocusClose,
}: {
  titleRef: Ref<HTMLHeadingElement>;
  // Focuses the drawer's close button (the last line went away).
  onFocusClose: () => void;
}) {
  const {
    open,
    entries,
    count,
    subtotal,
    priceMode,
    setQty,
    remove,
    clear,
    lastCleared,
    restoreCleared,
    restoreLine,
    checkout,
    closeCart,
  } = useCart();
  const router = useRouter();
  // Removed lines stay while they slide out (LeavingRow); the empty state
  // waits for the last one.
  const { rows, done } = useLeavingRows(entries, (e) => e.line.id);
  const empty = rows.length === 0;
  const b2b = priceMode === "partner";

  // The last trash tap, undoable for UNDO_MS from the head row (the
  // "Очистити" slot). Dropped when the sheet closes.
  const [removed, setRemoved] = useState<{ line: CartLine; index: number } | null>(null);
  if (!open && removed) setRemoved(null);
  useEffect(() => {
    if (!removed) return;
    const t = window.setTimeout(() => setRemoved(null), UNDO_MS);
    return () => window.clearTimeout(t);
  }, [removed]);

  // Focus hand-off after a removal / restore: the trash of the line that
  // took the removed one's place (else the previous line's), the restored
  // line's trash, or the drawer's close button when nothing is left. Runs
  // after the commit that changed the list.
  const trashRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    pendingFocus.current = null;
    if (target === FOCUS_CLOSE) {
      onFocusClose();
      return;
    }
    const id = target === FOCUS_FIRST ? entries[0]?.line.id : target;
    const el = id ? trashRefs.current.get(id) : undefined;
    if (el) el.focus();
    else onFocusClose();
  });

  // Focus not obscured: the sticky summary covers the bottom of the
  // scroller, so the scroller's scroll padding follows its height.
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const scroller = scrollerRef.current;
    const summary = summaryRef.current;
    if (!scroller || !summary) return;
    const ro = new ResizeObserver(() => {
      scroller.style.scrollPaddingBottom = `${summary.offsetHeight + 16}px`;
    });
    ro.observe(summary);
    return () => {
      ro.disconnect();
      scroller.style.scrollPaddingBottom = "";
    };
  }, [empty]);

  const onRemove = (index: number) => {
    const entry = entries[index];
    const next = entries[index + 1] ?? entries[index - 1];
    pendingFocus.current = next ? next.line.id : FOCUS_CLOSE;
    setRemoved(next ? { line: entry.line, index } : null);
    remove(entry.line.id);
  };
  const onUndo = () => {
    if (!removed) return;
    pendingFocus.current = removed.line.id;
    restoreLine(removed.line, removed.index);
    setRemoved(null);
  };
  const onClear = () => {
    pendingFocus.current = FOCUS_CLOSE;
    setRemoved(null);
    clear();
  };
  const onRestoreAll = () => {
    pendingFocus.current = FOCUS_FIRST;
    restoreCleared();
  };

  // The shop's free-delivery limit (5 000 until the session answer brings
  // the panel's value; the drawer asks for it when the cart opens).
  const { freeDeliveryLimit } = useShopConfig();
  const reached = subtotal >= freeDeliveryLimit;
  const remaining = Math.max(0, Math.round((freeDeliveryLimit - subtotal) * 100) / 100);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:hidden">
      <div className={SHEET_BAR}>
        <h2 ref={titleRef} tabIndex={-1} className={SHEET_TITLE}>
          {COPY.title}
        </h2>
        {/* The drawer's close button floats here (same 48 box). */}
        <span aria-hidden className="size-12 shrink-0" />
      </div>

      {empty ? (
        <div className={`scrollbar-hidden ${SHEET_SCROLLER}`}>
          <EmptyState
            icon={<CartIcon className="size-6" />}
            titleAs="p"
            title={lastCleared ? COPY.clearedTitle : COPY.emptyTitle}
            text={COPY.emptyText}
            action={
              <>
                {lastCleared && (
                  <Button size="small" variant="outlinedDark" onClick={onRestoreAll}>
                    {COPY.restoreAll}
                  </Button>
                )}
                <Button href="/catalog" size="small" arrow onClick={closeCart}>
                  {COPY.browse}
                </Button>
              </>
            }
          />
        </div>
      ) : (
        <div ref={scrollerRef} className={`scrollbar-hidden ${SHEET_SCROLLER} pt-3`}>
          <div className="flex h-11 shrink-0 items-center justify-between gap-4 px-6">
            {/* The count rolls with the steppers, the noun cross-fades
                («товари» -> «товарів»; ui/RollingNumber.tsx). */}
            <p className="whitespace-nowrap text-body-sm text-neutral-500">
              <RollingNumber value={count} format={itemsPhrase} />
            </p>
            {/* One element for both labels, so focus survives the swap
                when the undo times out. */}
            <button
              type="button"
              onClick={removed ? onUndo : onClear}
              className="-mr-2 flex h-11 shrink-0 cursor-pointer items-center gap-0.5 rounded-full px-2 text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand active:text-brand motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {removed ? (
                COPY.undo
              ) : (
                <>
                  {COPY.clear}
                  <XMarkIcon className="size-4 shrink-0" />
                </>
              )}
            </button>
          </div>

          <ul role="list" aria-label={COPY.title} className="flex shrink-0 flex-col px-6 pb-6">
            {rows.map((row) => {
              const entry = row.item;
              return (
                <LeavingRow
                  as="li"
                  key={row.key}
                  className="border-t border-stroke-subtle last:border-b"
                  leaving={row.leaving}
                  entering={row.entering}
                  delay={row.delay}
                  onDone={() => done(row.key)}
                >
                  <CartLinePhone
                    entry={entry}
                    b2b={b2b}
                    onQty={(next) => setQty(entry.line.id, next)}
                    onRemove={() => onRemove(entries.findIndex((e) => e.line.id === entry.line.id))}
                    onNavigate={closeCart}
                    trashRef={(el) => {
                      if (el) trashRefs.current.set(entry.line.id, el);
                      else trashRefs.current.delete(entry.line.id);
                    }}
                    total={lineTotal(entry, priceMode)}
                  />
                </LeavingRow>
              );
            })}
          </ul>

          <div
            ref={summaryRef}
            className={`${STICKY_BAR_DARK} sticky bottom-0 mt-auto flex shrink-0 flex-col gap-4 [@media(max-height:499px)]:static`}
          >
            <div className="flex flex-col gap-2">
              <span className={SUMMARY_LABEL}>{COPY.sum}</span>
              <RollingNumber value={subtotal} format={formatPrice} className={SUMMARY_AMOUNT} />
            </div>
            {reached ? (
              <p className="flex items-center gap-2 text-body-sm font-medium text-white">
                {COPY.free}
                <CheckCircleIcon className="size-5 shrink-0 text-positive" />
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-body-sm text-white/60">
                  {COPY.remaining}{" "}
                  <RollingNumber
                    value={remaining}
                    format={formatPrice}
                    className="whitespace-nowrap font-medium text-white"
                  />
                </p>
                <PhoneMeter subtotal={subtotal} limit={freeDeliveryLimit} />
              </div>
            )}
            {/* Plain block parent: a fullWidth Button is flex-1. */}
            <div>
              <Button
                variant="accent"
                size="small"
                fullWidth
                onClick={() => {
                  if (checkout()) router.push("/checkout");
                }}
              >
                {COPY.checkout}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// The availability eyebrow renders only for exception states (A-10):
// retail "Немає в наявності", partner "Під замовлення" (the
// B2BStatusLine rule: preorder or unavailable).
function lineStatus(product: Product, b2b: boolean): ProductLineStatus | undefined {
  if (b2b) {
    return product.preorder || !product.available
      ? { label: COPY.preorder, tone: "negative" }
      : undefined;
  }
  return product.available ? undefined : { label: COPY.outOfStock, tone: "negative" };
}

// One cart line (TR-08, A8): photo + name + meta as ONE link to the PDP
// (closes the sheet), the 44 trash top-right, the stepper and the line
// total 22/28 underneath. Retail out-of-stock lines are grey with a
// disabled stepper (desktop rule); partner lines take a typed quantity
// (A-10) and an fx caption.
function CartLinePhone({
  entry,
  b2b,
  total,
  onQty,
  onRemove,
  onNavigate,
  trashRef,
}: {
  entry: CartEntry;
  b2b: boolean;
  total: number;
  onQty: (next: number) => void;
  onRemove: () => void;
  onNavigate: () => void;
  trashRef: Ref<HTMLButtonElement>;
}) {
  const { product, line } = entry;
  const out = !b2b && !product.available;
  const grey = b2b ? Boolean(product.preorder) || !product.available : out;
  return (
    <ProductLine
      as="div"
      padded
      image={product.image}
      title={product.title}
      href={productHref(product)}
      onNavigate={onNavigate}
      status={lineStatus(product, b2b)}
      meta={lineMeta(product)}
      note={b2b && product.fxPrice ? COPY.fx : undefined}
      grey={grey}
      trailing={
        <ProductLineRemove label={COPY.remove(product.title)} onClick={onRemove} buttonRef={trashRef} />
      }
      bottom={
        <>
          <QtyStepper
            size="sm"
            slot="fixed"
            qty={line.qty}
            onQty={onQty}
            disabled={out}
            editable={b2b}
          />
          <RollingNumber value={total} format={formatPrice} className={PRODUCT_LINE_TOTAL} />
        </>
      }
    />
  );
}

// Free-delivery meter, phone: the desktop track (8 px #616162, brand fill,
// 16-px white-ring knob 4 px inside the fill end) without the sum chip,
// the "0" / "5 000" labels and the truck tile.
// A limit of 0 means free delivery from the first hryvnia: the bar is full.
function PhoneMeter({ subtotal, limit }: { subtotal: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (subtotal / limit) * 100) : 100;
  return (
    <div
      role="progressbar"
      aria-label={COPY.meter}
      aria-valuemin={0}
      aria-valuemax={limit}
      aria-valuenow={Math.min(subtotal, limit)}
      className="relative h-2 rounded-full bg-neutral-600"
    >
      <div className={`h-full rounded-full bg-brand ${METER_MOTION}`} style={{ width: `${pct}%` }} />
      <span
        aria-hidden
        className={`absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white ${METER_MOTION}`}
        style={{ left: `clamp(8px, calc(${pct}% - 4px), calc(100% - 8px))` }}
      />
    </div>
  );
}
