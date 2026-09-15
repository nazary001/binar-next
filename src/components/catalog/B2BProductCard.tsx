"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { PreorderIcon } from "@/components/platform/icons";
import { CartIcon, InfoCircleIcon } from "./icons";
import { ChipsRow, QtyStepper } from "./ProductCard";
import { b2bPrices, formatPrice, productHref, type Product } from "./data";

// The B2B product cards of the signed-in platform:
//
//   «B2B :: Product card» (4185:28174, 328 x 696) - the grid card: the
//   B2C card with two additions: the grey «Оптова ціна | роздрібна
//   ціна» tile (#e8e8e9, r8, px-12 py-8, two columns split by a 24-px
//   hairline; Caption_uppercase labels with the info glyph, Title/Extra
//   Small values) in the content stack, and «ваша ціна» captioned over
//   the Caption/Large price in the bottom row.
//
//   «B2B :: Product card horizontal» (4186:30306, 1180 x 224) - the
//   list row: 120-px r24 photo, the same stack with the tile hugging
//   its content («Оптова ціна (i): 31,65 ₴ | роздрібна ціна (i): 36,00
//   ₴»), price + stepper + cart pinned right, hairline under the row.
//
// Variants: USD-EUR (4186:33085) adds «· ціна залежить від курсу (i)»
// to the status line; disabled (4185:28255) is «Під замовлення (i)» in
// the negative colour with the photo desaturated and the orders glyph
// in the cart button - the partner can still order it.

// `tone="light"` is the dark «Купують разом» band of the product page
// (4329:56686): the neutral parts turn white, the availability colours
// stay.
export type B2BTone = "dark" | "light";

