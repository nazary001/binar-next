import { StatusPill, type StatusTone } from "./StatusPill";

// «Статус повернення» - component set 5070:75404 in the section
// «Логіка статусів повернення» 5193:38419, eight variants (XML names and
// widths: Створено 105, На розгляді 117, Погоджено 115, Відхилено 108,
// Товар у дорозі 135, Прийнято складом 165, Завершено 115, Скасовано
// 112 - all equal 38 + the Manrope Medium 14 label width). Same pill as
// «Badge / Order Status». Colours verbatim from the drawn set
// (ctx/5070-75404.md). NOTE: the rule raster 5192:81008 words Погоджено
// as «Бірюзовий (як «Отримано»)» and Завершено as «Зелений», i.e. the
// reverse of the drawn set (Погоджено #eaf7ee, Завершено #e8f8f4); the
// drawn set wins here. The master labels «На розгляді » and «Товар у
// дорозі » carry a trailing space (trimmed: 1 px narrower).
export type ReturnStatusKey =
  | "created"
  | "review"
  | "approved"
  | "rejected"
  | "inTransit"
  | "accepted"
  | "completed"
  | "cancelled";

export const RETURN_STATUS_META: Record<ReturnStatusKey, { label: string; tone: StatusTone }> = {
  created: { label: "Створено", tone: "blue" },
  review: { label: "На розгляді", tone: "amber" },
  approved: { label: "Погоджено", tone: "mint" },
  rejected: { label: "Відхилено", tone: "red" },
  inTransit: { label: "Товар у дорозі", tone: "indigo" },
  accepted: { label: "Прийнято складом", tone: "orange" },
  completed: { label: "Завершено", tone: "green" },
  cancelled: { label: "Скасовано", tone: "neutral" },
};

// Set order (5070:75404 variant positions, top to bottom, left column first).
export const RETURN_STATUS_KEYS: ReturnStatusKey[] = [
  "created",
  "review",
  "approved",
  "rejected",
  "inTransit",
  "accepted",
  "completed",
  "cancelled",
];

export function ReturnStatusBadge({
  status,
  className,
}: {
  status: ReturnStatusKey;
  className?: string;
}) {
  const meta = RETURN_STATUS_META[status];
  return (
    <StatusPill tone={meta.tone} className={className}>
      {meta.label}
    </StatusPill>
  );
}
