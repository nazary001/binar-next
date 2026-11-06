"use client";

import { formatPrice, productsPlural } from "@/components/catalog/data";
import { Button } from "@/components/ui/Button";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { StickyBar, SUMMARY_AMOUNT, SUMMARY_LABEL } from "@/components/ui/StickyBar";
import { RemoveIcon, TrashIcon } from "./icons";

const COPY = {
  region: "Обрані товари",
  chosen: "Обрано:",
  sum: "Сума: ",
  hidden: (n: number) => `Приховано пошуком: ${n}`,
  add: "Додати у кошик",
  open: "Відкрити кошик",
  remove: "Видалити обрані товари з асортименту",
  reset: "Скинути виділення",
} as const;

// Phone selection bar (< 640; spec docs/superpowers/specs/mobile/
// assortment.md 2.9, system A13 StickyBar dark): the last child of the
// cabinet slab, sticky at the viewport bottom while its in-flow slot (48
// under the list) is below the fold, so ticking a row never moves the
// list. Line 1: «Обрано: N товарів» | total (wraps under itself at 320
// instead of overflowing); an optional «Приховано пошуком: N» caption
// (selected rows the search hides still count); line 2: Button/Small
// fullWidth + the 42 outlined-white disc. After the bulk add the pill
// becomes the outlined «Відкрити кошик» and the trash the «clear» disc
// «Скинути виділення» (one element each, so focus survives the flip and
// a second tap cannot silently double the cart).
export function PhoneSelectionBar({
  count,
  total,
  hiddenBySearch,
  added,
  onAdd,
  onOpenCart,
  onRemove,
  onReset,
}: {
  count: number;
  total: number;
  hiddenBySearch: number;
  added: boolean;
  onAdd: () => void;
  onOpenCart: () => void;
  onRemove: () => void;
  onReset: () => void;
}) {
  return (
    <StickyBar
      tone="dark"
      position="sticky"
      label={COPY.region}
      className="mt-12 starting:translate-y-full starting:opacity-0"
    >
      <div data-block="selection-bar-phone" className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="flex items-baseline gap-1 whitespace-nowrap">
          <span className={SUMMARY_LABEL}>{COPY.chosen}</span>
          <span aria-live="polite" aria-atomic="true" className="text-[16px] font-bold leading-[22px] tracking-[0.16px]">
            <RollingNumber value={count} format={(n) => `${n} ${productsPlural(n)}`} />
          </span>
        </p>
        <p className={`ml-auto ${SUMMARY_AMOUNT}`}>
          <span className="sr-only">{COPY.sum}</span>
          <RollingNumber value={total} format={formatPrice} />
        </p>
      </div>
      {hiddenBySearch > 0 && (
        <p className="mt-1 text-[12px] leading-4 text-neutral-400">{COPY.hidden(hiddenBySearch)}</p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <Button
          type="button"
          size="small"
          fullWidth
          variant={added ? "outlined" : "accent"}
          onClick={added ? onOpenCart : onAdd}
        >
          {added ? COPY.open : COPY.add}
        </Button>
        <button
          type="button"
          onClick={added ? onReset : onRemove}
          aria-label={added ? COPY.reset : COPY.remove}
          className="group -m-px flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <span className="flex size-[42px] items-center justify-center rounded-full border border-white text-white transition-colors duration-200 motion-reduce:transition-none group-active:bg-white group-active:text-neutral-900">
            {added ? <RemoveIcon className="size-6" /> : <TrashIcon className="size-6" />}
          </span>
        </button>
      </div>
    </StickyBar>
  );
}
