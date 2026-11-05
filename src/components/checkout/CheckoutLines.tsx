"use client";

import { useRef } from "react";
import { QtyStepper } from "@/components/catalog/QtyStepper";
import { formatPrice, productHref, productsPlural } from "@/components/catalog/data";
import { useCart } from "@/components/cart/CartProvider";
import { lineTotal, type CartEntry } from "@/components/cart/data";
import {
  PRODUCT_LINE_LIST,
  PRODUCT_LINE_TOTAL,
  ProductLine,
  ProductLineRemove,
  type ProductLineStatus,
} from "@/components/ui/ProductLine";

const COPY = {
  title: "Кошик",
  subtotal: "Сума замовлення",
  perUnit: "за од.",
  partner: "(ваша ціна)",
  soldOut: "Немає в наявності",
  preorder: "Під замовлення",
  remove: (title: string) => `Видалити «${title}» із замовлення`,
} as const;

// The "Кошик" h2 is the focus target when the stock sheet opened by the
// checkout gate closes (cart spec S23 / checkout S15; StockSheetPhone finds
// it by `data-checkout-lines-title`, CheckoutClient by the id).
export const CHECKOUT_LINES_TITLE_ID = "checkout-lines-title";

// Phone order lines of /checkout (checkout spec 2.3, system spec A8 / A-10 /
// A-11): the "Кошик" head (Title Large + the unit count of the header
// badge), the ProductLine rows the cart sheet shows one tap away, framed
// top and bottom by 1-px #d2d2d2 lines on the white page (no panel), and
// the subtotal key / value row under them. The status eyebrow marks only
// the exception lines (a retail line that sold out, a partner line that is
// "Під замовлення"). Rendered below 640 only (the desktop table is the
// sibling in CheckoutItems).
export function CheckoutLines({
  entries,
  onEmptied,
  className = "",
}: {
  entries: CartEntry[];
  onEmptied?: () => void;
  className?: string;
}) {
  const { setQty, remove, priceMode, unitPrice, count, subtotal } = useCart();
  const partner = priceMode === "partner";
  // Remove buttons by line id: after a removal the focus moves to the next
  // line's trash (or the previous one), never to <body>.
  const removeRefs = useRef(new Map<string, HTMLButtonElement>());

  const onRemove = (index: number) => {
    const id = entries[index].product.id;
    const neighbour = entries[index + 1] ?? entries[index - 1];
    remove(id);
    if (neighbour) removeRefs.current.get(neighbour.product.id)?.focus({ preventScroll: true });
    else onEmptied?.();
  };

  return (
    <section aria-labelledby={CHECKOUT_LINES_TITLE_ID} className={className}>
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id={CHECKOUT_LINES_TITLE_ID}
          data-checkout-lines-title
          tabIndex={-1}
          className="text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900 outline-none"
        >
          {COPY.title}
        </h2>
        <span className="whitespace-nowrap text-[14px] leading-5 text-neutral-500">
          {count} {productsPlural(count)}
        </span>
      </div>

      <ul role="list" className={`${PRODUCT_LINE_LIST} mt-6 border-y border-stroke-subtle`}>
        {entries.map((entry, i) => {
          const { product, line } = entry;
          // A retail line that sold out keeps its quantity frozen; a
          // partner's unavailable line is "Під замовлення" and stays
          // editable (the desktop table / drawer rule).
          const locked = !partner && !product.available;
          const status: ProductLineStatus | undefined = product.available
            ? undefined
            : { label: partner ? COPY.preorder : COPY.soldOut, tone: "negative" };
          const unit = formatPrice(unitPrice(product));
          const promo = !partner && product.oldPrice !== undefined;
          return (
            <ProductLine
              key={line.id}
              image={product.image}
              title={product.title}
              href={productHref(product)}
              status={status}
              grey={!product.available}
              meta={`${product.volume}, ${product.brand}`}
              // Nowrap pieces in a wrapping row: the unit price never
              // splits; the old price / the partner caption move down whole.
              price={
                promo ? (
                  <span className="flex flex-wrap gap-x-2">
                    <span className="whitespace-nowrap text-brand">
                      {unit} {COPY.perUnit}
                    </span>
                    <s className="whitespace-nowrap">{formatPrice(product.oldPrice ?? 0)}</s>
                  </span>
                ) : (
                  <span className="flex flex-wrap gap-x-1">
                    <span className="whitespace-nowrap">
                      {unit} {COPY.perUnit}
                    </span>
                    {partner && <span className="whitespace-nowrap">{COPY.partner}</span>}
                  </span>
                )
              }
              trailing={
                <ProductLineRemove
                  label={COPY.remove(product.title)}
                  onClick={() => onRemove(i)}
                  buttonRef={(el) => {
                    if (el) removeRefs.current.set(product.id, el);
                    else removeRefs.current.delete(product.id);
                  }}
                />
              }
              bottom={
                <>
                  <QtyStepper
                    qty={line.qty}
                    onQty={(next) => setQty(product.id, next)}
                    disabled={locked}
                    size="sm"
                    slot="fixed"
                    editable={partner}
                  />
                  <span className={PRODUCT_LINE_TOTAL}>{formatPrice(lineTotal(entry, priceMode))}</span>
                </>
              }
            />
          );
        })}
      </ul>

      <div className="flex flex-col gap-2 pt-6">
        <span className="text-[14px] font-medium leading-5 text-neutral-500">{COPY.subtotal}</span>
        <span className="whitespace-nowrap text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900">
          {formatPrice(subtotal)}
        </span>
      </div>
    </section>
  );
}
