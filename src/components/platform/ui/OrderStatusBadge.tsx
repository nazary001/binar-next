import { StatusPill, type StatusTone } from "./StatusPill";

// «Badge / Order Status» - the seven order states of the spec section
// «Логіка статусів» 5192:85082 (instances 5192:85052..85058, top to
// bottom). The labels of the two states the earlier /orders build lacked
// are proven by the instance widths (pill = 38 + label; Manrope Medium
// 14 measured in Chromium): 112 = «Скасовано» (73.5), 115 = «Завершено»
// (76.6); the others match too (73 Нове, 128 Заблоковано, 94 В роботі,
// 133 Відвантажено, 107 Отримано). Colours: Нове / Заблоковано /
// В роботі from the contexts (5192:81052, 5052:32112), Відвантажено /
// Отримано from the earlier orders build (orders/data.ts). Завершено and
// Скасовано come from the designer's rule raster 5192:81008 (ctx), which
// names the return colours after the order ones: «Відхилено = Червоний
// (як «Скасовано»)», «Завершено = Зелений (як «Завершено»)», «Погоджено =
// Бірюзовий (як «Отримано»)» - so Скасовано = the red set and Завершено =
// the green #eaf7ee set (mint here), distinct from Отримано's teal. The
// instances 5192:85055 / 85057 themselves were not fetched.
export type OrderStatusKey =
  | "new"
  | "blocked"
  | "inProgress"
  | "shipped"
  | "received"
  | "completed"
  | "cancelled";

export const ORDER_STATUS_META: Record<OrderStatusKey, { label: string; tone: StatusTone }> = {
  new: { label: "Нове", tone: "blue" },
  blocked: { label: "Заблоковано", tone: "amber" },
  inProgress: { label: "В роботі", tone: "orange" },
  shipped: { label: "Відвантажено", tone: "indigo" },
  received: { label: "Отримано", tone: "green" },
  completed: { label: "Завершено", tone: "mint" },
  cancelled: { label: "Скасовано", tone: "red" },
};

// Spec order (5192:85082, top to bottom).
export const ORDER_STATUS_KEYS: OrderStatusKey[] = [
  "new",
  "blocked",
  "inProgress",
  "shipped",
  "received",
  "completed",
  "cancelled",
];

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatusKey;
  className?: string;
}) {
  const meta = ORDER_STATUS_META[status];
  return (
    <StatusPill tone={meta.tone} className={className}>
      {meta.label}
    </StatusPill>
  );
}
