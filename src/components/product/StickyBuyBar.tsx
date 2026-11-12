"use client";

import { useEffect, useState, type RefObject } from "react";
import { Button } from "@/components/ui/Button";
import { StickyBar } from "@/components/ui/StickyBar";
import { b2bPrices, discountPercent, formatPrice, type Product } from "@/components/catalog/data";
import { usePartnerPrices } from "@/components/catalog/CatalogRegistry";

const COPY = {
  region: "Купівля товару",
  qty: "Кількість:",
  add: "Додати у кошик",
  addShort: "У кошик",
} as const;

// The phone buy bar of the product page (pdp spec 2.6, TR-18, A13 light /
// fixed): price (Title Large; brand on a promo) over «Кількість: N», and a
// Button/Small filling the rest. It shows only while the in-flow CTA stack
// is off screen and hides 100 px before the page end (the series CTA and
// the footer are never covered), so the page needs no bottom reservation.
// Visibility comes from two IntersectionObservers, never from per-frame
// scroll positioning (touch scrolling stays on the compositor). Below
// 500 px of height StickyBar hides it (the in-flow CTA exists). Rendered
// only for in-stock products; lg:hidden through STICKY_BAR_LIGHT.
export function StickyBuyBar({
  product,
  mode,
  qty,
  onAdd,
  ctaRef,
}: {
  product: Product;
  mode: "b2c" | "b2b";
  qty: number;
  onAdd: () => void;
  ctaRef: RefObject<HTMLDivElement | null>;
}) {
  const [ctaOut, setCtaOut] = useState(false);
  const [endIn, setEndIn] = useState(false);

  useEffect(() => {
    const cta = ctaRef.current;
    const end = document.querySelector("[data-pdp-end]");
    const observers: IntersectionObserver[] = [];
    if (cta) {
      // The CTAs count as visible only above the bar's top edge (74 tall).
      const io = new IntersectionObserver(
        ([e]) => setCtaOut(!e.isIntersecting),
        { rootMargin: "0px 0px -80px 0px", threshold: 0 },
      );
      io.observe(cta);
      observers.push(io);
    }
    if (end) {
      // Near the end or past it (in the footer) the bar steps aside: the
      // root reaches far above the viewport, so "the marker is above the
      // line 100 px under the viewport" is one intersecting state that a
      // fast fling or a jump to the bottom cannot skip.
      const io = new IntersectionObserver(([e]) => setEndIn(e.isIntersecting), {
        rootMargin: "100000px 0px 100px 0px",
        threshold: 0,
      });
      io.observe(end);
      observers.push(io);
    }
    return () => observers.forEach((io) => io.disconnect());
  }, [ctaRef]);

  const b2b = mode === "b2b";
  const sale = !b2b && discountPercent(product) !== null;
  // Subscribed: the server's map replaces a stale mirrored one on screen.
  const prices = usePartnerPrices();
  const price = formatPrice(b2b ? b2bPrices(product, prices).partner : product.price);

  return (
    <StickyBar tone="light" position="fixed" show={ctaOut && !endIn} label={COPY.region}>
      <div className="@container flex items-center gap-4">
        <div className="flex shrink-0 flex-col">
          <span className={`whitespace-nowrap text-title-lg ${sale ? "text-brand" : "text-neutral-900"}`}>
            {price}
          </span>
          <span className="whitespace-nowrap text-[12px] leading-4 text-neutral-500">
            {COPY.qty} {qty}
          </span>
        </div>
        <Button size="small" fullWidth aria-label={COPY.add} className="[&>span]:min-w-0" onClick={onAdd}>
          <span className="truncate @max-[300px]:hidden">{COPY.add}</span>
          <span className="hidden whitespace-nowrap @max-[300px]:inline">{COPY.addShort}</span>
        </Button>
      </div>
    </StickyBar>
  );
}
