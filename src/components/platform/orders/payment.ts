import type { PaymentKind } from "@/components/platform/ui";
import type { Order } from "./data";

// «Badge / Payment Status» variant of an order (details head 5052:56822,
// summary 5052:57031, cancel modal 5192:81049): an unpaid order - due or
// overdue - reads «Очікується оплата», a partly paid one «Частково
// оплачено», a settled one «Оплачено».
export function paymentKind(order: Order): PaymentKind {
  switch (order.payment.kind) {
    case "partial":
      return "partial";
    case "paid":
      return "paid";
    default:
      return "awaiting";
  }
}
