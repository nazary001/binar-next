"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/components/cart/CartProvider";
import { formatPrice } from "@/components/catalog/data";
import { CheckoutForm } from "./CheckoutForm";
import { CheckoutItems } from "./CheckoutItems";
import type { CheckoutValues } from "./data";

// Figma «Оформити замовлення» (4329:40697): the 843-px order table and
// the 627-px form panel 80 px apart (843fr / 627fr of the fluid content
// width), 104 px under the H1 block, 148 px above the footer.
export function CheckoutClient() {
  const { entries, subtotal, clear } = useCart();
  const [placed, setPlaced] = useState<{ number: string; email: string } | null>(null);
  const doneRef = useRef<HTMLHeadingElement | null>(null);

  // The form (and the focused submit button) unmounts on success: move
  // focus to the confirmation heading so keyboard and screen-reader
  // users land on the result.
  useEffect(() => {
    if (placed) doneRef.current?.focus();
  }, [placed]);

  const place = (values: CheckoutValues) => {
    // No order API yet: the order is acknowledged locally and the cart
    // is emptied, so the flow reads end to end.
    const number = `BN-${String(Date.now()).slice(-6)}`;
    setPlaced({ number, email: values.email.trim() });
    clear();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (placed) {
    return (
      <div
        role="status"
        className="flex w-full max-w-[627px] flex-col overflow-clip rounded-3xl"
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
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex w-full max-w-[627px] flex-col items-start gap-6 rounded-3xl bg-bg-subtle p-6 sm:p-8">
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
    );
  }

  // minmax(0, …) tracks: a track's automatic minimum would otherwise grow
  // to the widest unbreakable product name and push the page past the
  // phone viewport.
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,843fr)_minmax(0,627fr)] lg:items-start lg:gap-20">
      <CheckoutItems entries={entries} />
      <CheckoutForm subtotal={subtotal} onSubmit={place} />
      <p className="sr-only" aria-live="polite">
        Сума замовлення {formatPrice(subtotal)}
      </p>
    </div>
  );
}
