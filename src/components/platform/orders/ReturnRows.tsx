import { RecordRow, ReturnStatusBadge, RowDisc } from "@/components/platform/ui";
import { OrderDocumentsIcon } from "../orderIcons";
import { formatDate, formatSum, type Order, type ReturnRequest } from "./data";

const COPY = {
  eyebrow: (id: string) => `Повернення №${id}`,
  number: (number: string) => `№${number}`,
  link: (id: string, number: string) => `Деталі повернення №${id} за замовленням №${number}`,
  documents: (number: string) => `Документи повернення за замовленням №${number}`,
} as const;

// One row of the returns tab: the return, its order (the store may miss
// it) and the return sum.
export type ReturnRow = { ret: ReturnRequest; order: Order | undefined; total: number };

// Phone row of the returns tab (returns spec 2.1.4 / orders-list 2.7,
// system spec A7): the orders-tab RecordRow with the brand eyebrow
// (return id) 8 above line 1 (two returns of one order stay
// distinct), the order number as the stretched link to the return page
// over the return date, the documents disc (only when the order is
// known) + the chevron, the return sum over the counterparty, and the
// return status badge.
export function ReturnRecordRow({ row, onDocuments }: { row: ReturnRow; onDocuments: (row: ReturnRow) => void }) {
  const { ret, order, total } = row;
  const number = order?.number ?? "";
  return (
    <RecordRow
      eyebrow={COPY.eyebrow(ret.id)}
      id={COPY.number(number)}
      linkLabel={COPY.link(ret.id, number)}
      href={`/orders/returns/${ret.id}`}
      date={formatDate(ret.date)}
      amount={formatSum(total)}
      sub={order?.counterparty}
      action={
        order ? (
          <RowDisc label={COPY.documents(number)} haspopup="dialog" onClick={() => onDocuments(row)}>
            <OrderDocumentsIcon className="size-5" />
          </RowDisc>
        ) : undefined
      }
      badges={<ReturnStatusBadge status={ret.status} />}
    />
  );
}
