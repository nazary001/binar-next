"use client";
/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { XMarkIcon } from "@/components/catalog/icons";
import { formatPrice, type Product } from "@/components/catalog/data";
import { QtyStepper } from "@/components/catalog/ProductCard";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { usePhone } from "@/components/ui/useMediaQuery";
import { useCart } from "./CartProvider";
import { soldOutPhrase, type StockIssue } from "./data";
import { CheckCircleIcon, InfoBadgeIcon } from "./icons";
import { StockSheetPhone } from "./StockSheetPhone";
import { useFitZoom } from "./useFitZoom";
import { useModalBehavior } from "./useModalBehavior";

// «Деякі товари закінчилися» — Figma 4329:40304 / 4329:40498: a 1286-px
// centred dialog (white, 1-px #8e8e8f ring, r48, p-60 with the ring drawn
// inside the gutter, so CSS pads 59 + 1px border = content 1166 at x 60; 40-px rhythm)
// over the blurred scrim. Header tile (52 px, #ffe0cc, 28-px brand info
// glyph) + Caption/Large title + 32-px close; Body/Large intro; the
// «Залишилось вирішити: N з M» row with the small solid «Замінити всі»;
// the #f8f8f8 r24 table (dark head row, 0.5-px dividers, 60-px product
// thumbs, stepper, price, outlined «Замінити» that turns into the green
// «Замінено» once swapped); two full-width Button/Large at the bottom.

// «Frame 1010107063» — the 307-px product mini card in a table cell:
// 60-px r12 photo (in colour even for the sold-out line: 4329:40406 is a
// plain object-cover fill), Title/Extra Small name «title, volume,
// brand» and the uppercase availability caption. 307 is fixed in the master (the
// name wraps at 231 px into the two drawn lines); the phone cards let
// it take the card width.
function MiniProduct({
  product,
  out,
  className = "w-full",
}: {
  product: Product;
  out: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span className="relative block size-[60px] shrink-0 overflow-clip rounded-xl bg-bg-product">
        <img
          src={product.image}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      </span>
      <div className="flex min-w-0 flex-col gap-[7px]">
        <p className="text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900">
          {/* «Шампунь для волосся і тіла, 40мл, Botanica» - the master
              writes the volume without a space before the unit. */}
          {product.title}, {product.volume.replace(/(\d)\s+(мл|л|г|кг)$/u, "$1$2")},{" "}
          {product.brand}
        </p>
        <p
          className={`text-[14px] font-medium uppercase leading-6 ${
            out ? "text-negative" : "text-positive"
          }`}
        >
          {out ? "Немає в наявності" : "В наявності"}
        </p>
      </div>
    </div>
  );
}

// The master's Divider (4329:40431, 1166 x 0.5) is its own 0.5-px row
// whose line runs 16 px in from both edges (M16..1150). Rows after the
// first carry it as a background band on their top 0.5 px and add those
// 0.5 px to the top padding, so the next row starts at 123.5 and the
// three-row table is 434 tall like the frame (a collapsed table border
// would round the line up to 1 px).
const DIVIDER =
  "bg-[linear-gradient(var(--color-stroke-subtle),var(--color-stroke-subtle))] bg-[length:calc(100%-32px)_0.5px] bg-[position:16px_0] bg-no-repeat";

function IssueRow({ issue, first }: { issue: StockIssue; first: boolean }) {
  const { resolveIssue, setIssueQty, unitPrice } = useCart();
  const alt = issue.replacement;
  return (
    <tr className={first ? "" : `${DIVIDER} [&>td]:pt-[24.5px]`}>
      <td className="py-6 pl-8 pr-4 align-middle">
        <MiniProduct product={issue.product} out className="w-[307px] max-w-full" />
      </td>
      <td className="px-4 py-6 align-middle">
        {alt ? (
          <MiniProduct product={alt} out={false} className="w-[307px] max-w-full" />
        ) : (
          <span className="text-body-sm text-neutral-500">Альтернативи немає</span>
        )}
      </td>
      <td className="px-4 py-6 align-middle">
        {alt && (
          <QtyStepper
            size="sm"
            slot="hug"
            qty={issue.qty}
            onQty={(next) => setIssueQty(issue.lineId, next)}
            disabled={issue.resolved}
            animate
          />
        )}
      </td>
      {/* «Component 2» (4329:40422): SemiBold 16/24 with the sign - the
          screenshot reads «65,79 ₴» (the head says «Ціна, ₴» too). */}
      <td className="whitespace-nowrap px-4 py-6 align-middle text-[16px] font-semibold leading-6 text-neutral-900">
        {alt ? (
          <RollingNumber value={Math.round(unitPrice(alt) * issue.qty * 100) / 100} format={formatPrice} />
        ) : (
          "-"
        )}
      </td>
      {/* Action cell 152 + the row's 16: the outlined «Замінити» (119)
          fills the padded box; the resolved «Замінено» (16-px check, 4,
          label = 93) is centred in it (4329:40621 at x+13). */}
      <td className="py-6 pl-4 pr-8 text-center align-middle">
        {issue.resolved ? (
          // A block-level flex (not inline-flex): an inline box would sit
          // on the cell's 24-px line box and land 1.5 px high.
          <span className="mx-auto flex w-fit items-center gap-1 text-button-md text-positive">
            <CheckCircleIcon className="size-4 shrink-0" />
            {alt ? "Замінено" : "Видалено"}
          </span>
        ) : (
          <Button size="small" variant="outlinedDark" onClick={() => resolveIssue(issue.lineId)}>
            {alt ? "Замінити" : "Видалити"}
          </Button>
        )}
      </td>
    </tr>
  );
}

