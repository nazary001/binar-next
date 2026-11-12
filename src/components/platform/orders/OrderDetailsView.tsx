"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { usePhone } from "@/components/ui/useMediaQuery";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/CartProvider";
import {
  CabinetPage,
  CabinetPageHead,
  OrderStatusBadge,
  PaymentBadge,
  PaymentCaptionLine,
  SignInPrompt,
  TitleLight,
} from "@/components/platform/ui";
import { CancelOrderModal } from "./CancelOrderModal";
import {
  DETAILS_PROMPT_TEXT,
  daysPlural,
  formatDate,
  formatMoney,
  formatQty,
  formatSum,
  lineSum,
  orderAction,
  MANAGER_MAILTO,
  type Order,
  type OrderAction,
} from "./data";
import {
  DetailsBody,
  DocumentsCard,
  InfoCard,
  ItemsTable,
  PRICE_COLUMN,
  QTY_COLUMN,
  SUM_COLUMN,
  SummaryCard,
  SummaryLink,
  SummaryRow,
  SummaryValue,
  TotalCard,
} from "./detailParts";
import { openDocument } from "./DocumentsModal";
import { OrderNotFound } from "./OrderNotFound";
import { paymentKind } from "./payment";
import { ReturnWizardModal } from "./ReturnWizardModal";
import { useCancelRequest, useOrder, useOrdersToday, useReturnableItems } from "./store";

const COPY = {
  items: "Товари",
  unitPrice: (price: string) => `${price} за од.`,
  due: (date: string) => `до ${date}`,
  requestSent: "Запит на скасування надіслано, очікує підтвердження менеджера",
  toastCancelled: "Замовлення скасовано",
  toastRequest: "Запит на скасування надіслано",
  overdue: (days: number) => `Прострочено на ${days} ${daysPlural(days)}`,
  remainder: (sum: string) => `Залишок ${sum} прострочено`,
  paidLate: "Оплачено із простроченням",
} as const;

// Phones (order-detail spec 2.1, A21 / A28): the overdue / paid-late
// caption of the payment badge on its own line under the badge row (the
// grey notes - due date, paid ratio - are in the summary card below).
// The digit groups keep a no-break space so «2 400,00» never splits.
const NBSP = String.fromCharCode(160);
function attentionCaption(order: Order): string | null {
  const p = order.payment;
  const cancelled = order.status === "cancelled";
  switch (p.kind) {
    case "overdue":
      return cancelled ? null : COPY.overdue(p.days);
    case "partial":
      return p.overdue === undefined || cancelled
        ? null
        : COPY.remainder(formatSum(p.overdue).replace(/(\d) (?=\d)/g, `$1${NBSP}`));
    case "paid":
      return p.late ? COPY.paidLate : null;
    default:
      return null;
  }
}

// «Деталі замовлення» - Figma 5052:56810 (status Нове, «Скасувати
// замовлення») and 5192:77948 (status Отримано, «Оформити повернення»),
// 1710 x 1698 in the platform shell:
//   title block 5052:56816 (238): Back «До замовлень» 182 x 40, H2
//     «Замовлення» + Light «№48291037», the badge row (order badge +
//     payment badge, gap 8); right: the status action (outlined
//     Button/Large: «Скасувати замовлення» 256 / «Оформити повернення»
//     255) and the black «Повторити замовлення» 258, 16 apart;
//   body (pt-16): left 1014 = the products table (cols 592 / 130 / 130 /
//     130, rows 108), «Інформація про доставку» (260) and «Документи
//     замовлення» (348) 26 apart; right 494 = «Підсумок замовлення» (508)
//     over the black total block with the accent «До оплати» (176).
// The left button follows the spec «1. Які статуси -> що доступно»
// (data.ts orderAction): cancel for Нове / Заблоковано, a cancel request
// for В роботі, the «Повернення буде доступне після отримання» hint for
// Відвантажено, the return wizard for Отримано (and Завершено inside the
// return window) while some goods are not yet in an active return
// request (else the hint «Повернення вже оформлено на всі товари»),
// «Звернутись до менеджера» once the window closed, and nothing for
// Скасовано. «Повторити замовлення» puts the lines back into the cart;
// «До оплати» opens the invoice while something is unpaid. A cancelled
// order asks for nothing: no due date in the summary.
// The order is looked up in the company's own history (the session
// payload): an id it does not hold (another company's, a mistyped one)
// gets "Замовлення не знайдено".

