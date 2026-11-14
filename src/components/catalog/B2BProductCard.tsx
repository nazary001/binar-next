"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";
import { PreorderIcon } from "@/components/platform/icons";
import { InfoTip } from "@/components/ui/InfoTip";
import { CartIcon } from "./icons";
import { CARD_TITLE_LINK, ChipsRow, PHONE_CARD_RING, QtyStepper, ROW_TITLE_LINK } from "./ProductCard";
import { b2bPrices, formatPrice, productHref, type Product } from "./data";
import { usePartnerPrices } from "./CatalogRegistry";
import { useCatalogAdd } from "./phoneParts";
import { TIPS } from "./tips";
import {
  CART_DISC_HOVER,
  CART_DISC_IN_CART,
  CartDiscBody,
  CartDiscRing,
  cartDiscLabel,
  useCartDisc,
} from "./CartDisc";

const COPY = {
  wholesale: "Оптова ціна",
  retail: "роздрібна ціна",
} as const;

// Phones (system spec 3.1.1 / A27 / C-49): every uppercase caption is the
// eyebrow 12/20 Medium; desktop keeps Caption_uppercase 14/24. Every (i)
// glyph is an InfoTip: on hover / focus it shows its explanation in the
// Figma «Tooltip» chip 4634:65682 (texts in ./tips.ts; designer
// 2026-11-11, C23). Below 640 they stay hidden (TR-32) except the two in
// the phone price tile, which open the chip on tap (C42).
const CAPTION_TEXT = "text-[12px] font-medium uppercase leading-5 lg:text-[14px] lg:leading-6";

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

// Phones: the fx note takes its own line under «В НАЯВНОСТІ» (no
// dangling dot, A27) and may wrap inside a narrow column (the 160-px list
// row at 320); desktop keeps the one dotted row.
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
        <span className={CAPTION_TEXT}>Під замовлення</span>
        <InfoTip label="Під замовлення" text={TIPS.preorder(product.leadTimeDays)} className="max-lg:hidden" />
      </span>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-[2px] max-lg:flex-col max-lg:items-start">
      <span className="flex items-center gap-[2px] whitespace-nowrap">
        <span className={`${CAPTION_TEXT} text-positive`}>В наявності</span>
        {product.fxPrice && (
          <span aria-hidden className="flex size-3 shrink-0 items-center justify-center max-lg:hidden">
            <span className={`size-1 rounded-full ${tone === "light" ? "bg-white" : "bg-neutral-500"}`} />
          </span>
        )}
      </span>
      {product.fxPrice && (
        <span className={`flex items-center gap-1 max-lg:whitespace-normal lg:whitespace-nowrap ${muted}`}>
          <span className={CAPTION_TEXT}>ціна залежить від курсу</span>
          <InfoTip label="ціна залежить від курсу" text={TIPS.fx} className="max-lg:hidden" />
        </span>
      )}
    </div>
  );
}

