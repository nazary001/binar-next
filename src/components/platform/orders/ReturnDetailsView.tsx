"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { TIPS } from "@/components/catalog/tips";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  CabinetPage,
  CabinetPageHead,
  ConfirmModal,
  ReturnStatusBadge,
  SignInPrompt,
  TitleLight,
} from "@/components/platform/ui";
import {
  DETAILS_PROMPT_TEXT,
  RETURN_WITHDRAWABLE,
  formatDate,
  formatMoney,
  formatQty,
  lineSum,
  returnDocuments,
  returnTotal,
  type OrderItem,
} from "./data";
import {
  DetailsBody,
  DocumentsCard,
  InfoCard,
  ItemsTable,
  QTY_COLUMN,
  SUM_COLUMN,
  SummaryCard,
  SummaryLink,
  SummaryRow,
  SummaryValue,
  TotalCard,
  type ItemColumn,
} from "./detailParts";
import { NotFoundPanel } from "./OrderNotFound";
import { useOrders, useReturn, withdrawReturn } from "./store";

const COPY = {
  back: "До замовлень",
  notFound: "Повернення не знайдено",
  notFoundText: "Можливо, запит створив інший партнер або посилання застаріло.",
  toReturns: "До повернень",
  items: "Товари",
  reason: "Причина: ",
  orderNumber: "Номер замовлення",
  orderDate: "Дата замовлення",
  returnDate: "Дата повернення",
  author: "Створив замовлення",
  counterparty: "Контрагент",
  withdrawn: "Запит на повернення скасовано",
  withdraw: "Скасувати повернення",
  // The confirm pill below 375: the full label overflows the 224-px card.
  withdrawShort: "Скасувати",
} as const;

// «Деталі повернення» - Figma 5192:79067 (1710 x 1401, ctx/5192-79072.md)
// in the platform shell:
//   title block 5192:79073 (238): Back «До замовлень», H2 «Замовлення» +
//     Light «№48291037», the return badge (117 «На розгляді»); right the
//     outlined Button/Large «Скасувати повернення» (256 x 52);
//   body: left 1014 = the returned lines (cols 522 Товар / 130 Кількість /
//     130 Сума / 200 Причина повернення, 3 rows of 108 = 389), «Деталі
//     повернення» (180: «Бажане рішення» + «Варіанти зворотньої
//     доставки») and «Документи повернення» (348); right 494 = «Підсумок»
//     (346: return badge, order number / date / author / counterparty)
//     over the black «Сума повернення» (92).
// «Скасувати повернення» shows while the request can still be withdrawn
// (Створено, На розгляді, Погоджено) and asks for confirmation (the
// ConfirmModal 4929:66214 pattern; the master has no frame for it). Its
// confirm button keeps the master's black fill (Button 4929:66377
// #1d1d1f), like every other ConfirmModal on the site.
// The request is looked up in the company's own history (the session
// payload): an id it does not hold gets "Повернення не знайдено".
// Phones (returns spec 2.2, template T3): the same blocks as the order
// page - summary key / value rows (with the order number as a link and
// the return date) + the dark total first, the returned lines with their
// reason, the details rows, the document rows; after a withdrawal the
// focus goes to the title (the opener is gone) and phones get a toast.

// A returned line = the order line with the returned quantity (so the
// shared «Сума» column prices that quantity) and its reason.
type Line = OrderItem & { reason: string };

const REASON_COLUMN: ItemColumn = {
  key: "reason",
  label: "Причина повернення",
  width: 200,
  render: (item) => <span>{(item as Line).reason}</span>,
};