// Phones show the hint and the sent request as the status line under the
// badges instead (a disabled pill reads as broken), so the head keeps one
// hugging action there.
function StatusAction({
  order,
  action,
  onCancel,
  onReturn,
  phone,
}: {
  order: Order;
  action: OrderAction;
  onCancel: () => void;
  onReturn: () => void;
  phone: boolean;
}) {
  const pending = useCancelRequest(order.id);
  switch (action.kind) {
    case "cancel":
      if (pending && phone) return null;
      return pending ? (
        <Button variant="outlinedDark" disabled className="max-lg:hidden">
          Запит на скасування надіслано
        </Button>
      ) : (
        <Button variant="outlinedDark" onClick={onCancel}>
          Скасувати замовлення
        </Button>
      );
    case "return":
      return (
        <Button variant="outlinedDark" onClick={onReturn}>
          Оформити повернення
        </Button>
      );
    case "manager":
      return (
        <Button
          variant="outlinedDark"
          href={`${MANAGER_MAILTO}?subject=${encodeURIComponent(`Замовлення №${order.number}`)}`}
        >
          Звернутись до менеджера
        </Button>
      );
    case "hint":
      if (phone) return null;
      return <p className="text-[14px] leading-6 text-neutral-500 max-lg:hidden lg:whitespace-nowrap">{action.text}</p>;
    default:
      return null;
  }
}

