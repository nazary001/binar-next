"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import { isDemoAccount } from "@/components/auth/demo";
import { useCart } from "@/components/cart/CartProvider";
import {
  CabinetPage,
  CabinetPageHead,
  OrderStatusBadge,
  PaymentBadge,
  SignInPrompt,
  TitleLight,
} from "@/components/platform/ui";
import { CancelOrderModal } from "./CancelOrderModal";
import {
  DETAILS_PROMPT_TEXT,
  formatDate,
  formatMoney,
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
import { paymentKind } from "./payment";
import { ReturnWizardModal } from "./ReturnWizardModal";
import { useCancelRequest, useOrder, useReturnableItems } from "./store";

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
// The placeholder history belongs to the demo partner (as on the list):
// any other partner gets «Замовлення не знайдено» for these ids.

function StatusAction({
  order,
  action,
  onCancel,
  onReturn,
}: {
  order: Order;
  action: OrderAction;
  onCancel: () => void;
  onReturn: () => void;
}) {
  const pending = useCancelRequest(order.id);
  switch (action.kind) {
    case "cancel":
      return pending ? (
        <Button variant="outlinedDark" disabled>
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
      return <p className="text-[14px] leading-6 text-neutral-500 lg:whitespace-nowrap">{action.text}</p>;
    default:
      return null;
  }
}

export function OrderDetailsView({ id }: { id: string }) {
  const { user } = useAuth();
  const found = useOrder(id);
  const order = user?.type === "b2b" && isDemoAccount(user) ? found : undefined;
  const returnable = useReturnableItems(order);
  const cart = useCart();
  const [modal, setModal] = useState<"cancel" | "return" | null>(null);

  if (user?.type !== "b2b") return <SignInPrompt title="Деталі замовлення" text={DETAILS_PROMPT_TEXT} />;
  if (!order) {
    return (
      <CabinetPage>
        <CabinetPageHead back={{ label: "До замовлень", href: "/orders" }} title="Замовлення не знайдено" />
      </CabinetPage>
    );
  }

  const action = orderAction(order, returnable);
  const cancelled = order.status === "cancelled";
  const unpaid = order.payment.kind !== "paid" && !cancelled;
  const invoice = order.documents.find((d) => d.id === "invoice");

  const repeat = () => {
    order.items.forEach((it) => cart.add(it.productId, it.qty, false));
    cart.openCart();
  };

  return (
    <CabinetPage>
      <CabinetPageHead
        back={{ label: "До замовлень", href: "/orders" }}
        title={
          <>
            Замовлення <TitleLight>№{order.number}</TitleLight>
          </>
        }
        meta={
          <>
            <OrderStatusBadge status={order.status} />
            <PaymentBadge kind={paymentKind(order)} />
          </>
        }
        actions={
          <>
            <StatusAction
              order={order}
              action={action}
              onCancel={() => setModal("cancel")}
              onReturn={() => setModal("return")}
            />
            <Button onClick={repeat}>Повторити замовлення</Button>
          </>
        }
      />

      <DetailsBody
        left={
          <>
            <ItemsTable items={order.items} columns={[QTY_COLUMN, PRICE_COLUMN, SUM_COLUMN]} />
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
