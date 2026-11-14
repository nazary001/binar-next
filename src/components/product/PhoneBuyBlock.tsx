"use client";

import { useId, type MouseEvent, type Ref } from "react";
import { Button } from "@/components/ui/Button";
import { QtyStepper } from "@/components/catalog/QtyStepper";
import type { Product } from "@/components/catalog/data";
import { PhoneAvailability, PhonePrice } from "./phoneParts";

const COPY = {
  qty: "Кількість",
  buyNow: "Купити зараз",
  add: "Додати у кошик",
  similar: "Схожі товари",
} as const;

// Full-width column pills (the menu CTA recipe, Header.tsx): Button/Small
// 42 stretched to the content width, the label centred in the pill.
const PILL = "w-full [&>span]:flex-1";

// The phone buy block of the product page (pdp spec 2.5, TR-04 / TR-15 /
// D8): availability, the price group, the «Кількість» row (label left,
// stepper right) and the CTA stack - «Купити зараз» (outlined, first) and
// «Додати у кошик» (solid, last), full width 8 apart. Out of stock (B2C) /
// «Під замовлення» (B2B): no qty row, one full-width «Схожі товари» that
// jumps to the in-stock alternatives. The desktop status / price row is
// max-lg:hidden beside it; both read the same qty state of ProductView.
// `ctaRef` marks the CTA stack for the sticky buy bar's observer.
export function PhoneBuyBlock({
  product,
  mode,
  out,
  qty,
  onQty,
  onBuyNow,
  onAdd,
  ctaRef,
}: {
  product: Product;
  mode: "b2c" | "b2b";
  out: boolean;
  qty: number;
  onQty: (next: number) => void;
  onBuyNow: () => void;
  // Receives the click: the flight to the header cart starts on the button.
  onAdd: (e: MouseEvent<HTMLElement>) => void;
  ctaRef: Ref<HTMLDivElement>;
}) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-6 lg:hidden">
      <PhoneAvailability product={product} mode={mode} out={out} />
      <PhonePrice product={product} mode={mode} />
      {!out && (
        <div className="flex items-center justify-between gap-4">
          <span id={labelId} className="text-[14px] font-medium leading-5 text-neutral-500">
            {COPY.qty}
          </span>
          {/* Typed quantity in the partner context only (A-10). */}
          <QtyStepper qty={qty} onQty={onQty} labelledBy={labelId} editable={mode === "b2b"} />
        </div>
      )}
      <div ref={ctaRef} className="flex flex-col gap-2">
        {out ? (
          <Button href="#similar" size="small" className={PILL}>
            {COPY.similar}
          </Button>
        ) : (
          <>
            <Button variant="outlinedDark" size="small" className={PILL} onClick={onBuyNow}>
              {COPY.buyNow}
            </Button>
            <Button size="small" className={PILL} onClick={onAdd}>
              {COPY.add}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
