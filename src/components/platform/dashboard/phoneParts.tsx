"use client";

import Link from "next/link";
import type { Ref } from "react";
import { ChevronSideIcon } from "@/components/catalog/icons";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FitText } from "@/components/ui/FitText";
import { LoadMore } from "@/components/ui/LoadMore";
import type { Order } from "../orders/data";
import { paymentKind } from "../orders/payment";
import {
  LIST_ROW,
  ListPanel,
  MailIcon,
  OrderStatusBadge,
  PaymentBadge,
  PaymentCaptionLine,
  PhoneIcon,
  RecordRow,
} from "../ui";
import { PersonFilledIcon } from "./icons";
import { MANAGER, dueParts, formatDate, formatSum, paymentCaption, type UpcomingPayment } from "./data";

// Phone layer of /dashboard (< 640 px; dashboard spec 2.6 - 2.9, template
// T2): the recent orders as a RecordRow panel (A7) with the trailing
// "Усі замовлення" link, the payments as one white r32 list panel with
// the load-more / collapse block (A9), the manager card, and the TR-24
// empty panels (A14). Every block here renders below 640 only (the
// callers keep the desktop trees next to them, `max-lg:hidden`).

const COPY = {
  ordersList: "Останні замовлення",
  paymentsList: "Найближчі платежі",
  allOrders: "Усі замовлення",
  orderNumber: (number: string) => `№${number}`,
  orderLink: (number: string) => `Деталі замовлення №${number}`,
  ordersEmptyTitle: "Замовлень ще немає",
  ordersEmptyText: "Оформіть перше замовлення, щоб воно з’явилося у цьому списку.",
  ordersFilteredEmpty: "Замовлень цього контрагента ще немає",
  paymentsEmpty: "Найближчих платежів немає",
  due: "до",
  invoice: "Рахунок №",
  overdue: "Протерміновано",
  contacts: "Контакти менеджера",
  writeManager: "Написати менеджеру",
} as const;

// Digit groups glued with NBSP (written via the code point), so a wrapping
// caption never splits "6 336,10" (dashboard SN-10 / DB-24, phone only).
const NBSP = String.fromCharCode(160);
const keepGroups = (text: string) => text.replace(/(\d) (?=\d)/g, `$1${NBSP}`);

// ------------------------------------------------------------ Orders

// Spec 2.6 / A7: id over date + the row chevron, the sum (22/28
// SemiBold), the order badge + the bare payment chip (wrapping), the one
// payment caption line 8 below them (A28); a cancelled order has none.
export function RecentOrdersPhoneList({ orders }: { orders: Order[] }) {
  return (
    <ListPanel label={COPY.ordersList} className="lg:hidden">
      {orders.map((order) => {
        const caption = paymentCaption(order);
        return (
          <RecordRow
            key={order.id}
            id={COPY.orderNumber(order.number)}
            linkLabel={COPY.orderLink(order.number)}
            href={`/orders/${order.id}`}
            date={formatDate(order.date)}
            amount={formatSum(order.total)}
            badges={
              <>
                <OrderStatusBadge status={order.status} />
                <PaymentBadge kind={paymentKind(order)} />
              </>
            }
            caption={caption ? <PaymentCaptionLine tone={caption.tone} text={keepGroups(caption.text)} /> : undefined}
          />
        );
      })}
    </ListPanel>
  );
}

// Trailing link under the orders panel: 24 below, right-aligned (TR-06).
export function AllOrdersPhoneLink() {
  return (
    <div className="mt-6 flex justify-end lg:hidden">
      <Button href="/orders" size="small" variant="outlinedDark" arrow>
        {COPY.allOrders}
      </Button>
    </div>
  );
}

// TR-24 panel in place of the orders list: the fresh cabinet (A: title +
// text; the head already offers "Зробити замовлення", so no button - A14
// action rule) or a counterparty without orders (C: title only).
export function RecentOrdersPhoneEmpty({ filtered }: { filtered: boolean }) {
  return (
    <EmptyState
      surface="panel"
      titleAs="h3"
      title={filtered ? COPY.ordersFilteredEmpty : COPY.ordersEmptyTitle}
      text={filtered ? undefined : COPY.ordersEmptyText}
      className="lg:hidden"
    />
  );
}

// ---------------------------------------------------------- Payments

// The tight list panel: py 8 on the panel, rows py 16 between the 1-px
// #d2d2d2 lines (TR-07 inset + the TR-25 file-row rhythm); the ListRow
// press tint and inset focus ring are kept.
const PAY_ROW = LIST_ROW.replace(" py-6 ", " py-4 ");

