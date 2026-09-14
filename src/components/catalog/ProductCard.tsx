"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";
import { CartIcon, InfoCircleIcon, MinusIcon, PlusIcon } from "./icons";
import { TagIcon } from "@/components/product/icons";
import { discountPercent, formatPrice, productHref, type Product } from "./data";
import { useCart } from "@/components/cart/CartProvider";

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
//
// The atoms are exported because the product page («Сторінка товару»,
// 4329:51337) reuses them: the hero repeats the status line and the
// qty stepper, and the dark «Купують разом» band (4329:51391) renders a
// wide card on #343435 — that is what `tone="light"` is for: every
// neutral-coloured piece (price-type note, dot, chips, stepper, cart
// ring) flips to white while the availability colour stays.

export type Tone = "dark" | "light";

// Status row — Caption_uppercase 14/24 Medium: availability in
// positive-green (negative-red when out of stock), a 4-px dot
// separator centred in a 12-px box, then the price-type note with the
// info glyph (both #777779; white on the dark band).
export function StatusLine({
  out,
  tone = "dark",
}: {
  out: boolean;
  tone?: Tone;
}) {
  const muted = tone === "light" ? "text-white" : "text-neutral-500";
  // The row may wrap in the 260-px grid card (1440 layout) when the
  // longer «НЕМАЄ В НАЯВНОСТІ» label is on: the dot travels with the
  // label so a wrapped second line starts cleanly with the price note.
  return (
    <div className="flex flex-wrap items-center gap-x-[2px]">
      <span className="flex items-center gap-[2px] whitespace-nowrap">
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
          <span
            className={`size-1 rounded-full ${
              tone === "light" ? "bg-white" : "bg-neutral-500"
            }`}
          />
        </span>
      </span>
      <span className={`flex items-center gap-1 whitespace-nowrap ${muted}`}>
        <span className="text-[14px] font-medium uppercase leading-6">
          роздрібна ціна
        </span>
        <InfoCircleIcon className="size-4 shrink-0" />
      </span>
    </div>
  );
}

