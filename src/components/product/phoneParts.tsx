import type { ReactNode } from "react";
import { b2bPrices, discountPercent, formatPrice, type Product } from "@/components/catalog/data";
import { usePartnerPrices } from "@/components/catalog/CatalogRegistry";

// Phone-only pieces of the product page (mobile pass, C-pdp; pdp spec 2.5,
// 2.8). Every element here renders inside an `lg:hidden` block, except
// DotList, whose ul / li keep the desktop disc list from 640.

const COPY = {
  inStock: "В наявності",
  soldOut: "Немає в наявності",
  preorder: "Під замовлення",
  fx: "ціна залежить від курсу",
  retail: "роздрібна ціна",
  partner: "ваша ціна",
} as const;

// The one uppercase size on phones (system spec 3.1.1 / C-49): the eyebrow
// 12/20 Medium, the same string as the catalog card status line.
const CAPTION = "text-[12px] font-medium uppercase leading-5";

type Mode = "b2c" | "b2b";
type Tone = "dark" | "light";

// Availability only (pdp 2.5.1): no dot separators (they orphan at 320) and
// no (i) glyphs (they explain nothing on touch, TR-32). The price-type note
// is the caption above the price (PhonePrice), one pattern for both skins.
export function PhoneAvailability({
  product,
  mode = "b2c",
  out,
  tone = "dark",
  className = "",
}: {
  product: Product;
  mode?: Mode;
  out: boolean;
  tone?: Tone;
  className?: string;
}) {
  const muted = tone === "light" ? "text-white" : "text-neutral-500";
  const label = out ? (mode === "b2b" ? COPY.preorder : COPY.soldOut) : COPY.inStock;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className={`${CAPTION} ${out ? "text-negative" : "text-positive"}`}>{label}</span>
      {mode === "b2b" && !out && product.fxPrice && (
        <span className={`${CAPTION} ${muted}`}>{COPY.fx}</span>
      )}
    </div>
  );
}

// Price group (pdp 2.5.2): the price-type caption over the price, Stat
// 30/36 SemiBold (DECISIONS O-15), brand on a promo with the struck regular
// price beside it (Body Large 18/26 on the hero, 14/20 on a card); the
// struck price wraps under the price only when the line is too narrow.
// `caption={false}` is the band card flavour (its status line already
// carries the note, like the catalog card).
export function PhonePrice({
  product,
  mode = "b2c",
  tone = "dark",
  size = "hero",
  caption = true,
}: {
  product: Product;
  mode?: Mode;
  tone?: Tone;
  size?: "hero" | "card";
  caption?: boolean;
}) {
  const b2b = mode === "b2b";
  const sale = !b2b && discountPercent(product) !== null;
  // Subscribed: the server's map replaces a stale mirrored one on screen.
  const prices = usePartnerPrices();
  const value = b2b ? b2bPrices(product, prices).partner : product.price;
  const colour = sale ? "text-brand" : tone === "light" ? "text-white" : "text-neutral-900";
  const struck =
    size === "hero" ? "text-[18px] leading-[26px] tracking-[0.18px]" : "text-[14px] leading-5";
  return (
    <div className="flex flex-col gap-1">
      {caption && (
        <span className={`${CAPTION} ${tone === "light" ? "text-white" : "text-neutral-500"}`}>
          {b2b ? COPY.partner : COPY.retail}
        </span>
      )}
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className={`whitespace-nowrap text-[30px] font-semibold leading-9 tracking-[-0.6px] ${colour}`}>
          {formatPrice(value)}
        </span>
        {sale && product.oldPrice !== undefined && (
          <s className={`whitespace-nowrap ${struck} ${tone === "light" ? "text-neutral-400" : "text-neutral-500"}`}>
            {formatPrice(product.oldPrice)}
          </s>
        )}
      </span>
    </div>
  );
}

// The master dot list (3165:6318) on phones: an 8-px brand dot centred in a
// 24 x 20 box on the first line, 8 to the text, items 8 apart. From 640 the
// same ul / li render the desktop disc list unchanged (`className` carries
// the desktop classes; the dot boxes are lg:hidden).
export function DotList({ items, className }: { items: ReactNode[]; className: string }) {
  return (
    <ul
      role="list"
      className={`${className} max-lg:flex max-lg:list-none max-lg:flex-col max-lg:gap-2 max-lg:ps-0`}
    >
      {items.map((t, i) => (
        <li key={i} className="max-lg:flex max-lg:gap-2">
          <span aria-hidden className="flex h-5 w-6 shrink-0 items-center justify-center lg:hidden">
            <span className="size-2 rounded-full bg-brand" />
          </span>
          <span className="min-w-0">{t}</span>
        </li>
      ))}
    </ul>
  );
}

// Section titles mixing the Light and Bold runs of the masters' H2 on
// phones (system 3.1.1). The desktop keeps the plain one-run string in its
// own span: splitting the desktop text into styled runs shifts its glyphs
// by sub-pixels on the zoomed canvas.
export function SplitTitle({ light, bold, lightFirst = true }: { light: string; bold: string; lightFirst?: boolean }) {
  const lightRun = <span className="font-light">{light}</span>;
  return (
    <>
      <span className="lg:hidden">
        {lightFirst ? lightRun : bold}
        {lightFirst ? bold : lightRun}
      </span>
      <span className="max-lg:hidden">{lightFirst ? light + bold : bold + light}</span>
    </>
  );
}
