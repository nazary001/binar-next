import { AttentionSmallIcon, PaymentBadge, PaymentCaptionLine } from "@/components/platform/ui";
import { daysPlural, formatAmount, formatDate, formatSum, type Order } from "./data";
import { paymentKind } from "./payment";

const COPY = {
  due: (date: string) => `до ${date}`,
  overdue: (days: number) => `Прострочено на ${days} ${daysPlural(days)}`,
  paidLate: "Оплачено із простроченням",
  paidOnTime: "Оплачено вчасно",
  ratio: (paid: string, total: string) => `${paid} із ${total}`,
  remainder: (sum: string) => `Залишок ${sum} прострочено`,
} as const;

// «with caption» (4573:37308 / dashboard 5052:32197): the «Badge /
// Payment Status» chip (175 «Очікується оплата», 182 «Частково
// оплачено», 118 «Оплачено» in the list frame) over a 12/22 Medium py-2
// «Chip» caption (PaymentBadge caption / captionTone): grey notes («до
// 24.07.2026», «Оплачено вчасно», «1 500 із 3 900 ₴» - only the total
// carries the sign, 5052:32112), the 16-px attention glyph in #f26164
// for overdue sums and for «Оплачено із простроченням» (4573:37586). The
// three-line variant (4573:37441) puts a bare 22-px ratio line between
// the chip and the overdue remainder: 38 + 22 + 26 = 86 (row 134). A
// cancelled order asks for nothing: no due date, no overdue alert.
// (Moved verbatim from OrdersView.tsx: the desktop table cell. The overdue
// line keeps its three JSX text runs: one joined string shifts the
// anti-aliasing of a few glyphs in the desktop shots.)
export function PaymentCell({ order }: { order: Order }) {
  const p = order.payment;
  const kind = paymentKind(order);
  const cancelled = order.status === "cancelled";
  switch (p.kind) {
    case "awaiting":
      return <PaymentBadge kind={kind} caption={cancelled ? undefined : COPY.due(formatDate(order.paymentDue))} />;
    case "overdue":
      return cancelled ? (
        <PaymentBadge kind={kind} />
      ) : (
        <PaymentBadge kind={kind} caption={COPY.overdue(p.days)} captionTone="attention" />
      );
    case "paid":
      return p.late ? (
        <PaymentBadge kind={kind} caption={COPY.paidLate} captionTone="attention" />
      ) : (
        <PaymentBadge kind={kind} caption={COPY.paidOnTime} />
      );
    case "partial": {
      const ratio = COPY.ratio(formatAmount(p.paid), formatSum(order.total));
      if (p.overdue === undefined || cancelled) return <PaymentBadge kind={kind} caption={ratio} />;
      return (
        <div className="flex flex-col items-start">
          <PaymentBadge kind={kind} />
          <span className="whitespace-nowrap text-[12px] font-medium leading-[22px] text-neutral-500">{ratio}</span>
          <span className="inline-flex items-center gap-1 whitespace-nowrap py-[2px] text-[12px] font-medium leading-[22px] text-[#f26164]">
            <AttentionSmallIcon className="size-4 shrink-0" />
            Залишок {formatSum(p.overdue)} прострочено
          </span>
        </div>
      );
    }
  }
}

// Phone twin (TR-14, system spec A21 / A28): the bare chip goes into the
// RecordRow badge row; the caption(s) of the desktop cell become
// PaymentCaptionLine lines 8 under the badges (12/16 Medium, wrapping,
// never the 12/22 desktop caption). The three-line partial variant gives
// two lines: the grey ratio, then the overdue remainder in #f26164.
export function PaymentChip({ order }: { order: Order }) {
  return <PaymentBadge kind={paymentKind(order)} />;
}

export function PaymentCaptions({ order }: { order: Order }) {
  const p = order.payment;
  const cancelled = order.status === "cancelled";
  switch (p.kind) {
    case "awaiting":
      return cancelled ? null : <PaymentCaptionLine tone="subtle" text={COPY.due(formatDate(order.paymentDue))} />;
    case "overdue":
      return cancelled ? null : <PaymentCaptionLine tone="attention" text={COPY.overdue(p.days)} />;
    case "paid":
      return p.late ? (
        <PaymentCaptionLine tone="attention" text={COPY.paidLate} />
      ) : (
        <PaymentCaptionLine tone="subtle" text={COPY.paidOnTime} />
      );
    case "partial": {
      const ratio = (
        <PaymentCaptionLine tone="subtle" text={COPY.ratio(keepGroups(formatAmount(p.paid)), keepGroups(formatSum(order.total)))} />
      );
      if (p.overdue === undefined || cancelled) return ratio;
      return (
        <>
          {ratio}
          <PaymentCaptionLine tone="attention" text={COPY.remainder(keepGroups(formatSum(p.overdue)))} />
        </>
      );
    }
  }
}

// The wrapping phone captions must not break "1 500" between its digit
// groups: the thousands separator becomes a no-break space here (data.ts
// formatAmount stays as is, the desktop cells read it).
const NBSP = String.fromCharCode(160);
function keepGroups(amount: string): string {
  return amount.replace(/(\d) (?=\d)/g, `$1${NBSP}`);
}