export function OrderDetailsView({ id }: { id: string }) {
  const { user } = useAuth();
  const found = useOrder(id);
  const order = user?.type === "b2b" ? found : undefined;
  const returnable = useReturnableItems(order);
  const today = useOrdersToday();
  const cart = useCart();
  const [modal, setModal] = useState<"cancel" | "return" | null>(null);
  const phone = usePhone();
  const pending = useCancelRequest(id);
  const titleRef = useRef<HTMLHeadingElement>(null);

  if (user?.type !== "b2b") return <SignInPrompt title="Деталі замовлення" text={DETAILS_PROMPT_TEXT} />;
  if (!order) return <OrderNotFound />;

  const action = orderAction(order, returnable, today);
  const cancelled = order.status === "cancelled";
  const unpaid = order.payment.kind !== "paid" && !cancelled;
  const invoice = order.documents.find((d) => d.id === "invoice");

  const repeat = () => {
    order.items.forEach((it) => cart.add(it.productId, it.qty, false));
    cart.openCart();
  };

  // Phone head extras (lg:hidden): the attention caption and the status
  // line (the desktop hint / disabled request pill, 16 under the badges).
  const attention = attentionCaption(order);
  const statusLine = action.kind === "hint" ? action.text : action.kind === "cancel" && pending ? COPY.requestSent : null;

  // After a cancel (or a cancel request) the opener is gone or disabled:
  // the focus goes to the page title, and phones get the toast (queued
  // until the sheet has closed).
  const cancelDone = (request: boolean) => {
    showToast(request ? COPY.toastRequest : COPY.toastCancelled);
    requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
  };

  return (
    <CabinetPage>
      <CabinetPageHead
        back={{ label: "До замовлень", href: "/orders" }}
        titleRef={titleRef}
        title={
          <>
            Замовлення <TitleLight line>№{order.number}</TitleLight>
          </>
        }
        meta={
          <>
            <OrderStatusBadge status={order.status} />
            <PaymentBadge kind={paymentKind(order)} />
            {attention && <PaymentCaptionLine tone="attention" text={attention} className="basis-full lg:hidden" />}
            {statusLine && (
              <p className="mt-2 basis-full text-[14px] leading-5 text-neutral-600 lg:hidden">{statusLine}</p>
            )}
          </>
        }
        actions={
          <>
            <StatusAction
              order={order}
              action={action}
              onCancel={() => setModal("cancel")}
              onReturn={() => setModal("return")}
              phone={phone}
            />
            <Button onClick={repeat}>Повторити замовлення</Button>
          </>
        }
      />

      <DetailsBody
        left={
          <>
            <ItemsTable
              items={order.items}
              columns={[QTY_COLUMN, PRICE_COLUMN, SUM_COLUMN]}
              phone={{
                title: COPY.items,
                line: (it) => ({
                  parts: [formatQty(it.qty, it.unit), COPY.unitPrice(formatMoney(it.price))],
                  amount: formatMoney(lineSum(it)),
                }),
              }}
            />
            <InfoCard
              title="Інформація про доставку"
              fields={[
                { label: "Місто", value: order.delivery.city },
                { label: "Варіант доставки", value: order.delivery.method },
              ]}
              note={order.delivery.note}
            />
            <DocumentsCard title="Документи замовлення" documents={order.documents} />
          </>
        }
        right={
          <>
            <SummaryCard
              title="Підсумок замовлення"
              compact={[
                { id: "date", label: "Дата замовлення", value: formatDate(order.date) },
                { id: "author", label: "Створив замовлення", value: order.createdBy },
                { id: "counterparty", label: "Контрагент", value: order.counterparty },
                { id: "payment-type", label: "Тип оплати", value: order.paymentType },
                ...(cancelled
                  ? []
                  : [{ id: "due", label: "Термін оплати", value: COPY.due(formatDate(order.paymentDue)) }]),
              ]}
              groups={[
                <>
                  <SummaryRow label="Статус замовлення" info>
                    <OrderStatusBadge status={order.status} />
                  </SummaryRow>
                  <SummaryRow label="Номер замовлення">
                    <SummaryValue>{order.number}</SummaryValue>
                  </SummaryRow>
                  <SummaryRow label="Дата замовлення">
                    <SummaryValue>{formatDate(order.date)}</SummaryValue>
                  </SummaryRow>
                  <SummaryRow label="Створив замовлення">
                    <SummaryLink>{order.createdBy}</SummaryLink>
                  </SummaryRow>
                  <SummaryRow label="Контрагент">
                    <SummaryLink clip>{order.counterparty}</SummaryLink>
                  </SummaryRow>
                </>,
                <>
                  <SummaryRow label="Статус оплати" info>
                    <PaymentBadge kind={paymentKind(order)} />
                  </SummaryRow>
                  <SummaryRow label="Тип оплати">
                    <SummaryValue tight>{order.paymentType}</SummaryValue>
                  </SummaryRow>
                  {!cancelled && (
                    <SummaryRow label="Термін оплати">
                      <SummaryValue>до {formatDate(order.paymentDue)}</SummaryValue>
                    </SummaryRow>
                  )}
                </>,
              ]}
            />
            <TotalCard
              label="Сума замовлення"
              value={formatMoney(order.total)}
              action={
                unpaid && invoice
                  ? { label: "До оплати", onClick: () => openDocument(invoice) }
                  : undefined
              }
            />
          </>
        }
      />

      {action.kind === "cancel" && (
        <CancelOrderModal
          order={order}
          open={modal === "cancel"}
          onClose={() => setModal(null)}
          request={action.request}
          onDone={cancelDone}
        />
      )}
      {action.kind === "return" && (
        <ReturnWizardModal
          order={order}
          items={returnable}
          open={modal === "return"}
          onClose={() => setModal(null)}
        />
      )}
    </CabinetPage>
  );
}
