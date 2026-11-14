"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";
import { InfoTip } from "@/components/ui/InfoTip";
import { CartIcon } from "./icons";
import { QtyStepper } from "./QtyStepper";
import { ChipsRow } from "./ChipsRow";
import { TagIcon } from "@/components/product/icons";
import { discountPercent, formatPrice, productHref, type Product } from "./data";
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
// Both share the same variants: Variant2 = hover (ONLY the cart button
// changes, outlined -> solid brand with a white glyph and the rotating
// «У КОШИК» ring, 2766:4534; the designer asked on 2026-11-11 for the
// hover zone to be the button alone, not the whole card or row) and
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
// info glyph (both #777779; white on the dark band). The glyph is an
// InfoTip: hover / keyboard focus shows what the retail price is in the
// Figma «Tooltip» chip 4634:65682 (designer 2026-11-11, C23; ./tips.ts).
// Phones (system spec 3.1.1 / A27): the eyebrow 12/20 Medium uppercase,
// the (i) glyph hidden (TR-32). `noteOnPhone=
// false` (the list row) keeps only the availability below 640: every
// public price is retail, and the 160-px row column cannot hold the note
// without an orphan dot.
const STATUS_TEXT = "text-[12px] font-medium uppercase leading-5 lg:text-[14px] lg:leading-6";

export function StatusLine({
  out,
  tone = "dark",
  noteOnPhone = true,
}: {
  out: boolean;
  tone?: Tone;
  noteOnPhone?: boolean;
}) {
  const muted = tone === "light" ? "text-white" : "text-neutral-500";
  const dot = tone === "light" ? "bg-white" : "bg-neutral-500";
  // The row may wrap in the 260-px grid card (1440 layout) when the
  // longer «НЕМАЄ В НАЯВНОСТІ» label is on: the dot travels with the
  // label so a wrapped second line starts cleanly with the price note.
  // Phones: no orphan dot either way - the dot LEADS each group there and
  // the row is shifted 14 px left inside a clipping box, so the dot of
  // whichever group starts a line falls outside it (the classic separator
  // clip). The clip box is `display: contents` from 640 (no box: the
  // desktop row renders exactly as before).
  return (
    <div className="max-lg:overflow-hidden lg:contents">
      <div className="flex flex-wrap items-center gap-x-[2px] max-lg:-ml-[14px]">
        <span className="flex items-center gap-[2px] whitespace-nowrap">
          <StatusDot gate="lg:hidden" colour={dot} />
          <span className={`${STATUS_TEXT} ${out ? "text-negative" : "text-positive"}`}>
            {out ? "Немає в наявності" : "В наявності"}
          </span>
          <StatusDot gate="max-lg:hidden" colour={dot} />
        </span>
        <span className={`flex items-center gap-1 whitespace-nowrap ${muted} ${noteOnPhone ? "" : "max-lg:hidden"}`}>
          <StatusDot gate="-mr-0.5 lg:hidden" colour={dot} />
          <span className={STATUS_TEXT}>роздрібна ціна</span>
          <InfoTip label="роздрібна ціна" text={TIPS.retailB2C} className="max-lg:hidden" />
        </span>
      </div>
    </div>
  );
}

// The 4-px separator dot centred in its 12-px box; `gate` carries the
// breakpoint gate (and the phone -mr), `colour` the dot fill.
function StatusDot({ gate, colour }: { gate: string; colour: string }) {
  return (
    <span aria-hidden className={`flex size-3 shrink-0 items-center justify-center ${gate}`}>
      <span className={`size-1 rounded-full ${colour}`} />
    </span>
  );
}

// ChipsRow and QtyStepper live in ./ChipsRow and ./QtyStepper (moved for
// the mobile pass); re-exported here so existing imports keep working.
export { QtyStepper, ChipsRow };

