import { ORDER_STATUS_META, type OrderStatusKey } from "@/components/platform/ui/OrderStatusBadge";
import { Badge, type BadgeSize } from "./Badge";
import type { Tone } from "./tokens";

// The panel's shared vocabulary of statuses: one label and one tone per
// state, as plain maps (for filters, selects and CSV headers) and as
// badges. Every screen shows a state through these, so "Відвантажено" is
// the same indigo pill in the orders list, the order page, the dashboard
// and the journal.
//
//   <OrderStatusBadge status={order.status} />
//   <PaymentStatusBadge kind={order.payment?.kind ?? "awaiting"} />
//   <ShipmentStatusBadge status={order.shipment.status} />
//   <ActiveBadge active={client.isActive !== false} />
//   <OrderStatusBadge status={order.status} size="md" />   // a page head
//   statusOptions(LEAD_STATUS)   // [{ value: "new", label: "Нова" }, ...] for a select
//   <Badge tone="amber" dot>Очікує ключа</Badge>   // a one-off state: ui/Badge.tsx
//
// Every badge is the kit's Badge (ui/Badge.tsx): size "sm" 24 px (default,
// tables and lists) or "md" 28 px (page heads, cards). States carry the
// tone's dot; kinds and types (lead kind, channel, account type) do not.
//
// The unions are restated here as string literals on purpose:
// src/server/db/collections.ts is server-only and must not reach a client
// bundle. Keep them in step with it (OrderStatus, ReturnStatus,
// PaymentState["kind"], LeadStatus, LeadDoc["kind"], BlogStatus,
// ShipmentStatus, ErpLink["state"], OrderDoc["channel"], AccountType).
// A value the map does not know (data older or newer than this file) is
// shown as a neutral pill with the raw value instead of breaking the row.

export type StatusMeta = { label: string; tone: Tone };

export type OrderStatus = OrderStatusKey;
export type ReturnStatus = "created" | "review" | "approved" | "rejected" | "inTransit" | "accepted" | "completed" | "cancelled";
export type PaymentStatus = "awaiting" | "partial" | "paid" | "overdue";
export type LeadStatus = "new" | "in_progress" | "done" | "spam";
export type LeadKind = "quiz" | "star-checklist" | "partner-contact";
export type BlogStatus = "draft" | "scheduled" | "published";
export type ShipmentStatus =
  | "draft"
  | "created"
  | "in_transit"
  | "arrived"
  | "received"
  | "refused"
  | "returning"
  | "cancelled"
  | "unknown";
export type ErpState = "pending" | "acked" | "error" | "skipped";
export type Channel = "b2b" | "retail";
export type AccountType = "b2b" | "b2c";

// The cabinet's own order vocabulary, so the panel and the partner's
// cabinet never disagree about a colour.
export const ORDER_STATUS: Record<OrderStatus, StatusMeta> = ORDER_STATUS_META;