export function ReturnDetailsView({ id }: { id: string }) {
  const { user } = useAuth();
  const found = useReturn(id);
  const orders = useOrders();
  const [confirm, setConfirm] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  if (user?.type !== "b2b") return <SignInPrompt title="Деталі повернення" text={DETAILS_PROMPT_TEXT} />;

  const ret = found;
  const order = ret ? orders.find((o) => o.id === ret.orderId) : undefined;
  if (!ret || !order) {
    return (
      <CabinetPage>
        <CabinetPageHead back={{ label: COPY.back, href: "/orders?tab=returns" }} title={COPY.notFound} />
        <NotFoundPanel text={COPY.notFoundText} action={{ label: COPY.toReturns, href: "/orders?tab=returns" }} />
      </CabinetPage>
    );
  }

  const lines: Line[] = ret.lines.flatMap((l) => {
    const item = order.items.find((it) => it.id === l.itemId);
    return item ? [{ ...item, qty: l.qty, reason: l.reason }] : [];
  });
  const withdrawable = RETURN_WITHDRAWABLE.has(ret.status);

  return (
    <CabinetPage>
      <CabinetPageHead
        back={{ label: COPY.back, href: "/orders?tab=returns" }}
        titleRef={titleRef}
        title={
          <>
            Замовлення <TitleLight line>№{order.number}</TitleLight>
          </>
        }
        meta={<ReturnStatusBadge status={ret.status} />}
        actions={
          withdrawable ? (
            <Button variant="outlinedDark" onClick={() => setConfirm(true)}>
              Скасувати повернення
            </Button>
          ) : undefined
        }
      />

      <DetailsBody
        left={
          <>
            <ItemsTable
              items={lines}
              columns={[QTY_COLUMN, SUM_COLUMN, REASON_COLUMN]}
              phone={{
                title: COPY.items,
                line: (item) => ({
                  parts: [formatQty(item.qty, item.unit)],
                  amount: formatMoney(lineSum(item)),
                  extra: (
                    <>
                      {COPY.reason}
                      <span className="text-neutral-900">{(item as Line).reason}</span>
                    </>
                  ),
                }),
              }}
            />
            <InfoCard
              title="Деталі повернення"
              fields={[
                { label: "Бажане рішення", value: ret.solution },
                { label: "Варіанти зворотньої доставки", value: ret.delivery },
              ]}
            />
            <DocumentsCard title="Документи повернення" documents={returnDocuments(ret, order)} />
          </>
        }
        right={
          <>
            <SummaryCard
              title="Підсумок"
              compact={[
                {
                  id: "number",
                  label: COPY.orderNumber,
                  // The KeyValueList link look on a 44-px tall box (the
                  // padding is cancelled by the margins: the row height
                  // stays 24).
                  value: (
                    <Link
                      href={`/orders/${order.id}`}
                      className="-my-2.5 inline-block py-2.5 underline decoration-1 underline-offset-4 transition-colors duration-200 hover:text-brand active:text-brand motion-reduce:transition-none"
                    >
                      {order.number}
                    </Link>
                  ),
                },
                { id: "order-date", label: COPY.orderDate, value: formatDate(order.date) },
                { id: "return-date", label: COPY.returnDate, value: formatDate(ret.date) },
                { id: "author", label: COPY.author, value: order.createdBy },
                { id: "counterparty", label: COPY.counterparty, value: order.counterparty },
              ]}
              groups={[
                <>
                  <SummaryRow label="Статус повернення" info={TIPS.returnStatus}>
                    <ReturnStatusBadge status={ret.status} />
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
              ]}
            />
            <TotalCard label="Сума повернення" value={formatMoney(returnTotal(ret, order))} />
          </>
        }
      />

      <ConfirmModal
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          withdrawReturn(ret.id);
          setConfirm(false);
          showToast(COPY.withdrawn);
          requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
        }}
        title="Скасувати повернення?"
        body={`Запит на повернення за замовленням №${order.number} буде скасовано. Цю дію неможливо скасувати.`}
        cancelLabel="Повернутись"
        confirmLabel={
          <>
            <span className="max-[374.98px]:hidden">{COPY.withdraw}</span>
            <span className="hidden max-[374.98px]:inline">{COPY.withdrawShort}</span>
          </>
        }
      />
    </CabinetPage>
  );
}
