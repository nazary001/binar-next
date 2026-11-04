import type { ReactNode } from "react";

// «Badge / Order Status» (component 3563:16447 family) - the r40 status
// pill every cabinet table, card and modal uses. Two sizes exist in the
// masters:
//   md (default) = 38 tall, pl-8 pr-10 py-8, gap 4: a 16-px box holding a
//     6-px dot + Manrope Medium 14/22 (orders / returns / counterparties,
//     e.g. 5192:81038, 5070:75403, 4868:31048);
//   sm = 30 tall, px-12 py-4, no dot (employee cards 4628:6462 «Активний»,
//     the «Адміністратор» pill 4868:31400, contract tiles 4868:31210).
// Tone colours, verbatim from the contexts (return set 5070:75404 holds
// every tone except brand):
//   blue    #e8f7ff / #0a6f9e / dot #0b8fc5  Нове, Створено, Запрошено
//   orange  #fff1eb / #d94e0b / dot #f85a0b  В роботі, Прийнято складом
//   indigo  #eef2ff / #4569d4 / dot #4f7de8  Відвантажено, Товар у дорозі
//   green   #e8f8f4 / #178d72 / dot #27ae85  Отримано, Активний, Діє
//   amber   #fff5dd / #805300 / dot #d89a00  Заблоковано, На розгляді
//   mint    #eaf7ee / #197a4d / dot #219653  Погоджено, «В наявності»
//   red     #fff0f0 / #b33a3a / dot #d9534f  Відхилено, «Під замовлення»
//   neutral #e8e8e9 / #616162 / dot #616162  return Скасовано
//   brand   #f85a0b / #ffffff                «Адміністратор» (sm only)
export type StatusTone =
  | "blue"
  | "orange"
  | "indigo"
  | "green"
  | "amber"
  | "mint"
  | "red"
  | "neutral"
  | "brand";

export const STATUS_TONES: Record<StatusTone, { bg: string; text: string; dot: string }> = {
  blue: { bg: "#e8f7ff", text: "#0a6f9e", dot: "#0b8fc5" },
  orange: { bg: "#fff1eb", text: "#d94e0b", dot: "#f85a0b" },
  indigo: { bg: "#eef2ff", text: "#4569d4", dot: "#4f7de8" },
  green: { bg: "#e8f8f4", text: "#178d72", dot: "#27ae85" },
  amber: { bg: "#fff5dd", text: "#805300", dot: "#d89a00" },
  mint: { bg: "#eaf7ee", text: "#197a4d", dot: "#219653" },
  red: { bg: "#fff0f0", text: "#b33a3a", dot: "#d9534f" },
  neutral: { bg: "#e8e8e9", text: "#616162", dot: "#616162" },
  brand: { bg: "#f85a0b", text: "#ffffff", dot: "#ffffff" },
};

export type StatusPillProps = {
  tone: StatusTone;
  children: ReactNode;
  size?: "md" | "sm";
  // The md pill carries the dot by default, the sm one never does.
  dot?: boolean;
  className?: string;
};

export function StatusPill({ tone, children, size = "md", dot, className = "" }: StatusPillProps) {
  const t = STATUS_TONES[tone];
  const showDot = size === "md" && (dot ?? true);
  const box =
    size === "md"
      ? `h-[38px] gap-1 py-2 ${showDot ? "pl-2 pr-[10px]" : "px-3"}`
      : "h-[30px] px-3 py-1";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[40px] text-[14px] font-medium leading-[22px] ${box} ${className}`}
      style={{ backgroundColor: t.bg, color: t.text }}
    >
      {showDot && (
        <span aria-hidden className="flex size-4 shrink-0 items-center justify-center">
          <span className="size-[6px] rounded-full" style={{ backgroundColor: t.dot }} />
        </span>
      )}
      {children}
    </span>
  );
}