// Chips — 36-px pills, stroke-default border; hover flips the border +
// label to brand (Figma Chip State=Hover). On the dark band the chips
// are white-outlined with white labels (4329:51408).
export function ChipsRow({
  product,
  tone = "dark",
}: {
  product: Product;
  tone?: Tone;
}) {
  const chips = product.chips ?? [product.volume, product.brand];
  const look =
    tone === "light"
      ? "border-white text-white"
      : "border-stroke-default text-neutral-900";
  return (
    <div className="flex flex-wrap content-center items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip}
          className={`flex h-9 items-center justify-center whitespace-nowrap rounded-[60px] border px-4 text-button-md transition-colors duration-200 hover:border-brand hover:text-brand ${look}`}
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

// Qty stepper — 16-px minus/plus glyph buttons around the count in
// Title/Large, 8-px gaps (Figma Frame 1010106549).
// `size="sm"` is the cart flavour (4329:39939): the count in 20/22 Bold.
export function QtyStepper({
  qty,
  onQty,
  disabled,
  tone = "dark",
  size = "md",
}: {
  qty: number;
  onQty: (next: number) => void;
  disabled?: boolean;
  tone?: Tone;
  size?: "md" | "sm";
}) {
  const btn =
    tone === "light"
      ? "text-white hover:text-brand disabled:text-neutral-500"
      : "text-neutral-900 hover:text-brand disabled:text-neutral-400";
  const count = `${tone === "light" ? "text-white" : "text-neutral-900"} ${
    size === "sm" ? "text-[20px] font-bold leading-[22px] tracking-[0.2px]" : "text-title-lg"
  }`;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Зменшити кількість"
        disabled={disabled || qty <= 1}
        onClick={() => onQty(Math.max(1, qty - 1))}
        className={`cursor-pointer transition-colors duration-200 disabled:cursor-default ${btn}`}
      >
        <MinusIcon className="size-4" />
      </button>
      {/* min-w-7 keeps the master's 28-px slot for 1-2 digits and grows
          for more; nowrap beats the site-wide mobile `overflow-wrap:
          anywhere` on spans, which split «120» into two lines. */}
      <span className={`min-w-7 shrink-0 whitespace-nowrap px-0.5 text-center ${count}`}>
        {qty}
      </span>
      <button
        type="button"
        aria-label="Збільшити кількість"
        disabled={disabled}
        onClick={() => onQty(qty + 1)}
        className={`cursor-pointer transition-colors duration-200 disabled:cursor-default ${btn}`}
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}

// Price — Caption/Large 32/28 Bold. A promotional price renders in
// brand-orange with the regular price struck through beside it in
// Body/Extra Large 22/28 (#777779), 16-px gap (Figma 4329:51657).
// `compact` keeps just the orange price (the 328-px grid card has no
// room for the struck one — its photo carries the «-25%» chip instead).
export function PriceTag({
  product,
  tone = "dark",
  compact = false,
}: {
  product: Product;
  tone?: Tone;
  compact?: boolean;
}) {
  const sale = discountPercent(product) !== null;
  const color = sale
    ? "text-brand"
    : tone === "light"
      ? "text-white"
      : "text-neutral-900";
  return (
    <span className="flex items-center gap-4 whitespace-nowrap">
      <span
        className={`text-[32px] font-bold leading-7 tracking-[-0.64px] ${color}`}
      >
        {formatPrice(product.price)}
      </span>
      {sale && !compact && product.oldPrice !== undefined && (
        <s
          className={`text-[22px] font-normal leading-7 tracking-[0.22px] ${
            tone === "light" ? "text-neutral-400" : "text-neutral-500"
          }`}
        >
          {formatPrice(product.oldPrice)}
        </s>
      )}
    </span>
  );
}

// Price · 24-px hairline · qty stepper.
export function PriceAndQty({
  product,
  qty,
  onQty,
  out,
  tone = "dark",
  compact = false,
  className = "",
}: {
  product: Product;
  qty: number;
  onQty: (next: number) => void;
  out: boolean;
  tone?: Tone;
  compact?: boolean;
  className?: string;
}) {
  // Figma gap 24; in columns narrower than ~300 px (4-up grid below a
  // ~1600 viewport) the gap drops to 8 so price + stepper + cart still
  // share one line - at the 260-px card of the 1440 layout the widest
  // sale price («24,50 ₴» in brand orange) needs 202 + 52 = 254.
  return (
    <div className={`flex items-center gap-6 @max-[300px]:gap-2 ${className}`}>
      <PriceTag product={product} tone={tone} compact={compact} />
      <span
        aria-hidden
        className={`h-6 w-px shrink-0 ${
          tone === "light" ? "bg-neutral-400" : "bg-stroke-subtle"
        }`}
      />
      <QtyStepper qty={qty} onQty={onQty} disabled={out} tone={tone} />
    </div>
  );
}

// Cart button — outlined by default; the whole-card hover fills it
// brand-orange with a white glyph (Variant2). Out of stock: inert gray
// fill, no border (Variant3). On the dark band the ring and glyph are
// white («Icon button decorative», 4329:51423). Click adds `qty` of the
// product to the cart and slides the drawer open.
export function CartButton({
  product,
  out,
  tone = "dark",
  qty = 1,
}: {
  product: Product;
  out: boolean;
  tone?: Tone;
  qty?: number;
}) {
  const { add } = useCart();
  const look = out
    ? "cursor-default border-transparent bg-[#e8e8e9] text-neutral-900"
    : tone === "light"
      ? "border-white text-white group-hover/card:border-brand group-hover/card:bg-brand group-hover/card:text-white"
      : "border-neutral-900 text-neutral-900 group-hover/card:border-brand group-hover/card:bg-brand group-hover/card:text-white";
  return (
    <button
      type="button"
      aria-label={`Додати «${product.title}» в кошик`}
      disabled={out}
      onClick={() => add(product.id, qty)}
      className={`flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[26px] border transition-colors duration-300 ${look}`}
    >
      <CartIcon className="size-6" />
    </button>
  );
}

// Sale chip on a product photo (Figma 4329:51644): brand pill 24 px in
// from the top-right corner, 14/24 Bold «-25%» and the 16-px tag glyph.
export function SaleChip({ product }: { product: Product }) {
  const discount = discountPercent(product);
  if (discount === null) return null;
  return (
    <span className="absolute right-6 top-6 flex items-center gap-1 rounded-[40px] bg-brand px-2 py-1 text-[14px] font-bold leading-6 text-white">
      -{discount}%
      <TagIcon className="size-4 shrink-0" />
    </span>
  );
}

// Grid card — Figma «B2C :: Product card» (328×612). The photo and the
// title link to the product page; the stepper and cart stay buttons.
export function ProductCard({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const out = !product.available;
  const href = productHref(product);

  return (
    <article className="group/card @container flex h-full flex-col gap-8 py-6">
      {/* bg-bg-product under the photo + object-contain on top: every
          card shares the same studio-gray backdrop, and product PNGs of
          any aspect (or with transparency) lay over it without cropping
          — square opaque photos render exactly as before. */}
      {/* Figma: 328 x 328 photo box in a 327.5-wide card, i.e. square and as
          wide as the column. The 4-up grid is fluid (260 px at 1440, 327.5 at
          1710, 380 at 1920), so the box keeps a 1:1 aspect at lg instead of
          a fixed height. */}
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
          className={`absolute inset-0 size-full object-contain ${out ? "grayscale" : ""}`}
        />
        <SaleChip product={product} />
      </Link>

      <div className="flex flex-1 flex-col gap-8">
        <div className="flex flex-col gap-4">
          <StatusLine out={out} />
          <h3 className="text-title-lg text-neutral-900">
            <Link href={href}>{product.title}</Link>
          </h3>
          <ChipsRow product={product} />
        </div>

        {/* Price row pinned to the card bottom (the master's Title+body
            block is flexible, so short titles leave the gap above). */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-y-3">
          <PriceAndQty product={product} qty={qty} onQty={setQty} out={out} compact />
          <CartButton product={product} out={out} qty={qty} />
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
  const href = productHref(product);

  return (
    <article className="group/card w-full">
      <div className="py-6">
        <div className="flex items-start gap-4 sm:items-center sm:gap-8">
          {/* Same uniform backdrop as the grid card (see above). Phones use a
              96-px thumb; sm+ keeps the Figma-exact 120-px photo. */}
          <Link
            href={href}
            aria-label={product.title}
            className="relative block size-[96px] shrink-0 self-start overflow-clip rounded-[24px] bg-bg-product sm:size-[120px]"
          >
            <img
              src={product.image}
              alt={product.title}
              loading="lazy"
              decoding="async"
              className={`absolute inset-0 size-full object-contain ${out ? "grayscale" : ""}`}
            />
          </Link>

          <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <StatusLine out={out} />
              <h3 className="text-title-lg text-neutral-900">
                <Link href={href}>{product.title}</Link>
              </h3>
              <ChipsRow product={product} />
            </div>

            {/* sm/lg keep the Figma price cluster nested beside the title;
                phones get the full-width cluster below (see next block). */}
            <div className="hidden flex-wrap items-center gap-4 sm:flex lg:flex-nowrap lg:gap-8">
              <PriceAndQty product={product} qty={qty} onQty={setQty} out={out} />
              <CartButton product={product} out={out} qty={qty} />
            </div>
          </div>
        </div>

        {/* Phones: price/stepper/cart drop to their own full-width line so the
            ~190-px details column beside the photo no longer clips the price
            or pushes the cart off the viewport. */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 sm:hidden">
          <PriceAndQty product={product} qty={qty} onQty={setQty} out={out} />
          <CartButton product={product} out={out} qty={qty} />
        </div>
      </div>
      <div aria-hidden className="h-px w-full bg-stroke-subtle" />
    </article>
  );
}