// Spec 2.7: the date tile fixed 64 wide (desktop tile internals kept),
// 16, the column: amount (FitText, never under the chevron) + the 24
// chevron top-right, the invoice line, the "Протерміновано" chip for an
// overdue one (the red tile + chip carry the state; no pink row fill).
function PaymentPhoneRow({ payment, linkRef }: { payment: UpcomingPayment; linkRef?: Ref<HTMLAnchorElement> }) {
  const { overdue } = payment;
  const { day, month } = dueParts(payment.due);
  return (
    <li className={PAY_ROW}>
      <Link ref={linkRef} href={`/orders/${payment.orderId}`} data-row-link="" className="flex items-start gap-4 outline-none">
        <span
          className={`flex w-16 shrink-0 flex-col items-center gap-1 overflow-clip rounded-xl py-2 text-center ${
            overdue ? "bg-negative" : "bg-neutral-800"
          }`}
        >
          <span
            className={`w-full text-[12px] font-medium leading-3 tracking-[0.15px] ${overdue ? "text-white" : "text-brand"}`}
          >
            {COPY.due}
          </span>
          <span className="flex flex-col items-center whitespace-nowrap">
            <span className="mb-[-2px] text-[24px] font-semibold leading-7 tracking-[-0.48px] text-white">{day}</span>
            <span className="text-[14px] font-medium uppercase leading-6 text-white/70">{month}</span>
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col items-start">
          <span className="flex w-full items-start gap-2">
            <FitText
              min={16}
              className="min-w-0 flex-1 whitespace-nowrap text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900"
            >
              {formatSum(payment.amount)}
            </FitText>
            <ChevronSideIcon mirrored className="mt-0.5 size-6 shrink-0 text-neutral-900" />
          </span>
          <span className="mt-1 whitespace-nowrap text-[14px] leading-5">
            <span className="text-neutral-500">{COPY.invoice}</span>{" "}
            <span className="font-medium text-neutral-900">{payment.invoice}</span>
          </span>
          {overdue && (
            <span className="mt-2 inline-flex h-[38px] shrink-0 items-center justify-center whitespace-nowrap rounded-[40px] bg-[#ffbfba] px-3 py-1 text-[14px] font-medium leading-[22px] text-negative">
              {COPY.overdue}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

// Panel + load-more (48 below; "Показати більше" adds `step`, then
// "Приховати" collapses back to the first batch - dashboard only, A9) or
// the TR-24 panel B when nothing is due. `links` collects the row links
// so the first newly shown row takes the focus after a batch.
export function PaymentsPhone({
  payments,
  shown,
  firstBatch,
  onMore,
  onLess,
  links,
}: {
  payments: UpcomingPayment[];
  shown: number;
  firstBatch: number;
  onMore: () => void;
  onLess: () => void;
  links: { current: (HTMLAnchorElement | null)[] };
}) {
  if (payments.length === 0) {
    return <EmptyState surface="panel" titleAs="h3" title={COPY.paymentsEmpty} className="lg:hidden" />;
  }
  const visible = payments.slice(0, shown);
  const before = visible.length;
  return (
    <>
      <ListPanel label={COPY.paymentsList} className="py-2 lg:hidden">
        {visible.map((p, i) => (
          <PaymentPhoneRow
            key={p.id}
            payment={p}
            linkRef={(el) => {
              links.current[i] = el;
            }}
          />
        ))}
      </ListPanel>
      <LoadMore
        className="mt-12 lg:hidden"
        shown={before}
        total={payments.length}
        onMore={onMore}
        onLess={payments.length > firstBatch ? onLess : undefined}
        focusAfterLast={() => links.current[before] ?? null}
      />
    </>
  );
}

// ----------------------------------------------------------- Manager

// Spec 2.8: white r32 card p 24: the 52 r12 tile + name (Title Small) /
// role (sentence case), the two 44-px contact rows between 1-px lines,
// the full-width Button/Small.
export function ManagerCardPhone() {
  return (
    <div className="flex flex-col rounded-[32px] bg-white p-6 lg:hidden">
      <div className="flex items-center gap-4">
        <span className="flex size-[52px] shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white">
          <PersonFilledIcon className="size-9" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-title-sm text-neutral-900">{MANAGER.name}</p>
          <p className="text-[14px] leading-5 text-neutral-500 first-letter:uppercase">{MANAGER.role}</p>
        </div>
      </div>
      <ul role="list" aria-label={COPY.contacts} className="mt-6 flex flex-col border-y border-stroke-subtle">
        <li>
          <a
            href={`tel:${MANAGER.phoneHref}`}
            className="flex min-h-11 items-center gap-3 py-2.5 text-[16px] leading-6 text-neutral-900 transition-colors active:text-brand motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-brand"
          >
            <PhoneIcon className="size-5 shrink-0" />
            <span className="whitespace-nowrap">{MANAGER.phone}</span>
          </a>
        </li>
        <li className="border-t border-stroke-subtle">
          <a
            href={`mailto:${MANAGER.email}`}
            className="flex min-h-11 items-center gap-3 py-2.5 text-[16px] leading-6 text-neutral-900 transition-colors active:text-brand motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-brand"
          >
            <MailIcon className="size-5 shrink-0" />
            <span className="min-w-0">{MANAGER.email}</span>
          </a>
        </li>
      </ul>
      <Button href={`mailto:${MANAGER.email}`} size="small" fullWidth className="mt-6">
        {COPY.writeManager}
      </Button>
    </div>
  );
}