function StockDialog() {
  const { issues, dismissIssues, resolveAll, closeCart } = useCart();
  const router = useRouter();
  const open = issues !== null && issues.length > 0;
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const total = issues?.length ?? 0;
  const left = issues?.filter((i) => !i.resolved).length ?? 0;
  // Master height (4329:40379, 3 rows = 880): 60 + 52 + 40 + 28 + 40 + 42 +
  // 32 + head 64 + rows x 123 + 0.5-px dividers + 40 + 52 + 60. On a
  // shorter desktop window the dialog is zoomed to fit inside 40-px
  // gutters, like the frame fitted to the screen, instead of scrolling.
  const rows = Math.max(1, total);
  const fit = useFitZoom(510 + 123 * rows + 0.5 * (rows - 1), 80);

  useModalBehavior({
    open,
    onClose: dismissIssues,
    container: dialogRef,
    initial: closeRef,
  });

  if (!open || !issues) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8">
      <div
        aria-hidden
        onClick={dismissIssues}
        className="absolute inset-0 bg-[#343435]/50 backdrop-blur-[4px]"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-modal-title"
        tabIndex={-1}
        style={fit < 1 ? { zoom: fit } : undefined}
        className="scrollbar-hidden relative flex max-h-full w-[min(1286px,100%)] flex-col gap-6 overflow-y-auto overscroll-contain rounded-[32px] border border-stroke-default bg-white p-6 sm:p-10 lg:gap-10 lg:rounded-[48px] lg:p-[59px]"
      >
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4 lg:gap-6">
            <span className="flex size-[52px] shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <InfoBadgeIcon className="size-7" />
            </span>
            <h2
              id="stock-modal-title"
              className="text-[24px] font-bold leading-7 tracking-[-0.48px] text-neutral-900 lg:text-[32px] lg:tracking-[-0.64px]"
            >
              Деякі товари закінчилися
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={dismissIssues}
            aria-label="Закрити"
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 hover:text-brand"
          >
            <XMarkIcon className="size-8" />
          </button>
        </div>

        <p className="text-body-md text-neutral-900">
          Схоже, поки ви збирали кошик, {soldOutPhrase(total)}. Ми підібрали схожі
          товари, які є в наявності.
        </p>

        <div className="flex flex-col gap-6 lg:gap-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="flex items-center gap-2 text-body-md text-neutral-900">
              Залишилось вирішити:
              <span className="text-title-md">
                {left} з {total}
              </span>
            </p>
            <Button size="small" onClick={resolveAll} disabled={left === 0}>
              Замінити всі
            </Button>
          </div>

          <div className="overflow-x-auto rounded-3xl bg-bg-subtle">
            {/* Desktop table (the modal is always the 1286-px master from
                640 up, so the table is 1166). Fixed layout with the
                master's columns: 356 / 356 / 140 / 130 / 152, the first
                and last carrying the row's 16-px gutter (Figma pads the
                row, then the cell) = 372 / auto (356) / 140 / 130 / 168.
                Phones get StockSheetPhone instead of this dialog. */}
            <table className="hidden w-full min-w-[1000px] table-fixed border-collapse lg:table">
              <colgroup>
                <col className="w-[372px]" />
                <col />
                <col className="w-[140px]" />
                <col className="w-[130px]" />
                <col className="w-[168px]" />
              </colgroup>
              <thead>
                <tr className="bg-neutral-800 text-left text-[14px] font-semibold leading-6 text-white">
                  <th scope="col" className="pb-4 pl-8 pr-4 pt-6 font-semibold">
                    Товар
                  </th>
                  <th scope="col" className="px-4 pb-4 pt-6 font-semibold">
                    Альтернативна пропозиція
                  </th>
                  <th scope="col" className="px-4 pb-4 pt-6 font-semibold">
                    Кількість
                  </th>
                  <th scope="col" className="px-4 pb-4 pt-6 font-semibold">
                    Ціна, ₴
                  </th>
                  <th scope="col" className="pb-4 pl-4 pr-8 pt-6">
                    <span className="sr-only">Дія</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue, i) => (
                  <IssueRow key={issue.lineId} issue={issue} first={i === 0} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
          <Button
            variant="outlinedDark"
            fullWidth
            href="/catalog"
            onClick={() => {
              dismissIssues();
              closeCart();
            }}
          >
            Повернутись до каталогу
          </Button>
          <Button
            variant="accent"
            fullWidth
            onClick={() => {
              dismissIssues();
              router.push("/checkout");
            }}
            disabled={left > 0}
          >
            Оформити замовлення
          </Button>
        </div>
      </div>
    </div>
  );
}

// Desktop (>= 640): the 1286-px dialog above. Phones: the full-screen
// stock sheet for every issue count (cart spec 2.4, A-9). The switch is
// JS (the dialog mounts only while open, never during SSR); rotating
// across 640 while open swaps the two, the issues live in CartProvider.
export function StockModal() {
  const phone = usePhone();
  return phone ? <StockSheetPhone /> : <StockDialog />;
}
