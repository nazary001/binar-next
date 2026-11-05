"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PRODUCT_LINE_TOTAL, ProductLine } from "@/components/ui/ProductLine";
import { Sheet } from "@/components/ui/Sheet";
import { QtyStepper } from "@/components/catalog/QtyStepper";
import { formatPrice } from "@/components/catalog/data";
import { useCart } from "./CartProvider";
import { lineMeta, soldOutPhrase, type StockIssue } from "./data";
import { CheckCircleIcon } from "./icons";

const COPY = {
  title: "Деякі товари закінчилися",
  shortTitle: "Наявність товарів",
  close: "Закрити перевірку наявності",
  intro: (soldOut: string) =>
    `Схоже, поки ви збирали кошик, ${soldOut}. Ми підібрали схожі товари, які є в наявності.`,
  resolveAll: "Замінити всі",
  soldOut: "Немає в наявності",
  alternative: "Альтернатива",
  noAlternative: "Альтернативи немає",
  replace: "Замінити",
  remove: "Видалити",
  replaced: "Замінено",
  removed: "Видалено",
  left: "Залишилось вирішити:",
  of: "з",
  back: "Повернутись до каталогу",
  checkout: "Оформити замовлення",
} as const;

// The checkout page's lines title (C-checkout CheckoutLines h2, tabIndex
// -1): the focus target when a stock check started by the checkout gate
// is closed.
const CHECKOUT_LINES_TITLE = "[data-checkout-lines-title]";

// Phone stock check (cart spec 2.4, template T5f, A-9: a full-screen sheet
// for every issue count): the Sheet atom with the dialog title in the bar
// ("Наявність товарів" below 375), the intro + the "Замінити всі" text
// action, the issue rows between 1-px #d2d2d2 lines (the sold-out line,
// its in-stock alternative, stepper + total, and the resolve slot that
// keeps its 42 px when "Замінити" turns into "Замінено"), and the footer:
// the live "Залишилось вирішити: N з M" + the two pills stacked 8 apart
// (A-6 exception: the labels need ~211 px each). Mounted only while open
// (enter motion only, unmounts instantly like the desktop dialog).
export function StockSheetPhone() {
  const {
    issues,
    issuesFrom,
    dismissIssues,
    resolveIssue,
    resolveAll,
    setIssueQty,
    unitPrice,
    openCart,
    closeCart,
  } = useCart();
  const router = useRouter();
  const open = issues !== null && issues.length > 0;
  const total = issues?.length ?? 0;
  const left = issues?.filter((i) => !i.resolved).length ?? 0;

  // After a "Замінити" / "Замінити всі" the pressed button unmounts or
  // turns disabled: focus moves to the next unresolved row's action, else
  // to "Оформити замовлення" (now enabled), without scrolling the sheet.
  const actionRefs = useRef(new Map<string, HTMLDivElement>());
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const pendingFocus = useRef(false);
  useEffect(() => {
    if (!pendingFocus.current || !issues) return;
    pendingFocus.current = false;
    const next = issues.find((i) => !i.resolved);
    const slot = next ? actionRefs.current.get(next.lineId) : ctaRef.current;
    slot?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  });

  if (!open || !issues) return null;

  // Cross / Escape: from the cart the user returns to the cart sheet they
  // were reviewing; from the PDP the check just closes; from the checkout
  // gate it closes and focus lands on the checkout lines' title (after the
  // sheet's own focus restore).
  const close = () => {
    dismissIssues();
    if (issuesFrom === "cart") {
      openCart();
    } else if (issuesFrom === "checkout") {
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(CHECKOUT_LINES_TITLE)?.focus({ preventScroll: true }),
      );
    }
  };

  return (
    <Sheet
      open
      onClose={close}
      title={COPY.title}
      shortTitle={COPY.shortTitle}
      closeLabel={COPY.close}
      closeOnDesktop={false}
      footer={
        <>
          <p role="status" className="text-body-sm text-neutral-500">
            {COPY.left}{" "}
            <span className="whitespace-nowrap font-medium text-neutral-900">
              {left} {COPY.of} {total}
            </span>
          </p>
          <div className="flex flex-col gap-2">
            <div>
              <Button
                variant="outlinedDark"
                size="small"
                fullWidth
                href="/catalog"
                onClick={() => {
                  dismissIssues();
                  closeCart();
                }}
              >
                {COPY.back}
              </Button>
            </div>
            <div ref={ctaRef}>
              <Button
                variant="accent"
                size="small"
                fullWidth
                disabled={left > 0}
                onClick={() => {
                  dismissIssues();
                  router.push("/checkout");
                }}
              >
                {COPY.checkout}
              </Button>
            </div>
          </div>
        </>
      }
    >
      <div className="flex flex-col">
        <p className="text-body-md text-neutral-800">{COPY.intro(soldOutPhrase(total))}</p>
        <button
          type="button"
          onClick={() => {
            pendingFocus.current = true;
            resolveAll();
          }}
          disabled={left === 0}
          className="-mb-3 -mr-2 mt-1 flex h-11 cursor-pointer items-center self-end rounded-full px-2 text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand active:text-brand disabled:cursor-default disabled:text-neutral-300 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {COPY.resolveAll}
        </button>
        <ul
          role="list"
          className="mt-6 flex shrink-0 flex-col divide-y divide-stroke-subtle border-y border-stroke-subtle"
        >
          {issues.map((issue) => (
            <IssueRowPhone
              key={issue.lineId}
              issue={issue}
              total={
                issue.replacement
                  ? formatPrice(Math.round(unitPrice(issue.replacement) * issue.qty * 100) / 100)
                  : ""
              }
              onQty={(next) => setIssueQty(issue.lineId, next)}
              onResolve={() => {
                pendingFocus.current = true;
                resolveIssue(issue.lineId);
              }}
              actionRef={(el) => {
                if (el) actionRefs.current.set(issue.lineId, el);
                else actionRefs.current.delete(issue.lineId);
              }}
            />
          ))}
        </ul>
      </div>
    </Sheet>
  );
}

