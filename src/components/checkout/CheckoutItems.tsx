"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { QtyStepper } from "@/components/catalog/ProductCard";
import { formatPrice, productHref } from "@/components/catalog/data";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { useCart } from "@/components/cart/CartProvider";
import { lineTotal, type CartEntry } from "@/components/cart/data";
import { TrashIcon } from "@/components/cart/icons";
import { CheckoutLines } from "./CheckoutLines";

// The order table — Figma «Frame 1010107002» (4329:40714, 843 wide):
// #f8f8f8 r24 container, a #343435 head row (pt-8, 14/24 SemiBold white
// heads padded 16) with «Товар» flexible, «Кількість» / «Ціна, ₴» /
// «Сума» 130 each and an 84-px action column; 108-px rows padded 16 at
// the sides with cells padded 16/24: the 60-px r12 photo + 16/22 Bold
// «title, volume, brand» (one line, ellipsis), the 20/22 Bold stepper,
// two 16/24 SemiBold amounts («31,65 ₴», the sign stays on every cell as the
// master draws it) and the 52-px trash button; 0.5-px #d2d2d2
// hairlines between rows. Below 640 the phone lines (CheckoutLines, the
// ProductLine rows of the cart sheet) replace the table; the wrapper drops
// its panel there (open rows on the white page, checkout spec 2.3).

// The name is the row's one link (the photo is a pointer shortcut only,
// out of the tab order and the AX tree).
function Thumb({ entry }: { entry: CartEntry }) {
  const { product } = entry;
  return (
    <Link
      href={productHref(product)}
      aria-hidden
      tabIndex={-1}
      className="relative block size-[60px] shrink-0 overflow-clip rounded-xl bg-bg-product"
    >
      <img
        src={product.image}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
    </Link>
  );
}

function Name({ entry, truncate = false }: { entry: CartEntry; truncate?: boolean }) {
  const { product } = entry;
  return (
    <Link
      href={productHref(product)}
      // One line with an ellipsis once the desktop canvas is the full 1710
      // frame (table 843, name cell 337). The html zoom (globals.css)
      // reaches that canvas from a 1197-px window (0.7 x 1710), so the
      // breakpoint is 1197 window px, not 1710; narrower windows and
      // tablets squeeze the fluid table, so there the name clamps to two
      // lines instead of a two-word ellipsis (line-clamp needs its own
      // display, hence no `block` in that branch).
      className={`text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900 ${
        truncate
          ? "line-clamp-2 min-[1197px]:line-clamp-none min-[1197px]:block min-[1197px]:truncate"
          : "block"
      }`}
    >
      {product.title}, {product.volume}, {product.brand}
    </Link>
  );
}

// Figma draws the 0.5-px #d2d2d2 hairline 16 px in from both table
// edges as its own 0.5-px row between the 108-px rows: a row background
// sized to (100% - 32px) x 0.5px paints it without touching the cells,
// and the extra half pixel of top padding keeps the 108.5-px rhythm (the
// nine-row master is 1040.5 tall, not 1036).
const DIVIDER =
  "bg-[linear-gradient(var(--color-stroke-subtle),var(--color-stroke-subtle))] bg-[length:calc(100%-32px)_0.5px] bg-[position:16px_0] bg-no-repeat";

export function CheckoutItems({
  entries,
  onEmptied,
}: {
  entries: CartEntry[];
  onEmptied?: () => void;
}) {
  const { setQty, remove, priceMode, unitPrice } = useCart();
  // A retail line that sold out keeps its quantity frozen; a partner's
  // unavailable line is «Під замовлення» and stays editable (as in the
  // drawer's CartRow).
  const locked = (entry: CartEntry) =>
    priceMode !== "partner" && !entry.product.available;

  return (
    <div className="overflow-clip rounded-3xl bg-bg-subtle max-lg:overflow-visible max-lg:rounded-none max-lg:bg-transparent">
      {/* Desktop / tablet table */}
      <table className="hidden w-full table-fixed border-collapse md:table">
        <colgroup>
          {/* 130/130/130 are the 1710 master's columns, in force whenever
              the zoomed canvas is the full 1710 frame (windows >= 1197 px);
              below that the fluid table is narrower, so the numeric
              columns give 20px each back to the name column. */}
          <col />
          <col className="w-[110px] min-[1197px]:w-[130px]" />
          <col className="w-[110px] min-[1197px]:w-[130px]" />
          <col className="w-[110px] min-[1197px]:w-[130px]" />
          <col className="w-[100px]" />
        </colgroup>
        <thead>
          <tr className="bg-neutral-800 text-left text-[14px] font-semibold leading-6 text-white">
            <th scope="col" className="pb-4 pl-8 pr-4 pt-6 font-semibold">
              Товар
            </th>
            <th scope="col" className="px-4 pb-4 pt-6 font-semibold">
              Кількість
            </th>
            <th scope="col" className="px-4 pb-4 pt-6 font-semibold">
              Ціна, ₴
            </th>
            <th scope="col" className="px-4 pb-4 pt-6 font-semibold">
              Сума
            </th>
            <th scope="col" className="pb-4 pl-4 pr-8 pt-6">
              <span className="sr-only">Дія</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr
              key={entry.line.id}
              className={i === 0 ? "" : `${DIVIDER} [&>td]:pt-[24.5px]`}
            >
              <td className="py-6 pl-8 pr-4 align-middle">
                <div className="flex min-w-0 items-center gap-4">
                  <Thumb entry={entry} />
                  <div className="min-w-0 flex-1">
                    <Name entry={entry} truncate />
                  </div>
                </div>
              </td>
              <td className="px-4 py-6 align-middle">
                <QtyStepper
                  qty={entry.line.qty}
                  onQty={(next) => setQty(entry.product.id, next)}
                  disabled={locked(entry)}
                  size="sm"
                />
              </td>
              <td className="whitespace-nowrap px-4 py-6 align-middle text-[16px] font-semibold leading-6 text-neutral-900">
                {formatPrice(unitPrice(entry.product))}
              </td>
              <td className="whitespace-nowrap px-4 py-6 align-middle text-[16px] font-semibold leading-6 text-neutral-900">
                <RollingNumber value={lineTotal(entry, priceMode)} format={formatPrice} />
              </td>
              <td className="py-6 pl-4 pr-8 text-right align-middle">
                <button
                  type="button"
                  onClick={() => remove(entry.product.id)}
                  aria-label={`Видалити «${entry.product.title}» із замовлення`}
                  className="inline-flex size-[52px] cursor-pointer items-center justify-center rounded-[26px] text-neutral-900 transition-colors duration-200 hover:text-brand"
                >
                  <TrashIcon className="size-6" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phone lines */}
      <CheckoutLines entries={entries} onEmptied={onEmptied} className="md:hidden" />
    </div>
  );
}
