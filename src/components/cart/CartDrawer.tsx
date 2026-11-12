"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { ChipsRow, QtyStepper, StatusLine } from "@/components/catalog/ProductCard";
import { B2BStatusLine } from "@/components/catalog/B2BProductCard";
import { InfoCircleIcon, XMarkIcon } from "@/components/catalog/icons";
import { formatPrice, formatPriceWhole, productHref } from "@/components/catalog/data";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { ensureShopConfig } from "@/lib/session/bootstrap";
import { useShopConfig } from "@/lib/session/config";
import { useCart } from "./CartProvider";
import { METER_MOTION, lineTotal, type CartEntry } from "./data";
import { CartSheetPhone } from "./CartSheetPhone";
import { CheckCircleIcon, DeliveryIcon, TrashIcon } from "./icons";
import { LeavingRow, useLeavingRows } from "./LeavingRow";
import { useFitZoom } from "./useFitZoom";
import { OVERLAY_INERT, useModalBehavior } from "./useModalBehavior";

// Master geometry. Public (B2C) drawer, overlay 4329:39905 / 4329:40142 /
// 4929:61873 and sheet 4329:39906 / 4329:40143 / 4929:61874: 576 x 1031
// at y 87 of the 1117-px frame. The overlay is drawn above the 92-px
// header, so the scrim dims the header's bottom 5 px and the sheet's
// r48 corner overlaps it; the sheet runs 1 px past the frame bottom
// (its bottom stroke is clipped off-screen). Partner drawer (4204:56703
// in «Мій асортимент :: Додано у кошик»): the overlay starts at the
// 92-px B2B bar's bottom edge, 1025 px of a 1117-px screen.
const DRAWER_W = 576;
const DESKTOP_HEADER_H = 92;
const B2C_HEADER_OVERLAP = 5;
const B2C_DESIGN_H = 1031;
const B2B_DESIGN_H = 1025;

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
// For a signed-in partner (drawer 4204:56703 of «Мій асортимент :: Додано
// у кошик») the row bills the partner price and the status row shows
// only the availability (the «роздрібна ціна» group is hidden there) -
// the catalog's B2BStatusLine; a «Під замовлення» line stays orderable.
function CartRow({ entry }: { entry: CartEntry }) {
  const { setQty, remove, priceMode, closeCart } = useCart();
  const { product, line } = entry;
  const b2b = priceMode === "partner";
  const out = !b2b && !product.available;
  const grey = b2b ? Boolean(product.preorder) || !product.available : out;
  const href = productHref(product);

  // Phones: a 64-px photo and 16-px gap leave ~230 px for the content
  // column (the container the price row queries), enough for price ·
  // stepper · trash on one line with the tightened gaps.
  return (
    <div>
      <article className="flex items-start gap-4 py-6 sm:gap-8">
        <Link
          href={href}
          onClick={closeCart}
          aria-label={product.title}
          className="relative block size-16 shrink-0 overflow-clip rounded-2xl bg-bg-product sm:size-20"
        >
          <img
            src={product.image}
            alt={product.title}
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 size-full object-cover ${grey ? "grayscale" : ""}`}
          />
        </Link>

        <div className="@container flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-3">
            {b2b ? <B2BStatusLine product={product} /> : <StatusLine out={out} />}
            <h3 className="text-title-md text-neutral-900">
              <Link href={href} onClick={closeCart}>
                {product.title}
              </Link>
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            <ChipsRow product={product} />
            <div className="flex flex-wrap items-center justify-between gap-y-3">
              <div className="flex items-center gap-6 @max-[300px]:gap-2">
                {/* Every sum in the cart rolls to its new value
                    (ui/RollingNumber.tsx); the row total follows the stepper. */}
                <RollingNumber
                  value={lineTotal(entry, priceMode)}
                  format={formatPrice}
                  className="whitespace-nowrap text-[20px] font-bold leading-[22px] tracking-[0.2px] text-neutral-900"
                />
                {/* «Line 1» is a 0-wide box in the master (price + 24 + line +
                    24 = stepper), so the 1-px rule nets no width. */}
                <span aria-hidden className="-mx-[0.5px] h-6 w-px shrink-0 bg-stroke-subtle" />
                <QtyStepper
                  size="sm"
                  slot="fixed"
                  qty={line.qty}
                  onQty={(next) => setQty(product.id, next)}
                  disabled={out}
                />
              </div>
              <button
                type="button"
                data-cart-trash
                onClick={(e) => {
                  // Focus hand-off (behaviour only): the next row's trash,
                  // else the previous one's, else the close button.
                  const own = e.currentTarget;
                  const aside = own.closest("aside");
                  // Rows on their way out (LeavingRow, inert) cannot take it.
                  const all = aside
                    ? [...aside.querySelectorAll<HTMLButtonElement>("button[data-cart-trash]")].filter(
                        (b) => b === own || !b.closest("[inert]"),
                      )
                    : [];
                  const i = all.indexOf(own);
                  const next =
                    all[i + 1] ??
                    all[i - 1] ??
                    aside?.querySelector<HTMLButtonElement>('button[aria-label="Закрити кошик"]');
                  remove(product.id);
                  requestAnimationFrame(() => next?.focus({ preventScroll: true }));
                }}
                aria-label={`Видалити «${product.title}» з кошика`}
                className="ml-auto flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[26px] text-neutral-900 transition-colors duration-200 hover:text-brand"
              >
                <TrashIcon className="size-6" />
              </button>
            </div>
          </div>
        </div>
      </article>
      {/* «Vector 59» is a 0-height line (rows step by 228: 132, 360,
          588 in 4329:39906 and 4204:56703), not a 1-px row. */}
      <Hairline />
    </div>
  );
}

// Free-delivery meter (4329:40052): a 436-px track (8 px, #616162) with
// the brand fill and a 16-px white-ring knob at its end; the current
// sum rides above the knob in a brand chip (r12, 14/24 Medium), «0 ₴»
// and «5 000 ₴ + info» sit under the chip row in #a5a5a5. Once the
// threshold is reached (4329:40289) the fill is full, the chip reads
// «5 000 ₴» over the knob and the right label disappears. `limit` = the
// shop's free-delivery limit (useShopConfig; 5 000 until the session
// answer brings the panel's value), above zero: a limit of 0 means free
// delivery from the first hryvnia, and the drawer shows no meter at all
// (nothing to count to), only the «Безкоштовна доставка» line.
function DeliveryMeter({ subtotal, limit }: { subtotal: number; limit: number }) {
  const pct = Math.min(100, (subtotal / limit) * 100);
  const reached = subtotal >= limit;
  // The knob centre sits 4 px inside the fill end (clamped to the
  // track); the chip is centred on the knob but kept clear of the two
  // labels while the bar is still filling.
  const knobCentre = `clamp(8px, calc(${pct}% - 4px), calc(100% - 8px))`;
  const chipLeft = reached
    ? knobCentre
    : `clamp(64px, calc(${pct}% - 4px), calc(100% - 122px))`;

  return (
    <div className="relative h-[52px] w-full">
      {/* The chip, the knob and the fill glide to the new sum together
          with the rolling digits (METER_MOTION). */}
      <span
        className={`absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-xl bg-brand px-2 py-1 text-[14px] font-medium leading-6 text-white ${METER_MOTION}`}
        style={{ left: chipLeft }}
      >
        <RollingNumber
          value={reached ? limit : subtotal}
          format={reached ? formatPriceWhole : formatPrice}
        />
      </span>
      <span className="absolute left-0 top-4 text-[14px] font-medium leading-6 text-neutral-300">
        {formatPriceWhole(0)}
      </span>
      {!reached && (
        <span className="absolute right-0 top-4 flex items-center gap-1 text-[14px] font-medium leading-6 text-neutral-300">
          {formatPriceWhole(limit)}
          <InfoCircleIcon className="size-4 shrink-0" />
        </span>
      )}
      <div
        role="progressbar"
        aria-label="Прогрес до безкоштовної доставки"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(subtotal, limit)}
        className="absolute inset-x-0 top-11 h-2 rounded-full bg-neutral-600"
      >
        <div className={`h-full rounded-full bg-brand ${METER_MOTION}`} style={{ width: `${pct}%` }} />
        <span
          aria-hidden
          className={`absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white ${METER_MOTION}`}
          style={{ left: knobCentre }}
        />
      </div>
    </div>
  );
}

// «Vector 60 / 59» (4929:62811 / 4929:62809): a 1-px #d2d2d2 line drawn
// on a 0-height row (the stroke straddles the row's y, as in Figma), so
// the 40-px gaps around it measure from the line itself.
function Hairline() {
  return (
    <div aria-hidden className="relative h-0 w-full shrink-0">
      <span className="absolute inset-x-0 -top-[0.5px] h-px bg-stroke-subtle" />
    </div>
  );
}

// «Кошик :: Пустий» (4929:61799, sheet 4929:61875): the drawer body keeps
// its pl-60 pr-80 pt-60 gutters and 40-px rhythm - title «Кошик»,
// hairline (y 132), the centred note (y 172: Title/Extra Small 16/22
// Bold +1 % «Кошик порожній», 8, Body/Small 14/24 #343435), hairline
// (y 266), then the full-width accent Button/Large «Переглянути каталог»
// (436 x 52 at y 306). No summary footer in this state.
function EmptyCart({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="max-lg:hidden flex flex-col gap-6 px-6 pt-8 pb-6 lg:gap-10 lg:pb-[39px] lg:pl-[59px] lg:pr-[79px] lg:pt-[59px]">
      <div className="flex items-center pt-1">
        <h2 className="text-[24px] font-bold leading-7 tracking-[-0.48px] text-neutral-900">
          Кошик
        </h2>
      </div>
      <Hairline />
      <div className="flex flex-col gap-2 text-center">
        <p className="text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900">
          Кошик порожній
        </p>
        <p className="text-[14px] font-normal leading-6 text-neutral-800">
          Додайте товари до кошика, щоб оформити замовлення.
        </p>
      </div>
      <Hairline />
      {/* Plain block parent: the fullWidth wrapper is flex-1, which would
          otherwise stretch down the column. */}
      <div>
        <Button href="/catalog" variant="accent" size="large" fullWidth onClick={onBrowse}>
          Переглянути каталог
        </Button>
      </div>
    </div>
  );
}

export function CartDrawer() {
  const { open, closeCart, entries, subtotal, clear, checkout, priceMode } = useCart();
  // Removed rows stay in the list while they slide out (LeavingRow), so
  // the empty state waits for the last one.
  const { rows, done } = useLeavingRows(entries, (e) => e.line.id);
  const empty = rows.length === 0;
  const router = useRouter();
  const asideRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  // Phone sheet title (lg:hidden): the initial focus on coarse pointers
  // (system spec A5 / 3.1.6: screen readers hear the title, no keyboard
  // pops); the cross everywhere else (desktop parity).
  const phoneTitleRef = useRef<HTMLHeadingElement | null>(null);
  const focusRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const title = phoneTitleRef.current;
    focusRef.current =
      title && title.getClientRects().length > 0 && window.matchMedia("(pointer: coarse)").matches
        ? title
        : closeRef.current;
  }, [open]);
  const focusClose = useCallback(() => closeRef.current?.focus({ preventScroll: true }), []);
  // The public header is overlapped by the B2C sheet; the partner's B2B
  // bar is not (see the master geometry above).
  const overlap = priceMode !== "partner";
  const designH = overlap ? B2C_DESIGN_H : B2B_DESIGN_H;
  // The masters fill a 1117-px screen: the B2C sheet spans y 87 .. 1118
  // (header - 5 .. bottom + 1, so the space it cannot use is 86 px), the
  // partner one 92 .. 1117. Shorter desktop windows get the same
  // composition scaled to fit (2.3 rows over the summary) instead of a
  // cropped list.
  const fit = useFitZoom(
    designH,
    overlap ? DESKTOP_HEADER_H - B2C_HEADER_OVERLAP - 1 : DESKTOP_HEADER_H,
  );
  const fitted = fit < 1;
  const { freeDeliveryLimit } = useShopConfig();
  const reached = subtotal >= freeDeliveryLimit;
  const remaining = Math.max(0, Math.round((freeDeliveryLimit - subtotal) * 100) / 100);
  // A visitor without a session has no session answer to bring the shop's
  // limit: the first opening of the cart asks for it (once per page).
  useEffect(() => {
    if (open) ensureShopConfig();
  }, [open]);

  // Escape / scroll lock / focus trap / focus restore. The sticky header
  // stays visible above the scrim's top edge (the sheet hangs from it, as
  // drawn), so it is made inert while the drawer is open - a truly modal
  // drawer must not leave the nav clickable. Phones: the full-screen sheet
  // covers the header and both phone menus (OVERLAY_INERT).
  useModalBehavior({
    open,
    onClose: closeCart,
    container: asideRef,
    initial: focusRef,
    inertSelector: OVERLAY_INERT,
  });

  // Phones (< 640, cart spec 2.1): a full-screen sheet over everything
  // (z 60 > the z-50 header and the z-45 menus), no scrim, square, the
  // menu-master motion (opacity + 12-px drop, 400 ms). Desktop: every lg:
  // value below equals the pre-mobile-pass value (z 51 / 40, the 576-px
  // drawer hanging from the header, r48, slide from the right).
  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={`fixed inset-0 z-[60] ${overlap ? "lg:z-[51]" : "lg:z-40"} ${open ? "" : "pointer-events-none"}`}
    >
      {/* The scrim starts at the header's bottom edge (--site-header-h:
          92 on desktop, 66 on phones); the header stays inert under it.
          B2C desktop: the overlay frame sits at y 87, drawn above the
          92-px header, so the layer rises above the header's z-50 and
          starts 5 px higher - the scrim dims the header's bottom strip
          and the sheet's r48 corner overlaps it, as in the masters. */}
      <div
        aria-hidden
        onClick={closeCart}
        className={`max-lg:hidden absolute inset-x-0 bottom-0 top-[var(--site-header-h,92px)] bg-[#343435]/50 backdrop-blur-[4px] transition-opacity duration-300 ${
          overlap ? "lg:top-[calc(var(--site-header-h,92px)_-_5px)]" : ""
        } ${open ? "opacity-100" : "opacity-0"}`}
      />

      <aside
        ref={asideRef}
        role="dialog"
        aria-modal="true"
        aria-label="Кошик"
        tabIndex={-1}
        style={
          fitted ? { width: DRAWER_W * fit, borderTopLeftRadius: 48 * fit } : undefined
        }
        className={`absolute bottom-0 right-0 top-0 flex h-dvh w-full flex-col overflow-hidden bg-white transition-[translate,opacity] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] max-lg:motion-reduce:transition-none lg:h-auto lg:w-[576px] lg:max-w-[92vw] lg:rounded-tl-[48px] lg:transition-[translate] lg:will-change-[translate] ${
          overlap
            ? "lg:-bottom-px lg:top-[calc(var(--site-header-h,92px)_-_5px)]"
            : "lg:top-[var(--site-header-h,92px)]"
        } ${
          open
            ? "translate-y-0 opacity-100 lg:translate-x-0"
            : "-translate-y-3 opacity-0 lg:translate-x-full lg:translate-y-0 lg:opacity-100"
        }`}
      >
        {/* Everything inside lives in the master's px; on short windows the
            wrapper is the 576 x 1031 (B2C) / 576 x 1025 (partner) design
            box zoomed to the space it may use (CSS zoom keeps text crisp
            and hit-testing exact, unlike a transform). It also carries the
            sheet's 1-px #8e8e8f stroke («Frame 1010107019», 4929:61874 /
            4204:56703), so the stroke zooms with the content; Figma
            strokes sit inside the box, hence every inner offset below is
            the master's minus 1 px (pl 59 / pr 79 / pt 59 / pb 39, close
            at 23 / 23). */}
        <div
          className="relative flex min-h-0 flex-1 flex-col lg:rounded-tl-[48px] lg:border lg:border-stroke-default"
          style={fitted ? { zoom: fit, width: DRAWER_W, height: designH, flex: "none" } : undefined}
        >
        <button
          ref={closeRef}
          type="button"
          onClick={closeCart}
          aria-label="Закрити кошик"
          className="absolute right-3 top-[9px] z-[1] flex size-12 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 hover:text-brand max-lg:rounded-full max-lg:transition-[color,scale] max-lg:active:scale-90 max-lg:motion-reduce:transition-none max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand lg:right-[23px] lg:top-[23px] lg:size-8"
        >
          <XMarkIcon className="size-6 lg:size-8" />
        </button>

        {/* Phone content twin (lg:hidden); the desktop subtrees below are
            max-lg:hidden. */}
        <CartSheetPhone titleRef={phoneTitleRef} onFocusClose={focusClose} />

        {empty ? (
          <EmptyCart onBrowse={closeCart} />
        ) : (
        <>
        <div className="max-lg:hidden flex min-h-0 flex-1 flex-col gap-6 px-6 pt-8 lg:gap-10 lg:pl-[59px] lg:pr-[79px] lg:pt-[59px]">
          <div className="flex items-center justify-between pt-1">
            <h2 className="text-[24px] font-bold leading-7 tracking-[-0.48px] text-neutral-900">
              Кошик
            </h2>
            <button
              type="button"
              onClick={clear}
              className="flex cursor-pointer items-center gap-[2px] text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
            >
              Очистити
              <XMarkIcon className="size-4 shrink-0" />
            </button>
          </div>

          <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {rows.map((row) => (
              <LeavingRow
                key={row.key}
                leaving={row.leaving}
                entering={row.entering}
                delay={row.delay}
                onDone={() => done(row.key)}
              >
                <CartRow entry={row.item} />
              </LeavingRow>
            ))}
          </div>
        </div>

        <div className="max-lg:hidden flex flex-col gap-6 bg-neutral-900 px-6 py-6 lg:gap-10 lg:pb-[39px] lg:pl-[59px] lg:pr-[79px] lg:pt-10">
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between text-white">
              <span className="text-body-md">Сума замовлення</span>
              <RollingNumber value={subtotal} format={formatPrice} className="text-title-lg text-white" />
            </div>

            {freeDeliveryLimit > 0 && <DeliveryMeter subtotal={subtotal} limit={freeDeliveryLimit} />}

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
                  <RollingNumber value={remaining} format={formatPrice} className="font-medium text-white" />
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
          >
            Оформити замовлення
          </Button>
        </div>
        </>
        )}
        </div>
      </aside>
    </div>
  );
}
