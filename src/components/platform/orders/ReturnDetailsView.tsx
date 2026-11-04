"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import { isDemoAccount } from "@/components/auth/demo";
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
import { useOrders, useReturn, withdrawReturn } from "./store";

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
// The placeholder returns belong to the demo partner (as on the list):
// any other partner gets «Повернення не знайдено».

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

  if (user?.type !== "b2b") return <SignInPrompt title="Деталі повернення" text={DETAILS_PROMPT_TEXT} />;

  const ret = isDemoAccount(user) ? found : undefined;
  const order = ret ? orders.find((o) => o.id === ret.orderId) : undefined;
  if (!ret || !order) {
    return (
      <CabinetPage>
        <CabinetPageHead back={{ label: "До замовлень", href: "/orders?tab=returns" }} title="Повернення не знайдено" />
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
        back={{ label: "До замовлень", href: "/orders?tab=returns" }}
        title={
          <>
            Замовлення <TitleLight>№{order.number}</TitleLight>
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
            <ItemsTable items={lines} columns={[QTY_COLUMN, SUM_COLUMN, REASON_COLUMN]} />
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
              groups={[
                <>
                  <SummaryRow label="Статус повернення" info>
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
        }}
        title="Скасувати повернення?"
        body={`Запит на повернення за замовленням №${order.number} буде скасовано. Цю дію неможливо скасувати.`}
        cancelLabel="Повернутись"
        confirmLabel="Скасувати повернення"
      />
    </CabinetPage>
  );
}
