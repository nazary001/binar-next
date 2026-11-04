import type { ReactNode } from "react";
import { AttentionSmallIcon, PaymentAwaitingIcon, PaymentPaidIcon, PaymentPartialTwoToneIcon } from "./icons";

// «Badge / Payment Status» (4087:23703; instances 5052:57031,
// 5192:81049) - the 38-px chip beside the order badge: 1-px #d2d2d2
// stroke INSIDE the box (so CSS pads 5 / 11 for the master's 6 / 12),
// r40, py-4, gap 8, a 24-px «Payment Status icons» glyph and Manrope
// Medium 14/22 #343435. Widths: «Очікується оплата» 175, «Частково
// оплачено» 182 (5192:81074). The «with caption» wrapper (5052:32197)
// stacks a py-2 12/22 Medium caption under it: #777779 for notes
// («до 24.07.2026», «1 500 із 3 900 ₴»), the 16-px attention glyph +
// #f26164 for overdue ones («Прострочено на 3 дні», 5052:32232).
// Glyphs: awaiting = the exported clock; paid = the exported green tick
// disc (4573:37580, 118 wide; ctx/4573-37586.md pairs it with the
// attention caption «Оплачено із простроченням»); partial = the two-tone
// coin sampled from the dashboard render (wedge #27b886 = the paid green).
export type PaymentKind = "awaiting" | "partial" | "paid";

export const PAYMENT_LABELS: Record<PaymentKind, string> = {
  awaiting: "Очікується оплата",
  partial: "Частково оплачено",
  paid: "Оплачено",
};

const GLYPH: Record<PaymentKind, (p: { className?: string }) => ReactNode> = {
  awaiting: PaymentAwaitingIcon,
  partial: PaymentPartialTwoToneIcon,
  paid: PaymentPaidIcon,
};

export type PaymentBadgeProps = {
  kind: PaymentKind;
  // Overrides the default chip label.
  label?: string;
  caption?: ReactNode;
  captionTone?: "subtle" | "attention";
  className?: string;
};

export function PaymentBadge({
  kind,
  label,
  caption,
  captionTone = "subtle",
  className = "",
}: PaymentBadgeProps) {
  const Glyph = GLYPH[kind];
  const chip = (
    <span className="inline-flex h-[38px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[40px] border border-stroke-subtle py-1 pl-[5px] pr-[11px] text-[14px] font-medium leading-[22px] text-neutral-800">
      <Glyph className="size-6 shrink-0" />
      {label ?? PAYMENT_LABELS[kind]}
    </span>
  );
  if (caption === undefined) {
    return <span className={`inline-flex ${className}`}>{chip}</span>;
  }
  return (
    <span className={`inline-flex flex-col items-start ${className}`}>
      {chip}
      {captionTone === "attention" ? (
        <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap py-[2px] text-[12px] font-medium leading-[22px] text-[#f26164]">
          <AttentionSmallIcon className="size-4 shrink-0" />
          {caption}
        </span>
      ) : (
        <span className="whitespace-nowrap py-[2px] text-[12px] font-medium leading-[22px] text-neutral-500">
          {caption}
        </span>
      )}
    </span>
  );
}
