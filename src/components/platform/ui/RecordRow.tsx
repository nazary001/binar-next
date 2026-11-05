import Link from "next/link";
import type { ButtonHTMLAttributes, LiHTMLAttributes, ReactNode, Ref } from "react";
import { ChevronSideIcon } from "@/components/catalog/icons";
import { PHONE_EYEBROW } from "@/components/ui/ProductLine";

// TR-07 list panel (system spec A7) - the phone stand-in for every cabinet
// table (orders, returns, dashboard orders, assortment, counterparties,
// employees): a white r32 panel of rows, px 24 py 24, 1-px #d2d2d2
// dividers inset 24 (a `before:` line, no layout height). The rows own
// the panel corners (first / last r32) so the :active tint and the inset
// focus ring follow them; the panel itself does not clip (KebabMenu /
// SortMenu panels may flip above a row). Phone-only atoms: consumers
// render them `lg:hidden` next to the untouched desktop table.

export const LIST_ROW =
  "relative px-6 py-6 first:rounded-t-[32px] last:rounded-b-[32px] has-[a:active]:bg-bg-subtle has-[button[data-row-open]:active]:bg-bg-subtle has-[a[data-row-link]:focus-visible]:shadow-[inset_0_0_0_2px_var(--color-brand)] has-[button[data-row-open]:focus-visible]:shadow-[inset_0_0_0_2px_var(--color-brand)] [&+&]:before:absolute [&+&]:before:inset-x-6 [&+&]:before:top-0 [&+&]:before:h-px [&+&]:before:bg-stroke-subtle";

export function ListPanel({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <ul role="list" aria-label={label} className={`flex flex-col rounded-[32px] bg-white ${className}`}>
      {children}
    </ul>
  );
}

export function ListRow({
  children,
  className = "",
  ...rest
}: { children: ReactNode; className?: string } & Omit<LiHTMLAttributes<HTMLLIElement>, "className" | "children">) {
  return (
    <li {...rest} className={`${LIST_ROW} ${className}`}>
      {children}
    </li>
  );
}

// The stretched primary control of a row: the whole row is the target,
// its focus ring is drawn by ListRow (inset 2-px brand). The id never
// breaks inside a word (beats the phone-wide `overflow-wrap: anywhere`,
// so "№48291064" stays whole) but a long name (a counterparty row) wraps
// between words instead of running out of the row.
const ROW_ID =
  "self-start text-pretty [overflow-wrap:normal]! text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900 outline-none";
const STRETCH = "after:absolute after:inset-0 after:content-['']";

// Record row (TR-07 anatomy; Case card content 3094:5049): a complete
// list item (ListRow) with the column, lines 12 apart:
//   [eyebrow 12/20 Medium uppercase brand, 8 above line 1]
//   line 1: id 16/22 Bold (the stretched link / button) over the date
//           14/20 #777779 | action (RowDisc) + 24 chevron
//   amount 22/28 SemiBold + sub 14/20 #343435 (2 lines max)
//   badges (wrap, 8 apart) + caption (PaymentCaptionLine) 8 below
// `href` makes it a link row, `onOpen` a button row (profile rows),
// neither a static row (no chevron).
export function RecordRow({
  id,
  linkLabel,
  href,
  onOpen,
  eyebrow,
  date,
  amount,
  sub,
  badges,
  caption,
  action,
  chevron,
  className = "",
}: {
  id: ReactNode;
  linkLabel: string;
  href?: string;
  onOpen?: () => void;
  eyebrow?: ReactNode;
  date?: ReactNode;
  amount?: ReactNode;
  sub?: ReactNode;
  badges?: ReactNode;
  caption?: ReactNode;
  action?: ReactNode;
  chevron?: boolean;
  className?: string;
}) {
  const showChevron = chevron ?? Boolean(href || onOpen);
  const idEl = href ? (
    <Link href={href} data-row-link="" aria-label={linkLabel} className={`${ROW_ID} ${STRETCH}`}>
      {id}
    </Link>
  ) : onOpen ? (
    <button
      type="button"
      data-row-open=""
      aria-label={linkLabel}
      onClick={onOpen}
      className={`${ROW_ID} ${STRETCH} cursor-pointer text-left`}
    >
      {id}
    </button>
  ) : (
    <span className={ROW_ID}>{id}</span>
  );
  return (
    <ListRow className={className}>
      <div className="flex flex-col gap-3">
        {eyebrow && <p className={`-mb-1 ${PHONE_EYEBROW} text-brand`}>{eyebrow}</p>}
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {idEl}
            {date && <span className="whitespace-nowrap text-[14px] leading-5 text-neutral-500">{date}</span>}
          </div>
          {(action || showChevron) && (
            <div className="flex shrink-0 items-center gap-1">
              {action}
              {showChevron && <ChevronSideIcon mirrored className="size-6 shrink-0 text-neutral-900" />}
            </div>
          )}
        </div>
        {(amount || sub) && (
          <div className="flex flex-col gap-1">
            {amount && (
              <p className="whitespace-nowrap text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900">
                {amount}
              </p>
            )}
            {sub && <p className="line-clamp-2 text-[14px] leading-5 text-neutral-800">{sub}</p>}
          </div>
        )}
        {(badges || caption) && (
          <div className="flex flex-col items-start gap-2">
            {badges && <div className="flex flex-wrap items-start gap-2">{badges}</div>}
            {caption}
          </div>
        )}
      </div>
    </ListRow>
  );
}

// 44-px hit / 40-px #1d1d1f ring disc for a row action (documents,
// kebab); above the stretched link (z-1), never nested in it. Children =
// a 20-px glyph.
export function RowDisc({
  label,
  onClick,
  children,
  haspopup,
  expanded,
  buttonRef,
  className = "",
  ...rest
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  haspopup?: "dialog" | "menu";
  expanded?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children" | "className" | "type">) {
  return (
    <button
      {...rest}
      ref={buttonRef}
      type="button"
      aria-label={label}
      aria-haspopup={haspopup}
      aria-expanded={expanded}
      onClick={onClick}
      className={`relative z-[1] -m-0.5 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${className}`}
    >
      <span className="flex size-10 items-center justify-center rounded-full border border-neutral-900 bg-white text-neutral-900 transition-colors duration-200 motion-reduce:transition-none [button:active>&]:bg-bg-subtle">
        {children}
      </span>
    </button>
  );
}

// "Label: value" line inside a row (14/20; label Medium #777779 = the KV
// label of A15, value #1d1d1f); wraps under itself at 320.
export function KeyValueLine({ label, value, nowrap }: { label: ReactNode; value: ReactNode; nowrap?: boolean }) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[14px] leading-5">
      <span className="font-medium text-neutral-500">{label}</span>
      <span className={`text-neutral-900 ${nowrap ? "whitespace-nowrap" : ""}`}>{value}</span>
    </div>
  );
}
