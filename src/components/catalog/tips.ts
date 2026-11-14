import { formatPriceWhole } from "./data";

// The texts of the (i) explanation chips (ui/InfoTip.tsx), all in one
// place so the wording can be reviewed and edited here (designer
// 2026-11-11, C23 / C42: «По ховеру мали б бути тултіпи»).
//
// Only two of them are drawn in Figma: `fx` (the «Tooltip» chip 4634:65682
// over the USD-EUR card) and `preorder` («Термін виконання до X днів.»
// beside the «Під замовлення» card). The others are proposed copy shipped
// for the owner to review. The status lists follow the badge labels
// (platform/ui OrderStatusBadge ORDER_STATUS_META, ReturnStatusBadge
// RETURN_STATUS_META): keep them in step when a status is added.

// «дня» after a number ending in 1 (but not 11), «днів» otherwise: the
// genitive after «до» (до 1 дня, до 3 днів, до 21 дня).
function daysWord(n: number): string {
  return n % 10 === 1 && n % 100 !== 11 ? "дня" : "днів";
}

export const TIPS = {
  // «ціна залежить від курсу» (design 4634:65682).
  fx: "Ціна залежить від комерційного курсу USD або EUR та може бути скоригована під час виставлення рахунку. Валюта визначається автоматично.",
  // «Під замовлення» (design): the product's lead time as the panel / the
  // BAS stock feed stores it; without one, the manager names the term.
  preorder: (days?: number) =>
    days !== undefined && Number.isInteger(days) && days > 0
      ? `Термін виконання до ${days} ${daysWord(days)}.`
      : "Термін виконання уточнить менеджер.",
  // Proposed copy (no text in the design).
  wholesale: "Базова оптова ціна каталогу, без персональних умов вашого договору.",
  retailB2B: "Роздрібна ціна товару для покупців на сайті.",
  partner: "Ваша персональна ціна за умовами договору. За нею виставляється рахунок.",
  retailB2C: "Ціна для роздрібних покупців. Оптові ціни бачать партнери після входу в кабінет.",
  freeDelivery: (limit: number) => `Доставка безкоштовна для замовлень від ${formatPriceWhole(limit)}.`,
  orderStatus:
    "Етап, на якому зараз замовлення: Нове, Заблоковано, В роботі, Відвантажено, Отримано, Завершено або Скасовано.",
  paymentStatus: "Чи оплачене замовлення: повністю, частково або ще ні.",
  returnStatus:
    "Етап заявки на повернення: Створено, На розгляді, Погоджено, Відхилено, Товар у дорозі, Прийнято складом, Завершено або Скасовано.",
} as const;
