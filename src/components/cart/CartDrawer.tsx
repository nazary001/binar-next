"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { ChipsRow, QtyStepper, StatusLine } from "@/components/catalog/ProductCard";
import { InfoCircleIcon, XMarkIcon } from "@/components/catalog/icons";
import { formatPrice, formatPriceWhole, productHref } from "@/components/catalog/data";
import { useCart } from "./CartProvider";
import { FREE_DELIVERY_THRESHOLD, lineTotal, type CartEntry } from "./data";
import { CheckCircleIcon, DeliveryIcon, TrashIcon } from "./icons";
import { useFitZoom } from "./useFitZoom";
import { useModalBehavior } from "./useModalBehavior";

// Master geometry (4329:39906): the panel is 576 wide and fills the
// 1117-px screen under the 92-px header, i.e. 1025 px tall.
const DRAWER_W = 576;
const DRAWER_DESIGN_H = 1025;
const DESKTOP_HEADER_H = 92;

// «Кошик» drawer — Figma 4329:39905: a 576-px sheet hanging from the
// sticky header at the right edge (rounded-tl-48) over the blurred
// #343435/50 scrim. Body: pl-60 pr-80 pt-60, 40-px rhythm — the title
// row (Title/Large «Кошик» + «Очистити» text button) and the scrolling
// list of cart rows. Footer («альтернатива», 4329:40047): #1d1d1f
// summary with the order total, the free-delivery progress and the
// orange «Оформити замовлення».