// Price — Caption/Large 32/28 Bold. A promotional price renders in
// brand-orange with the regular price struck through beside it in
// Body/Extra Large 22/28 (#777779), 16-px gap (Figma 4329:51657).
// `compact` is the grid card: there the regular price is struck through
// in Caption 14/24 Medium (#777779) and stacked 4 px ABOVE the orange
// price, out of flow, so the card and its price row keep their height
// (the «discount» variant of «B2C :: Product card», 3991:52356 at top -16
// in the 52-px price row; asked for by the designer on 2026-11-11).
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
  const oldTone = tone === "light" ? "text-neutral-400" : "text-neutral-500";
  if (compact) {
    return (
      <span className="relative flex whitespace-nowrap">
        {sale && product.oldPrice !== undefined && (
          <s className={`absolute bottom-full left-0 mb-1 text-[14px] font-medium leading-6 ${oldTone}`}>
            {formatPrice(product.oldPrice)}
          </s>
        )}
        <span className={`text-[32px] font-bold leading-7 tracking-[-0.64px] ${color}`}>
          {formatPrice(product.price)}
        </span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-4 whitespace-nowrap">
      <span
        className={`text-[32px] font-bold leading-7 tracking-[-0.64px] ${color}`}
      >
        {formatPrice(product.price)}
      </span>
      {sale && product.oldPrice !== undefined && (
        <s className={`text-[22px] font-normal leading-7 tracking-[0.22px] ${oldTone}`}>
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

// Cart button: outlined by default on every width (phones too: the
// designer asked on 2026-11-11 for the drawn outlined style instead of
// the solid brand disc the phone build showed at rest). The pointer ON
// THE DISC (not the card or row around it) fills it brand-orange with a
// white glyph and fades in the rotating «У КОШИК» ring (Variant2,
// 2766:4534, CartDisc.tsx). Out of stock: inert gray fill, no border, no
// ring (Variant3). On the dark band the outline, glyph and ring are white
// («Icon button decorative», 4329:51423). Click adds `qty` of the
// product to the cart WITHOUT opening it, on every width: the product
// flies into the header cart (useCatalogAdd + cart/flyToCart.ts; designer
// 2026-11-11), the disc pops into its in-cart look; phones also show the
// «Додано у кошик» toast (DECISIONS O-11) and then run `onAdded` (the
// phone card / row resets its stepper).
export function CartButton({
  product,
  out,
  tone = "dark",
  qty = 1,
  onAdded,
}: {
  product: Product;
  out: boolean;
  tone?: Tone;
  qty?: number;
  onAdded?: () => void;
}) {
  const catalogAdd = useCatalogAdd();
  // In the cart already (and purchasable): brand fill + check + count
  // bubble on every width; the tap pops the disc (CartDisc.tsx).
  const { inCart: held, ref, pop } = useCartDisc(product.id);
  const inCart = out ? 0 : held;
  const look = out
    ? "cursor-default border-transparent bg-[#e8e8e9] text-neutral-900"
    : inCart > 0
      ? CART_DISC_IN_CART
      : tone === "light"
        ? `border-white text-white ${CART_DISC_HOVER}`
        : `border-neutral-900 text-neutral-900 ${CART_DISC_HOVER}`;
  return (
    <button
      ref={ref}
      type="button"
      aria-label={cartDiscLabel(product.title, inCart)}
      disabled={out}
      onClick={() => {
        if (catalogAdd(product.id, qty, { el: ref.current, image: product.image })) onAdded?.();
        pop();
      }}
      className={`group/disc relative flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[26px] border transition-colors duration-300 max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand max-lg:focus-visible:ring-offset-2 ${look}`}
    >
      {!out && <CartDiscRing tone={tone} />}
      <CartDiscBody inCart={inCart} tone={tone} idle={<CartIcon className="size-6" />} />
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
// Phones (D3 / TR-16, the Blog / Direction card shell 3176:5541): one
// column, a 1-px #343435 ring r32, the photo 206 tall r32 at the full card
// width (object-contain on the #d5d5d5 studio backdrop: no bands, no
// crop), content px / pb 24, status / title (Title Large, 2 lines) /
// chips 12 apart, then the price (Stat 30/36 SemiBold, O-15; the struck
// old price 14/20 beside it on a promo) and the action row: stepper
// left, the 52 cart disc right.
// The title link is a 40-px target on a 28-px line (6 + 28 + 6 with
// negative margins: no layout change), clamped to 2 lines on phones.
export const CARD_TITLE_LINK =
  "max-lg:-my-[6px] max-lg:py-[6px] max-lg:line-clamp-2 max-lg:[text-wrap:pretty]";
// The list-row flavour: 16/22 names, 9 + 22 + 9 = 40.
export const ROW_TITLE_LINK =
  "max-lg:-my-[9px] max-lg:py-[9px] max-lg:line-clamp-2 max-lg:[text-wrap:pretty]";
// The phone card's 1-px #343435 ring is a pseudo-element painted OVER the
// photo, like Figma's inside stroke of 3176:5541 (drawn above the
// children). The box border it replaces lay under the pulled-up photo,
// which covered the top edge and cut into the corner arcs (designer
// 2026-11-11: «лінія врізалась»). No hit testing; desktop has no ring.
export const PHONE_CARD_RING =
  "max-lg:relative max-lg:rounded-[32px] max-lg:after:pointer-events-none max-lg:after:absolute max-lg:after:inset-0 max-lg:after:rounded-[32px] max-lg:after:border max-lg:after:border-neutral-800";

export function PhonePrice({ product, size }: { product: Product; size: "stat" | "amount" }) {
  const sale = discountPercent(product) !== null;
  const type =
    size === "stat"
      ? "text-[30px] font-semibold leading-9 tracking-[-0.6px]"
      : "text-[22px] font-semibold leading-7 tracking-[-0.44px]";
  return (
    <div className={size === "stat" ? "flex flex-wrap items-baseline gap-x-2" : "flex min-w-0 flex-col"}>
      <span className={`whitespace-nowrap ${type} ${sale ? "text-brand" : "text-neutral-900"}`}>
        {formatPrice(product.price)}
      </span>
      {sale && product.oldPrice !== undefined && (
        <s className="whitespace-nowrap text-[14px] leading-5 text-neutral-500">{formatPrice(product.oldPrice)}</s>
      )}
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const out = !product.available;
  const href = productHref(product);

  return (
    <article className={`@container flex h-full flex-col ${PHONE_CARD_RING} lg:gap-8 lg:py-6`}>
      {/* bg-bg-product under the photo + object-contain on top: every
          card shares the same studio-gray backdrop, and product PNGs of
          any aspect (or with transparency) lay over it without cropping
          — square opaque photos render exactly as before. */}
      {/* Figma: 328 x 328 photo box in a 327.5-wide card (rows 692 apart:
          612 + 80). The 4-up grid is fluid (260 px at 1440, 327.5 at 1710,
          380 at 1920), so the box keeps the 327.5 : 328 aspect at lg
          (655/656) instead of a fixed height: 328 tall at 1710. */}
      <Link
        href={href}
        aria-label={product.title}
        className="relative block h-[206px] w-full shrink-0 overflow-clip rounded-[32px] bg-bg-product lg:aspect-[655/656] lg:h-auto lg:rounded-[40px]"
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

      <div className="flex flex-1 flex-col gap-6 px-6 pb-6 pt-6 lg:gap-8 lg:p-0">
        <div className="flex flex-col gap-3 lg:gap-4">
          <StatusLine out={out} />
          <h3 className="text-title-lg text-neutral-900">
            <Link href={href} className={CARD_TITLE_LINK}>
              {product.title}
            </Link>
          </h3>
          <ChipsRow product={product} />
        </div>

        {/* Price row pinned to the card bottom (the master's Title+body
            block is flexible, so short titles leave the gap above). */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-y-3 max-lg:hidden">
          <PriceAndQty product={product} qty={qty} onQty={setQty} out={out} compact />
          <CartButton product={product} out={out} qty={qty} />
        </div>

        {/* Phones: price on its own line, the action row under it. */}
        <div className="flex flex-col gap-4 lg:hidden">
          <PhonePrice product={product} size="stat" />
          <div className="flex items-center justify-between gap-4">
            <QtyStepper qty={qty} onQty={setQty} disabled={out} />
            <CartButton product={product} out={out} qty={qty} onAdded={() => setQty(1)} />
          </div>
        </div>
      </div>
    </article>
  );
}

// List row — Figma «B2C :: Product card Horizontal» (1550×168 in
// «Каталог :: список» 4329:39129, rows stacked with no gap): the 120-px
// photo, the same content stack, and the price/stepper/cart cluster
// centred against the photo, with a full-width #d2d2d2 hairline as the
// row's last pixel (-mt-px: the Figma stroke sits inside the 168).
export function ProductRow({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const out = !product.available;
  const href = productHref(product);

  return (
    <article className="w-full">
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
            {/* Phones (D3 compact row, TR-08): availability 12/20, the
                name 16/22 Bold (2 lines), the chips as a 14/20 #777779
                meta line (the pills are inert spans that looked tappable
                and spilled out of the 160-px column at 320). */}
            <div className="flex min-w-0 flex-1 flex-col gap-2.5 lg:gap-4">
              <StatusLine out={out} noteOnPhone={false} />
              <h3 className="text-title-sm text-neutral-900 lg:text-title-lg">
                <Link href={href} className={ROW_TITLE_LINK}>
                  {product.title}
                </Link>
              </h3>
              <ChipsRow product={product} className="max-lg:hidden" />
              <p className="text-[14px] leading-5 text-neutral-500 lg:hidden">
                {(product.chips ?? [product.volume, product.brand]).join(", ")}
              </p>
            </div>

            {/* sm/lg keep the Figma price cluster nested beside the title;
                phones get the full-width cluster below (see next block). */}
            <div className="hidden flex-wrap items-center gap-4 sm:flex lg:flex-nowrap lg:gap-8">
              <PriceAndQty product={product} qty={qty} onQty={setQty} out={out} />
              <CartButton product={product} out={out} qty={qty} />
            </div>
          </div>
        </div>

        {/* Phones: the price (22/28 SemiBold, the struck old price under
            it on a promo) left, the stepper + the 52 cart disc right; the
            disc always ends at the content edge (233.5 px at 320). */}
        <div className="mt-4 flex items-center justify-between gap-4 sm:hidden">
          <PhonePrice product={product} size="amount" />
          <div className="flex shrink-0 items-center gap-4">
            <QtyStepper qty={qty} onQty={setQty} disabled={out} />
            <CartButton product={product} out={out} qty={qty} onAdded={() => setQty(1)} />
          </div>
        </div>
      </div>
      <div aria-hidden className="-mt-px h-px w-full bg-stroke-subtle" />
    </article>
  );
}
