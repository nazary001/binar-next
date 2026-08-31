"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { CartIcon, InfoCircleIcon, MinusIcon, PlusIcon } from "./icons";
import { formatPrice, type Product } from "./data";

// The two B2C product-card layouts share every content atom:
//
//   «B2C :: Product card» (2766:4525, 328×612) — the grid card:
//   py-24/gap-32 column, square photo h-328 r40, then the gap-16 stack
//   (status / Title Large / chips) and the price row.
//
//   «B2C :: Product card Horizontal» (3424:33456, 1180×168) — the list
//   row: py-24 flex, 120-px r24 photo, the same gap-16 stack on the
//   left, price + stepper + cart pinned right, a #d2d2d2 hairline
//   under the row.
//
// Both share the same variants: Variant2 = whole-card hover (ONLY the
// cart button changes, outlined -> solid brand with a white glyph) and
// — on the grid card — Variant3 = out of stock («НЕМАЄ В НАЯВНОСТІ» in
// #d92d20, desaturated photo, inert gray cart).

// Status row — Caption_uppercase 14/24 Medium: availability in
// positive-green (negative-red when out of stock), a 4-px dot
// separator centred in a 12-px box, then the price-type note with the
// info glyph (both #777779).
function StatusLine({ out }: { out: boolean }) {
  return (
    <div className="flex items-center gap-[2px]">
      <span
        className={`text-[14px] font-medium uppercase leading-6 ${
          out ? "text-negative" : "text-positive"
        }`}
      >
        {out ? "Немає в наявності" : "В наявності"}
      </span>
      <span
        aria-hidden
        className="flex size-3 shrink-0 items-center justify-center"
      >
        <span className="size-1 rounded-full bg-neutral-500" />
      </span>
      <span className="flex items-center gap-1 text-neutral-500">
        <span className="text-[14px] font-medium uppercase leading-6">
          роздрібна ціна
        </span>
        <InfoCircleIcon className="size-4 shrink-0" />
      </span>
    </div>
  );
}

// Chips — 36-px pills, stroke-default border; hover flips the border +
// label to brand (Figma Chip State=Hover).
function ChipsRow({ product }: { product: Product }) {
  return (
    <div className="flex flex-wrap content-center items-center gap-2">
      {[product.volume, product.brand].map((chip) => (
        <span
          key={chip}
          className="flex h-9 items-center justify-center rounded-[60px] border border-stroke-default px-4 text-button-md text-neutral-900 transition-colors duration-200 hover:border-brand hover:text-brand"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

// Price (Caption/Large 32/28 Bold) · 24-px hairline · qty stepper with
// 16-px glyph buttons and the count in Title/Large.
function PriceAndQty({
  product,
  qty,
  onQty,
  out,
}: {
  product: Product;
  qty: number;
  onQty: (next: number) => void;
  out: boolean;
}) {
  return (
    <div className="flex items-center gap-6">
      <p className="whitespace-nowrap text-[32px] font-bold leading-7 tracking-[-0.64px] text-neutral-900">
        {formatPrice(product.price)}
      </p>
      <span aria-hidden className="h-6 w-px shrink-0 bg-stroke-subtle" />
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Зменшити кількість"
          disabled={out || qty <= 1}
          onClick={() => onQty(Math.max(1, qty - 1))}
          className="cursor-pointer text-neutral-900 transition-colors duration-200 hover:text-brand disabled:cursor-default disabled:text-neutral-400"
        >
          <MinusIcon className="size-4" />
        </button>
        <span className="w-7 text-center text-title-lg text-neutral-900">
          {qty}
        </span>
        <button
          type="button"
          aria-label="Збільшити кількість"
          disabled={out}
          onClick={() => onQty(qty + 1)}
          className="cursor-pointer text-neutral-900 transition-colors duration-200 hover:text-brand disabled:cursor-default disabled:text-neutral-400"
        >
          <PlusIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

// Cart button — outlined by default; the whole-card hover fills it
// brand-orange with a white glyph (Variant2). Out of stock: inert gray
// fill, no border (Variant3).
function CartButton({ product, out }: { product: Product; out: boolean }) {
  return (
    <button
      type="button"
      aria-label={`Додати «${product.title}» в кошик`}
      disabled={out}
      className={`flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[26px] border transition-colors duration-300 ${
        out
          ? "cursor-default border-transparent bg-[#e8e8e9] text-neutral-900"
          : "border-neutral-900 text-neutral-900 group-hover/card:border-brand group-hover/card:bg-brand group-hover/card:text-white"
      }`}
    >
      <CartIcon className="size-6" />
    </button>
  );
}

// Grid card — Figma «B2C :: Product card» (328×612).
export function ProductCard({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const out = !product.available;

  return (
    <article className="group/card flex h-full flex-col gap-8 py-6">
      {/* bg-bg-product under the photo + object-contain on top: every
          card shares the same studio-gray backdrop, and product PNGs of
          any aspect (or with transparency) lay over it without cropping
          — square opaque photos render exactly as before. */}
      <div className="relative h-[328px] w-full shrink-0 overflow-clip rounded-[40px] bg-bg-product">
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 size-full object-contain ${out ? "grayscale" : ""}`}
        />
      </div>

      <div className="flex flex-1 flex-col gap-8">
        <div className="flex flex-col gap-4">
          <StatusLine out={out} />
          <h3 className="text-title-lg text-neutral-900">{product.title}</h3>
          <ChipsRow product={product} />
        </div>

        {/* Price row pinned to the card bottom (the master's Title+body
            block is flexible, so short titles leave the gap above). */}
        <div className="mt-auto flex items-center justify-between">
          <PriceAndQty product={product} qty={qty} onQty={setQty} out={out} />
          <CartButton product={product} out={out} />
        </div>
      </div>
    </article>
  );
}

// List row — Figma «B2C :: Product card Horizontal» (1180×168): the
// 120-px photo, the same content stack, and the price/stepper/cart
// cluster centred against the photo, with a full-width #d2d2d2
// hairline under the row.
export function ProductRow({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const out = !product.available;

  return (
    <article className="group/card w-full">
      <div className="flex items-center gap-8 py-6">
        {/* Same uniform backdrop as the grid card (see above). */}
        <div className="relative size-[120px] shrink-0 self-start overflow-clip rounded-[24px] bg-bg-product">
          <img
            src={product.image}
            alt={product.title}
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 size-full object-contain ${out ? "grayscale" : ""}`}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <StatusLine out={out} />
            <h3 className="text-title-lg text-neutral-900">{product.title}</h3>
            <ChipsRow product={product} />
          </div>

          <div className="flex flex-wrap items-center gap-4 lg:flex-nowrap lg:gap-8">
            <PriceAndQty product={product} qty={qty} onQty={setQty} out={out} />
            <CartButton product={product} out={out} />
          </div>
        </div>
      </div>
      <div aria-hidden className="h-px w-full bg-stroke-subtle" />
    </article>
  );
}