// One cart row — «B2C :: Product card horizontal» in its cart flavour
// (4329:39913, 436×228): py-24, an 80-px r16 photo, then a 16-px stack
// of [status + Title/Medium] and [chips + price row]; the price row is
// the line total in 20/22 Bold, the hairline, the stepper and a 52-px
// trash button. A #d2d2d2 hairline closes every row.
function CartRow({ entry }: { entry: CartEntry }) {
  const { setQty, remove } = useCart();
  const { product, line } = entry;
  const out = !product.available;
  const href = productHref(product);

  // Phones: a 64-px photo and 16-px gap leave ~230 px for the content
  // column (the container the price row queries), enough for price ·
  // stepper · trash on one line with the tightened gaps.
  return (
    <div>
      <article className="flex items-start gap-4 py-6 sm:gap-8">
        <Link
          href={href}
          aria-label={product.title}
          className="relative block size-16 shrink-0 overflow-clip rounded-2xl bg-bg-product sm:size-20"
        >
          <img
            src={product.image}
            alt={product.title}
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 size-full object-cover ${out ? "grayscale" : ""}`}
          />
        </Link>

        <div className="@container flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-3">
            <StatusLine out={out} />
            <h3 className="text-title-md text-neutral-900">
              <Link href={href}>{product.title}</Link>
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            <ChipsRow product={product} />
            <div className="flex flex-wrap items-center justify-between gap-y-3">
              <div className="flex items-center gap-6 @max-[300px]:gap-2">
                <span className="whitespace-nowrap text-[20px] font-bold leading-[22px] tracking-[0.2px] text-neutral-900">
                  {formatPrice(lineTotal(entry))}
                </span>
                <span aria-hidden className="h-6 w-px shrink-0 bg-stroke-subtle" />
                <QtyStepper
                  qty={line.qty}
                  onQty={(next) => setQty(product.id, next)}
                  disabled={out}
                  size="sm"
                />
              </div>
              <button
                type="button"
                onClick={() => remove(product.id)}
                aria-label={`Видалити «${product.title}» з кошика`}
                className="ml-auto flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[26px] text-neutral-900 transition-colors duration-200 hover:text-brand"
              >
                <TrashIcon className="size-6" />
              </button>
            </div>
          </div>
        </div>
      </article>
      <div aria-hidden className="h-px w-full bg-stroke-subtle" />
    </div>
  );
}

// Free-delivery meter (4329:40052): a 436-px track (8 px, #616162) with
// the brand fill and a 16-px white-ring knob at its end; the current
// sum rides above the knob in a brand chip (r12, 14/24 Medium), «0 ₴»
// and «5 000 ₴ + info» sit under the chip row in #a5a5a5. Once the
// threshold is reached (4329:40289) the fill is full, the chip reads
// «5 000 ₴» over the knob and the right label disappears.
function DeliveryMeter({ subtotal }: { subtotal: number }) {
  const pct = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);
  const reached = subtotal >= FREE_DELIVERY_THRESHOLD;
  // The knob centre sits 4 px inside the fill end (clamped to the
  // track); the chip is centred on the knob but kept clear of the two
  // labels while the bar is still filling.
  const knobCentre = `clamp(8px, calc(${pct}% - 4px), calc(100% - 8px))`;
  const chipLeft = reached
    ? knobCentre
    : `clamp(64px, calc(${pct}% - 4px), calc(100% - 122px))`;

  return (
    <div className="relative h-[52px] w-full">
      <span
        className="absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-xl bg-brand px-2 py-1 text-[14px] font-medium leading-6 text-white"
        style={{ left: chipLeft }}
      >
        {reached ? formatPriceWhole(FREE_DELIVERY_THRESHOLD) : formatPrice(subtotal)}
      </span>
      <span className="absolute left-0 top-4 text-[14px] font-medium leading-6 text-neutral-300">
        {formatPriceWhole(0)}
      </span>
      {!reached && (
        <span className="absolute right-0 top-4 flex items-center gap-1 text-[14px] font-medium leading-6 text-neutral-300">
          {formatPriceWhole(FREE_DELIVERY_THRESHOLD)}
          <InfoCircleIcon className="size-4 shrink-0" />
        </span>
      )}
      <div
        role="progressbar"
        aria-label="Прогрес до безкоштовної доставки"
        aria-valuemin={0}
        aria-valuemax={FREE_DELIVERY_THRESHOLD}
        aria-valuenow={Math.min(subtotal, FREE_DELIVERY_THRESHOLD)}
        className="absolute inset-x-0 top-11 h-2 rounded-full bg-neutral-600"
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
        <span
          aria-hidden
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white"
          style={{ left: knobCentre }}
        />
      </div>
    </div>
  );
}

export function CartDrawer() {
  const { open, closeCart, entries, subtotal, clear, checkout } = useCart();
  const router = useRouter();
  const asideRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  // The master (4329:39906) fills a 1117-px screen: 1025 px of panel under
  // the 92-px header. Shorter desktop windows get the same composition
  // scaled to fit (2.3 rows over the summary) instead of a cropped list.
  const fit = useFitZoom(DRAWER_DESIGN_H, DESKTOP_HEADER_H);
  const fitted = fit < 1;
  const reached = subtotal >= FREE_DELIVERY_THRESHOLD;
  const remaining = Math.max(0, Math.round((FREE_DELIVERY_THRESHOLD - subtotal) * 100) / 100);

  // Escape / scroll lock / focus trap / focus restore. The sticky header
  // paints above the drawer's scrim (the sheet hangs from it, as drawn),
  // so it is made inert while the drawer is open — a truly modal drawer
  // must not leave the nav clickable.
  useModalBehavior({
    open,
    onClose: closeCart,
    container: asideRef,
    initial: closeRef,
    inertSelector: "body > header",
  });

  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`}
    >
      <div
        aria-hidden
        onClick={closeCart}
        className={`absolute inset-0 bg-[#343435]/50 backdrop-blur-[4px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        ref={asideRef}
        role="dialog"
        aria-modal="true"
        aria-label="Кошик"
        tabIndex={-1}
        style={{
          top: "var(--site-header-h, 92px)",
          ...(fitted
            ? { width: DRAWER_W * fit, borderTopLeftRadius: 48 * fit }
            : undefined),
        }}
        className={`absolute bottom-0 right-0 flex w-[576px] max-w-[92vw] flex-col overflow-hidden rounded-tl-[32px] bg-white transition-[translate] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[translate] lg:rounded-tl-[48px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Everything inside lives in the master's px; on short windows the
            wrapper is the 576 x 1025 design box zoomed to the space left
            under the header (CSS zoom keeps text crisp and hit-testing
            exact, unlike a transform). */}
        <div
          className="relative flex min-h-0 flex-1 flex-col"
          style={fitted ? { zoom: fit, width: DRAWER_W, height: DRAWER_DESIGN_H, flex: "none" } : undefined}
        >
        <button
          ref={closeRef}
          type="button"
          onClick={closeCart}
          aria-label="Закрити кошик"
          className="absolute right-4 top-4 z-[1] flex size-8 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 hover:text-brand lg:right-6 lg:top-6"
        >
          <XMarkIcon className="size-8" />
        </button>

        <div className="flex min-h-0 flex-1 flex-col gap-6 px-6 pt-8 lg:gap-10 lg:pl-[60px] lg:pr-20 lg:pt-[60px]">
          <div className="flex items-center justify-between pt-1">
            <h2 className="text-[24px] font-bold leading-7 tracking-[-0.48px] text-neutral-900">
              Кошик
            </h2>
            {entries.length > 0 && (
              <button
                type="button"
                onClick={clear}
                className="flex cursor-pointer items-center gap-[2px] text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
              >
                Очистити
                <XMarkIcon className="size-4 shrink-0" />
              </button>
            )}
          </div>

          <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {entries.length === 0 ? (
              <div className="flex flex-col items-start gap-6 py-6">
                <p className="text-title-md text-neutral-900">Кошик порожній</p>
                <p className="text-body-sm text-neutral-800">
                  Додайте товари з каталогу, і вони з&apos;являться тут.
                </p>
                <Button href="/catalog" size="small" arrow onClick={closeCart}>
                  Перейти в каталог
                </Button>
              </div>
            ) : (
              entries.map((entry) => <CartRow key={entry.line.id} entry={entry} />)
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 bg-neutral-900 px-6 py-6 lg:gap-10 lg:pl-[60px] lg:pr-20 lg:py-10">
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between text-white">
              <span className="text-body-md">Сума замовлення</span>
              <span className="text-title-lg text-white">{formatPrice(subtotal)}</span>
            </div>

            <DeliveryMeter subtotal={subtotal} />

            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-white">
                <DeliveryIcon className="size-5" />
              </span>
              {reached ? (
                <span className="flex items-center gap-2 text-[14px] font-medium leading-6 text-white">
                  Безкоштовна доставка
                  <CheckCircleIcon className="size-5 shrink-0 text-positive" />
                </span>
              ) : (
                <p className="text-[14px] leading-6">
                  <span className="text-white/60">До безкоштовної доставки залишилось:</span>
                  <br />
                  <span className="font-medium text-white">{formatPrice(remaining)}</span>
                </p>
              )}
            </div>
          </div>

          <Button
            variant="accent"
            fullWidth
            onClick={() => {
              if (checkout()) router.push("/checkout");
            }}
            disabled={entries.length === 0}
          >
            Оформити замовлення
          </Button>
        </div>
        </div>
      </aside>
    </div>
  );
}