// The cabinet's return vocabulary (RETURN_STATUS_META of
// platform/ui/ReturnStatusBadge.tsx) with one word of the panel's own:
// "cancelled" is the partner withdrawing the request in the cabinet (staff
// refuse with "rejected" and cannot cancel), so staff read "Відкликано
// клієнтом" where the partner reads "Скасовано". Every place of the panel
// that names a return status (lists, chips, badges, search, journal
// summaries) takes the label from here; mail to the partner keeps the
// cabinet's word.
export const RETURN_STATUS: Record<ReturnStatus, StatusMeta> = {
  created: { label: "Створено", tone: "blue" },
  review: { label: "На розгляді", tone: "amber" },
  approved: { label: "Погоджено", tone: "mint" },
  rejected: { label: "Відхилено", tone: "red" },
  inTransit: { label: "Товар у дорозі", tone: "indigo" },
  accepted: { label: "Прийнято складом", tone: "orange" },
  completed: { label: "Завершено", tone: "green" },
  cancelled: { label: "Відкликано клієнтом", tone: "neutral" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, StatusMeta> = {
  awaiting: { label: "Очікується оплата", tone: "amber" },
  partial: { label: "Частково оплачено", tone: "blue" },
  paid: { label: "Оплачено", tone: "green" },
  overdue: { label: "Прострочено", tone: "red" },
};

export const LEAD_STATUS: Record<LeadStatus, StatusMeta> = {
  new: { label: "Нова", tone: "blue" },
  in_progress: { label: "В роботі", tone: "orange" },
  done: { label: "Опрацьована", tone: "green" },
  spam: { label: "Спам", tone: "neutral" },
};

// Kinds are not states: they share one quiet tone and carry no dot.
export const LEAD_KIND: Record<LeadKind, StatusMeta> = {
  quiz: { label: "Квіз-підбір", tone: "neutral" },
  "star-checklist": { label: "Чеклист за зірковістю", tone: "neutral" },
  "partner-contact": { label: "Запит на співпрацю", tone: "neutral" },
};

export const BLOG_STATUS: Record<BlogStatus, StatusMeta> = {
  draft: { label: "Чернетка", tone: "neutral" },
  scheduled: { label: "Заплановано", tone: "amber" },
  published: { label: "Опубліковано", tone: "green" },
};

export const SHIPMENT_STATUS: Record<ShipmentStatus, StatusMeta> = {
  draft: { label: "Чернетка", tone: "neutral" },
  created: { label: "Створено", tone: "blue" },
  in_transit: { label: "У дорозі", tone: "indigo" },
  arrived: { label: "Прибуло у відділення", tone: "orange" },
  received: { label: "Отримано", tone: "green" },
  refused: { label: "Відмова", tone: "red" },
  returning: { label: "Повертається", tone: "amber" },
  cancelled: { label: "Скасовано", tone: "neutral" },
  unknown: { label: "Невідомо", tone: "neutral" },
};

export const ERP_STATE: Record<ErpState, StatusMeta> = {
  pending: { label: "Очікує вивантаження", tone: "amber" },
  acked: { label: "Прийнято в BAS", tone: "green" },
  error: { label: "Помилка обміну", tone: "red" },
  skipped: { label: "Не вивантажується", tone: "neutral" },
};

export const CHANNEL: Record<Channel, StatusMeta> = {
  b2b: { label: "Партнер", tone: "indigo" },
  retail: { label: "Роздріб", tone: "neutral" },
};

export const ACCOUNT_TYPE: Record<AccountType, StatusMeta> = {
  b2b: { label: "Партнер B2B", tone: "indigo" },
  b2c: { label: "Покупець B2C", tone: "neutral" },
};

// The options of a filter select, in the map's order.
export function statusOptions<K extends string>(map: Record<K, StatusMeta>): { value: K; label: string }[] {
  return (Object.keys(map) as K[]).map((key) => ({ value: key, label: map[key].label }));
}

// The label of a key, or the key itself when the map does not know it.
export function statusLabel<K extends string>(map: Record<K, StatusMeta>, key: string | null | undefined): string {
  if (!key) return "-";
  return (map as Record<string, StatusMeta>)[key]?.label ?? key;
}

function metaOf(map: Record<string, StatusMeta>, key: string): StatusMeta {
  return map[key] ?? { label: key || "-", tone: "neutral" };
}

export type StatusBadgeOptions = { size?: BadgeSize; className?: string };
type BadgeOptions = StatusBadgeOptions;

function MapBadge({ map, value, dot = true, size, className }: { map: Record<string, StatusMeta>; value: string; dot?: boolean } & BadgeOptions) {
  const meta = metaOf(map, value);
  return (
    <Badge tone={meta.tone} dot={dot} size={size} className={className}>
      {meta.label}
    </Badge>
  );
}

export function OrderStatusBadge({ status, ...rest }: { status: OrderStatus } & BadgeOptions) {
  return <MapBadge map={ORDER_STATUS} value={status} {...rest} />;
}

export function ReturnStatusBadge({ status, ...rest }: { status: ReturnStatus } & BadgeOptions) {
  return <MapBadge map={RETURN_STATUS} value={status} {...rest} />;
}

export function PaymentStatusBadge({ kind, ...rest }: { kind: PaymentStatus } & BadgeOptions) {
  return <MapBadge map={PAYMENT_STATUS} value={kind} {...rest} />;
}

export function LeadStatusBadge({ status, ...rest }: { status: LeadStatus } & BadgeOptions) {
  return <MapBadge map={LEAD_STATUS} value={status} {...rest} />;
}

export function LeadKindBadge({ kind, ...rest }: { kind: LeadKind } & BadgeOptions) {
  return <MapBadge map={LEAD_KIND} value={kind} dot={false} {...rest} />;
}

export function BlogStatusBadge({ status, ...rest }: { status: BlogStatus } & BadgeOptions) {
  return <MapBadge map={BLOG_STATUS} value={status} {...rest} />;
}

export function ShipmentStatusBadge({ status, ...rest }: { status: ShipmentStatus } & BadgeOptions) {
  return <MapBadge map={SHIPMENT_STATUS} value={status} {...rest} />;
}

export function ErpStateBadge({ state, ...rest }: { state: ErpState } & BadgeOptions) {
  return <MapBadge map={ERP_STATE} value={state} {...rest} />;
}

export function ChannelBadge({ channel, ...rest }: { channel: Channel } & BadgeOptions) {
  return <MapBadge map={CHANNEL} value={channel} dot={false} {...rest} />;
}

export function AccountTypeBadge({ type, ...rest }: { type: AccountType } & BadgeOptions) {
  return <MapBadge map={ACCOUNT_TYPE} value={type} dot={false} {...rest} />;
}

export function ActiveBadge({ active, ...rest }: { active: boolean } & BadgeOptions) {
  return (
    <Badge tone={active ? "green" : "red"} dot {...rest}>
      {active ? "Активний" : "Заблокований"}
    </Badge>
  );
}