export function B2BStatusLine({
  product,
  tone = "dark",
}: {
  product: Product;
  tone?: B2BTone;
}) {
  const preorder = product.preorder || !product.available;
  const muted = tone === "light" ? "text-white" : "text-neutral-500";
  if (preorder) {
    return (
      <span className="flex items-center gap-1 whitespace-nowrap text-negative">
        <span className="text-[14px] font-medium uppercase leading-6">Під замовлення</span>
        <InfoCircleIcon className="size-4 shrink-0" />
      </span>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-[2px]">
      <span className="flex items-center gap-[2px] whitespace-nowrap">
        <span className="text-[14px] font-medium uppercase leading-6 text-positive">
          В наявності
        </span>
        {product.fxPrice && (
          <span aria-hidden className="flex size-3 shrink-0 items-center justify-center">
            <span className={`size-1 rounded-full ${tone === "light" ? "bg-white" : "bg-neutral-500"}`} />
          </span>
        )}
      </span>
      {product.fxPrice && (
        <span className={`flex items-center gap-1 whitespace-nowrap ${muted}`}>
          <span className="text-[14px] font-medium uppercase leading-6">
            ціна залежить від курсу
          </span>
          <InfoCircleIcon className="size-4 shrink-0" />
        </span>
      )}
    </div>
  );
}

function Caption({ children, tone = "dark" }: { children: string; tone?: B2BTone }) {
  return (
    <span
      className={`flex items-center gap-1 whitespace-nowrap ${
        tone === "light" ? "text-white" : "text-neutral-500"
      }`}
    >
      <span className="text-[14px] font-medium uppercase leading-6">{children}</span>
      <InfoCircleIcon className="size-4 shrink-0" />
    </span>
  );
}

// The wholesale / retail tile. `inline` is the list-row flavour:
// label «:» value on one line per column, hugging its content.
export function B2BPriceTile({
  product,
  inline = false,
}: {
  product: Product;
  inline?: boolean;
}) {
  const prices = b2bPrices(product);
  const value = "whitespace-nowrap text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900";
  if (inline) {
    return (
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 self-start rounded-lg bg-[#e8e8e9] p-2">
        <span className="flex items-center gap-2">
          <Caption>Оптова ціна</Caption>
          <span className="-ml-1 text-[14px] font-medium uppercase leading-6 text-neutral-500">:</span>
          <span className={value}>{formatPrice(prices.wholesale)}</span>
        </span>
        <span aria-hidden className="hidden h-6 w-px bg-stroke-subtle sm:block" />
        <span className="flex items-center gap-2">
          <Caption>роздрібна ціна</Caption>
          <span className="-ml-1 text-[14px] font-medium uppercase leading-6 text-neutral-500">:</span>
          <span className={value}>{formatPrice(prices.retail)}</span>
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-4 rounded-lg bg-[#e8e8e9] px-3 py-2 @max-[300px]:flex-col @max-[300px]:items-stretch @max-[300px]:gap-2">
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <Caption>Оптова ціна</Caption>
        <span className={value}>{formatPrice(prices.wholesale)}</span>
      </div>
      <span aria-hidden className="h-6 w-px shrink-0 bg-stroke-subtle @max-[300px]:hidden" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <Caption>роздрібна ціна</Caption>
        <span className={value}>{formatPrice(prices.retail)}</span>
      </div>
    </div>
  );
}

// «ваша ціна» caption over the Caption/Large partner price.
export function B2BYourPrice({
  product,
  tone = "dark",
}: {
  product: Product;
  tone?: B2BTone;
}) {
  return (
    <span className="flex flex-col justify-center gap-1">
      <Caption tone={tone}>ваша ціна</Caption>
      <span
        className={`whitespace-nowrap text-[32px] font-bold leading-7 tracking-[-0.64px] ${
          tone === "light" ? "text-white" : "text-neutral-900"
        }`}
      >
        {formatPrice(b2bPrices(product).partner)}
      </span>
    </span>
  );
}

// «ваша ціна» · hairline · stepper - the B2B price cluster shared by the
// cards, the product page hero (4329:56656) and the dark band.
export function B2BPriceAndQty({
  product,
  qty,
  onQty,
  tone = "dark",
  className = "",
}: {
  product: Product;
  qty: number;
  onQty: (n: number) => void;
  tone?: B2BTone;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-6 @max-[300px]:gap-3 ${className}`}>
      <B2BYourPrice product={product} tone={tone} />
      <span
        aria-hidden
        className={`h-6 w-px shrink-0 ${tone === "light" ? "bg-neutral-400" : "bg-stroke-subtle"}`}
      />
      <QtyStepper qty={qty} onQty={onQty} tone={tone} />
    </div>
  );
}

// Outlined 52-px cart button; the whole-card hover fills it brand. A
// «Під замовлення» product shows the orders glyph instead of the cart
// and still adds to the cart (the order goes out as a request).
export function B2BCartButton({
  product,
  qty,
  tone = "dark",
}: {
  product: Product;
  qty: number;
  tone?: B2BTone;
}) {
  const { add } = useCart();
  const preorder = product.preorder || !product.available;
  return (
    <button
      type="button"
      aria-label={
        preorder
          ? `Замовити «${product.title}» під замовлення`
          : `Додати «${product.title}» в кошик`
      }
      onClick={() => add(product.id, qty)}
      className={`flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[26px] border transition-colors duration-300 group-hover/card:border-brand group-hover/card:bg-brand group-hover/card:text-white ${
        tone === "light" ? "border-white text-white" : "border-neutral-900 text-neutral-900"
      }`}
    >
      {preorder ? <PreorderIcon className="size-6" /> : <CartIcon className="size-6" />}
    </button>
  );
}

export function B2BProductCard({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const preorder = product.preorder || !product.available;
  const href = productHref(product);

  return (
    <article className="group/card @container flex h-full flex-col gap-8 py-6">
      <Link
        href={href}
        aria-label={product.title}
        className="relative block h-[328px] w-full shrink-0 overflow-clip rounded-[40px] bg-bg-product lg:aspect-square lg:h-auto"
      >
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 size-full object-contain ${preorder ? "grayscale" : ""}`}
        />
      </Link>

      <div className="flex flex-1 flex-col gap-8">
        <div className="flex flex-col gap-4">
          <B2BStatusLine product={product} />
          <h3 className="text-title-lg text-neutral-900">
            <Link href={href}>{product.title}</Link>
          </h3>
          <ChipsRow product={product} />
          <B2BPriceTile product={product} />
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-y-3">
          <B2BPriceAndQty product={product} qty={qty} onQty={setQty} />
          <B2BCartButton product={product} qty={qty} />
        </div>
      </div>
    </article>
  );
}

export function B2BProductRow({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const preorder = product.preorder || !product.available;
  const href = productHref(product);

  return (
    <article className="group/card w-full">
      <div className="py-6">
        <div className="flex items-start gap-4 sm:gap-8">
          <Link
            href={href}
            aria-label={product.title}
            className="relative block size-[96px] shrink-0 overflow-clip rounded-[24px] bg-bg-product sm:size-[120px]"
          >
            <img
              src={product.image}
              alt={product.title}
              loading="lazy"
              decoding="async"
              className={`absolute inset-0 size-full object-contain ${preorder ? "grayscale" : ""}`}
            />
          </Link>

          <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <B2BStatusLine product={product} />
              <h3 className="text-title-lg text-neutral-900">
                <Link href={href}>{product.title}</Link>
              </h3>
              <ChipsRow product={product} />
              <B2BPriceTile product={product} inline />
            </div>

            <div className="hidden items-center gap-8 sm:flex">
              <B2BPriceAndQty product={product} qty={qty} onQty={setQty} />
              <B2BCartButton product={product} qty={qty} />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 sm:hidden">
          <B2BPriceAndQty product={product} qty={qty} onQty={setQty} />
          <B2BCartButton product={product} qty={qty} />
        </div>
      </div>
      <div aria-hidden className="h-px w-full bg-stroke-subtle" />
    </article>
  );
}