// A price caption with its (i): `tip` is the explanation (./tips.ts).
function Caption({ children, tip, tone = "dark" }: { children: string; tip: string; tone?: B2BTone }) {
  return (
    <span
      className={`flex items-center gap-1 whitespace-nowrap ${
        tone === "light" ? "text-white" : "text-neutral-500"
      }`}
    >
      <span className={CAPTION_TEXT}>{children}</span>
      <InfoTip label={children} text={tip} className="max-lg:hidden" />
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
  // Desktop flavours only: phones draw B2BPriceTilePhone instead.
  if (inline) {
    return (
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 self-start rounded-lg bg-[#e8e8e9] p-2 max-lg:hidden">
        <span className="flex items-center gap-2">
          <Caption tip={TIPS.wholesale}>Оптова ціна</Caption>
          <span className="-ml-1 text-[14px] font-medium uppercase leading-6 text-neutral-500">:</span>
          <span className={value}>{formatPrice(prices.wholesale)}</span>
        </span>
        <span aria-hidden className="hidden h-6 w-px bg-stroke-subtle sm:block" />
        <span className="flex items-center gap-2">
          <Caption tip={TIPS.retailB2B}>роздрібна ціна</Caption>
          <span className="-ml-1 text-[14px] font-medium uppercase leading-6 text-neutral-500">:</span>
          <span className={value}>{formatPrice(prices.retail)}</span>
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-4 rounded-lg bg-[#e8e8e9] px-3 py-2 max-lg:hidden @max-[300px]:flex-col @max-[300px]:items-stretch @max-[300px]:gap-2">
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <Caption tip={TIPS.wholesale}>Оптова ціна</Caption>
        <span className={value}>{formatPrice(prices.wholesale)}</span>
      </div>
      <span aria-hidden className="h-6 w-px shrink-0 bg-stroke-subtle @max-[300px]:hidden" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <Caption tip={TIPS.retailB2B}>роздрібна ціна</Caption>
        <span className={value}>{formatPrice(prices.retail)}</span>
      </div>
    </div>
  );
}

// Phone price tile (catalog-b2b 2.7, D3 "partner-price tile full width"):
// the desktop #e8e8e9 r8 tile as two label / value rows at the full card
// (or row) width - 12/20 uppercase labels left, 16/22 Bold values right,
// no colon. A long value wraps to a right-aligned second line instead of
// overflowing. The designer asked on 2026-11-11 (C42) for a horizontal
// divider between the two prices and an (i) after each label that opens
// its explanation on tap: the rows are split by a 1-px Stroke/Subtle
// #d2d2d2 line (the desktop tile's hairline colour; divide-y draws it as
// the first row's border, so the <dl> keeps only dt / dd groups) with the
// desktop tile's 8-px rhythm above and below it (8 + 22 + 8 | 1 | 8 + 22
// + 8 = 77), and each label
// carries the 16-px #777779 (i) 4 px after it (the desktop Caption), an
// InfoTip whose tap area is the 38-px row height (it never reaches the
// other row's (i)).
export function B2BPriceTilePhone({ product, className = "" }: { product: Product; className?: string }) {
  const prices = b2bPrices(product);
  const rows = [
    [COPY.wholesale, prices.wholesale, TIPS.wholesale],
    [COPY.retail, prices.retail, TIPS.retailB2B],
  ] as const;
  return (
    <dl className={`flex flex-col divide-y divide-stroke-subtle rounded-lg bg-[#e8e8e9] px-3 lg:hidden ${className}`}>
      {rows.map(([label, amount, tip]) => (
        <div key={label} className="flex flex-wrap items-center justify-between gap-x-3 py-2">
          <dt className="flex items-center gap-1 text-[12px] font-medium uppercase leading-5 text-neutral-500">
            {label}
            <InfoTip label={label} text={tip} />
          </dt>
          <dd className="ml-auto whitespace-nowrap text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900">
            {formatPrice(amount)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// «ваша ціна» caption over the Caption/Large partner price. Phone-only
// sizes (used inside lg:hidden blocks): "stat" = the card price Stat
// 30/36 SemiBold (O-15), "amount" = the list-row amount 22/28 SemiBold.
export function B2BYourPrice({
  product,
  tone = "dark",
  size = "md",
}: {
  product: Product;
  tone?: B2BTone;
  size?: "md" | "stat" | "amount";
}) {
  // Subscribed: the server's map replaces a stale mirrored one on screen.
  const partner = b2bPrices(product, usePartnerPrices()).partner;
  const type =
    size === "stat"
      ? "text-[30px] font-semibold leading-9 tracking-[-0.6px]"
      : size === "amount"
        ? "text-[22px] font-semibold leading-7 tracking-[-0.44px]"
        : "text-[32px] font-bold leading-7 tracking-[-0.64px]";
  return (
    <span className="flex flex-col justify-center gap-1">
      <Caption tone={tone} tip={TIPS.partner}>
        ваша ціна
      </Caption>
      <span className={`whitespace-nowrap ${type} ${tone === "light" ? "text-white" : "text-neutral-900"}`}>
        {formatPrice(partner)}
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

// Outlined 52-px cart button, on every width (phones too: the designer
// asked on 2026-11-11 for the drawn outlined style instead of the solid
// brand disc the phone build showed at rest). The pointer ON THE DISC
// (not the card or row) fills it brand with a white glyph and fades in
// the rotating «У КОШИК» ring (2766:4534, CartDisc.tsx). A «Під
// замовлення» product shows the orders glyph instead of the cart and
// still adds to the cart (the order goes out as a request).
// Click adds `qty` WITHOUT opening the cart, on every width: the product
// flies into the header cart (useCatalogAdd + cart/flyToCart.ts; designer
// 2026-11-11); phones also show the «Додано у кошик» toast (DECISIONS
// O-11) and then run `onAdded` (the phone card / row resets its stepper,
// as the B2C card does). `tone="light"` = the white outline, glyph and
// ring of the dark «Купують разом» band.
export function B2BCartButton({
  product,
  qty,
  tone = "dark",
  onAdded,
}: {
  product: Product;
  qty: number;
  tone?: B2BTone;
  onAdded?: () => void;
}) {
  const catalogAdd = useCatalogAdd();
  const preorder = product.preorder || !product.available;
  // In the cart already: brand fill + check + count bubble on every
  // width; the tap pops the disc (CartDisc.tsx).
  const { inCart, ref, pop } = useCartDisc(product.id);
  return (
    <button
      ref={ref}
      type="button"
      aria-label={cartDiscLabel(product.title, inCart, preorder)}
      onClick={() => {
        if (catalogAdd(product.id, qty, { el: ref.current, image: product.image })) onAdded?.();
        pop();
      }}
      className={`group/disc relative flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[26px] border transition-colors duration-300 max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand max-lg:focus-visible:ring-offset-2 ${
        inCart > 0
          ? CART_DISC_IN_CART
          : tone === "light"
            ? `border-white text-white ${CART_DISC_HOVER}`
            : `border-neutral-900 text-neutral-900 ${CART_DISC_HOVER}`
      }`}
    >
      <CartDiscRing tone={tone === "light" ? "light" : "dark"} />
      <CartDiscBody
        inCart={inCart}
        tone={tone === "light" ? "light" : "dark"}
        idle={preorder ? <PreorderIcon className="size-6" /> : <CartIcon className="size-6" />}
      />
    </button>
  );
}

export function B2BProductCard({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const preorder = product.preorder || !product.available;
  const href = productHref(product);

  // Phones (catalog-b2b 2.7, D3): the B2C card shell (1-px #343435 ring
  // r32 painted over the full-width 206-px photo, PHONE_CARD_RING; content
  // 24), the full-width price tile 24 under the chips, «ВАША ЦІНА» + the
  // Stat 30 price, then the action row: the editable stepper left (A-10,
  // partner context), the 52 cart disc right (never closer than 12 px to
  // the plus glyph: the row is justify-between).
  return (
    <article className={`@container flex h-full flex-col ${PHONE_CARD_RING} lg:gap-8 lg:py-6`}>
      {/* The master's photo is a fixed 328-px band (the 323.5-px grid
          card is 696 tall in «Напрям» 4329:56219 / «Категорія»
          4329:56314), not a square. */}
      <Link
        href={href}
        aria-label={product.title}
        className="relative block h-[206px] w-full shrink-0 overflow-clip rounded-[32px] bg-bg-product lg:h-[328px] lg:rounded-[40px]"
      >
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 size-full object-contain ${preorder ? "grayscale" : ""}`}
        />
      </Link>

      <div className="flex flex-1 flex-col gap-6 px-6 pb-6 pt-6 lg:gap-8 lg:p-0">
        <div className="flex flex-col gap-3 lg:gap-4">
          <B2BStatusLine product={product} />
          <h3 className="text-title-lg text-neutral-900">
            <Link href={href} className={CARD_TITLE_LINK}>
              {product.title}
            </Link>
          </h3>
          <ChipsRow product={product} />
          <B2BPriceTile product={product} />
          <B2BPriceTilePhone product={product} className="mt-3" />
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-y-3 max-lg:hidden">
          <B2BPriceAndQty product={product} qty={qty} onQty={setQty} />
          <B2BCartButton product={product} qty={qty} />
        </div>

        <div className="flex flex-col gap-4 lg:hidden">
          <B2BYourPrice product={product} size="stat" />
          <div className="flex items-center justify-between gap-4">
            <QtyStepper qty={qty} onQty={setQty} editable />
            <B2BCartButton product={product} qty={qty} onAdded={() => setQty(1)} />
          </div>
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
    <article className="w-full">
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
            {/* Phones (catalog-b2b 2.8): status (fx note on its own line),
                the name 16/22 Bold (2 lines), the chips as a 14/20 meta
                line; the price tile and the buy line run at full row
                width under the photo block. */}
            <div className="flex min-w-0 flex-1 flex-col gap-2.5 lg:gap-4">
              <B2BStatusLine product={product} />
              <h3 className="text-title-sm text-neutral-900 lg:text-title-lg">
                <Link href={href} className={ROW_TITLE_LINK}>
                  {product.title}
                </Link>
              </h3>
              <ChipsRow product={product} className="max-lg:hidden" />
              <p className="text-[14px] leading-5 text-neutral-500 lg:hidden">
                {(product.chips ?? [product.volume, product.brand]).join(", ")}
              </p>
              <B2BPriceTile product={product} inline />
            </div>

            <div className="hidden items-center gap-8 sm:flex">
              <B2BPriceAndQty product={product} qty={qty} onQty={setQty} />
              <B2BCartButton product={product} qty={qty} />
            </div>
          </div>
        </div>

        <B2BPriceTilePhone product={product} className="mt-4" />
        {/* Phones: «ВАША ЦІНА» 22/28 left, the stepper + disc group right
            (it moves as one to a right-aligned second line only for a
            5-digit quantity at 320). */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 sm:hidden">
          <B2BYourPrice product={product} size="amount" />
          <div className="ml-auto flex items-center gap-4">
            <QtyStepper qty={qty} onQty={setQty} editable />
            <B2BCartButton product={product} qty={qty} onAdded={() => setQty(1)} />
          </div>
        </div>
      </div>
      {/* The hairline is the row's last pixel (stroke inside the
          1534 x 224 «B2B :: Product card horizontal», 4329:56549). */}
      <div aria-hidden className="-mt-px h-px w-full bg-stroke-subtle" />
    </article>
  );
}