// One issue: the sold-out line and its alternative as two nested
// ProductLines (as="div": the li owns the 24-px padding, 16 between
// them), not links (the desktop MiniProduct is not one); the stepper +
// the alternative's total; the 42-px resolve slot.
function IssueRowPhone({
  issue,
  total,
  onQty,
  onResolve,
  actionRef,
}: {
  issue: StockIssue;
  total: string;
  onQty: (next: number) => void;
  onResolve: () => void;
  actionRef: (el: HTMLDivElement | null) => void;
}) {
  const alt = issue.replacement;
  return (
    <li className="flex flex-col gap-4 py-6">
      <ProductLine
        as="div"
        image={issue.product.image}
        title={issue.product.title}
        meta={lineMeta(issue.product)}
        status={{ label: COPY.soldOut, tone: "negative" }}
      />
      {alt ? (
        <>
          <ProductLine
            as="div"
            image={alt.image}
            title={alt.title}
            meta={lineMeta(alt)}
            status={{ label: COPY.alternative, tone: "brand" }}
          />
          <div className="flex items-center justify-between gap-4">
            <QtyStepper size="sm" slot="fixed" qty={issue.qty} onQty={onQty} disabled={issue.resolved} />
            <span className={PRODUCT_LINE_TOTAL}>{total}</span>
          </div>
        </>
      ) : (
        <p className="text-body-sm text-neutral-500">{COPY.noAlternative}</p>
      )}
      <div ref={actionRef} className="h-[42px]">
        {issue.resolved ? (
          <span className="flex h-full items-center justify-center gap-1 text-button-md text-positive">
            <CheckCircleIcon className="size-4 shrink-0" />
            {alt ? COPY.replaced : COPY.removed}
          </span>
        ) : (
          <Button size="small" variant="outlinedDark" fullWidth onClick={onResolve}>
            {alt ? COPY.replace : COPY.remove}
          </Button>
        )}
      </div>
    </li>
  );
}
