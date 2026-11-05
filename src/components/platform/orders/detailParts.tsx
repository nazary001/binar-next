"use client";

/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { KeyValueList, type KeyValueRow } from "@/components/ui/KeyValueList";
import { PRODUCT_LINE_LIST, PRODUCT_LINE_TOTAL, ProductLine } from "@/components/ui/ProductLine";
import { DocumentRowList, DotIcon, InfoHeadIcon } from "../ui";
import { formatMoney, formatQty, lineSum, type OrderDocument, type OrderItem } from "./data";
import { OrderDocumentRow, OrderDocumentTile, downloadAll } from "./DocumentsModal";

const COPY = {
  article: (article: string) => `Артикул: ${article}`,
  // Phones: the long desktop label does not fit the 224-px card at 320
  // (the DocumentsModal pill uses the same short label).
  downloadAllShort: "Завантажити все",
} as const;

// «1 позиція», «3 позиції», «5 позицій» (11-14 take «позицій»).
export function positionsLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} позиція`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} позиції`;
  return `${n} позицій`;
}

// Blocks of the two details pages - «Деталі замовлення» 5052:56810 /
// 5192:77948 (ctx/5052-56828.md, ctx/5052-57003.md) and «Деталі
// повернення» 5192:79067 (ctx/5192-79072.md). Body = pl-40 pr-32 pt-16,
// a flexible left column (1014 at 1710) and the 494 right column, 26
// apart; every card is white r24.
// Phones (< 640, order-detail spec 2.2-2.6 / returns 2.2, template T3):
// one column, blocks 24 apart, the summary + total column FIRST (the sum
// and the pay action no longer sit at the page bottom), every card r32
// p 24, card titles 22/28 SemiBold; the head's pb 48 is the head -> first
// block distance, so the body has no top padding.

export function DetailsBody({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 px-6 pt-0 lg:flex-row lg:items-start lg:gap-[26px] lg:pl-10 lg:pr-8 lg:pt-4">
      <div className="flex min-w-0 flex-1 flex-col gap-6 lg:gap-[26px]">{left}</div>
      <div className="flex w-full shrink-0 flex-col overflow-clip rounded-[32px] max-lg:order-first lg:w-[494px] lg:rounded-3xl">
        {right}
      </div>
    </div>
  );
}

// «Title/Medium» card heading: Manrope Bold 22/28 -2 % (phones: Title
// Large 22/28 SemiBold = CABINET_SECTION_TITLE).
const CARD_TITLE = "text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900 lg:font-bold";
const CARD = "flex flex-col gap-6 overflow-clip rounded-[32px] bg-white p-6 lg:gap-8 lg:rounded-3xl lg:p-8";

// 0.5-px #d2d2d2 hairline between table rows, 16 px in from the row
// edges (divider-row.svg). Figma draws it as its own 0.5-px row, so the
// cells of every row after the first carry 0.5 px more top padding: five
// rows = 64 + 5 x 108 + 4 x 0.5 = the master's 606.
const ROW_DIVIDER =
  "[background:linear-gradient(var(--color-stroke-subtle),var(--color-stroke-subtle))_16px_0/calc(100%-32px)_0.5px_no-repeat] [&>td]:pt-[24.5px]";

export type ItemColumn = {
  key: string;
  label: string;
  // Fixed px width (Figma <TableHead> w-130 / 200); none = the flexible
  // «Товар» column.
  width?: number;
  render: (item: OrderItem) => ReactNode;
};

// «Product preview» XS (4101:35551) + name / article column.
export function ProductCell({ item }: { item: OrderItem }) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <span className="relative size-[60px] shrink-0 overflow-clip rounded-xl bg-bg-subtle">
        <img src={item.image} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" decoding="async" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[7px] text-[16px]">
        <p className="truncate font-bold leading-[22px] tracking-[0.16px] text-neutral-900" title={item.name}>
          {item.name}
        </p>
        <p className="leading-6 text-neutral-800">Артикул: {item.article}</p>
      </div>
    </div>
  );
}

export const QTY_COLUMN: ItemColumn = {
  key: "qty",
  label: "Кількість",
  width: 130,
  render: (item) => (
    <span className="whitespace-nowrap">
      {formatQty(item.qty, item.unit)}
    </span>
  ),
};

export const PRICE_COLUMN: ItemColumn = {
  key: "price",
  label: "Ціна, ₴",
  width: 130,
  render: (item) => <span className="whitespace-nowrap font-semibold">{formatMoney(item.price)}</span>,
};

export const SUM_COLUMN: ItemColumn = {
  key: "sum",
  label: "Сума",
  width: 130,
  render: (item) => <span className="whitespace-nowrap font-semibold">{formatMoney(lineSum(item))}</span>,
};

// Phone twin of the table (TR-07 / TR-08, system spec A8): a white r32
// panel, title + count, then one ProductLine per line (64 photo, name up
// to 3 lines, the article) with the read-only bottom row: the qty / price
// parts left, the line total 22/28 right (its own line at 320), plus an
// optional extra line (the return reason).
export type ItemsPhone = {
  title: string;
  line: (item: OrderItem) => { parts: ReactNode[]; amount: ReactNode; extra?: ReactNode };
};

function ItemsList({ items, title, line }: { items: OrderItem[] } & ItemsPhone) {
  return (
    <section className="flex flex-col rounded-[32px] bg-white px-6 pt-6 lg:hidden">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="min-w-0 text-title-lg text-neutral-900">{title}</h2>
        <p className="whitespace-nowrap text-[14px] leading-5 text-neutral-500">{positionsLabel(items.length)}</p>
      </div>
      <ul role="list" className={PRODUCT_LINE_LIST}>
        {items.map((item) => {
          const l = line(item);
          return (
            <ProductLine
              key={item.id}
              image={item.image}
              title={item.name}
              titleLines={3}
              meta={<span className="whitespace-nowrap">{COPY.article(item.article)}</span>}
              bottom={
                <>
                  <span className="flex flex-wrap items-center gap-x-1 text-[14px] leading-5 text-neutral-500">
                    {l.parts.map((part, i) => (
                      <span key={i} className="flex items-center gap-1 whitespace-nowrap">
                        {part}
                        {i < l.parts.length - 1 && <DotIcon className="size-[14px] shrink-0" />}
                      </span>
                    ))}
                  </span>
                  <span className={PRODUCT_LINE_TOTAL}>{l.amount}</span>
                  {l.extra && <p className="basis-full text-[14px] leading-5 text-neutral-500">{l.extra}</p>}
                </>
              }
            />
          );
        })}
      </ul>
    </section>
  );
}

// The products table (5052:56829: head row #343435 pt-8 px-16, heads p-16
// 14/24 SemiBold white; rows px-16, cells px-16 py-24, 108 tall). With
// `phone` the table is desktop-only and the ItemsList stands in below 640.
export function ItemsTable({
  items,
  columns,
  phone,
}: {
  items: OrderItem[];
  columns: ItemColumn[];
  phone?: ItemsPhone;
}) {
  return (
    <>
    <div className={phone ? "overflow-x-auto rounded-3xl bg-white max-lg:hidden" : "overflow-x-auto rounded-3xl bg-white"}>
      <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-0">
        <colgroup>
          <col className="w-4" />
          <col />
          {columns.map((c) => (
            <col key={c.key} style={{ width: c.width }} />
          ))}
          <col className="w-4" />
        </colgroup>
        <thead>
          <tr className="bg-neutral-800">
            <th aria-hidden className="p-0 pt-2" />
            <th scope="col" className="p-0 pt-2 text-left font-normal">
              <span className="flex items-center p-4 text-[14px] font-semibold leading-6 text-white">Товар</span>
            </th>
            {columns.map((c) => (
              <th key={c.key} scope="col" className="p-0 pt-2 text-left font-normal">
                <span className="flex items-center whitespace-nowrap p-4 text-[14px] font-semibold leading-6 text-white">
                  {c.label}
                </span>
              </th>
            ))}
            <th aria-hidden className="p-0 pt-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id} className={i === 0 ? "" : ROW_DIVIDER}>
              <td aria-hidden className="p-0" />
              <td className="px-4 py-6 align-middle">
                <ProductCell item={item} />
              </td>
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-6 align-middle text-[16px] leading-6 text-neutral-900">
                  {c.render(item)}
                </td>
              ))}
              <td aria-hidden className="p-0" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {phone && <ItemsList items={items} {...phone} />}
    </>
  );
}

// Read-only field of «Інформація про доставку» (4812:38164): «Input/
// Label» 12/12 Medium #777779 +0.15, 4 px, then a 40-px box with the
// 1-px #d2d2d2 bottom stroke and the 16/24 value.
export function ReadField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <p className="text-[12px] font-medium leading-3 tracking-[0.15px] text-neutral-500">{label}</p>
      <div className="flex h-10 items-center overflow-clip border-b border-stroke-subtle py-2">
        <p className="truncate text-[16px] leading-6 text-neutral-900">{value}</p>
      </div>
    </div>
  );
}

// «heroicons-outline/information-circle» 24 in Colour/Neutral/300.
function InfoCircle24({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M20.25 12C20.25 7.44365 16.5563 3.75 12 3.75C7.44365 3.75 3.75 7.44365 3.75 12C3.75 16.5563 7.44365 20.25 12 20.25C16.5563 20.25 20.25 16.5563 20.25 12ZM10.9556 10.5586C12.1017 9.98552 13.3931 11.0205 13.0825 12.2637L12.3735 15.0996L12.4146 15.0791C12.785 14.8939 13.2357 15.0441 13.4209 15.4146C13.6061 15.785 13.4559 16.2357 13.0854 16.4209L13.0444 16.4414C11.8983 17.0145 10.6069 15.9795 10.9175 14.7363L11.6265 11.9004L11.5854 11.9209C11.215 12.1061 10.7643 11.9559 10.5791 11.5854C10.3939 11.215 10.5441 10.7643 10.9146 10.5791L10.9556 10.5586ZM12.0073 7.5C12.4215 7.5 12.7573 7.83579 12.7573 8.25V8.25732C12.7573 8.67154 12.4215 9.00732 12.0073 9.00732H12C11.5858 9.00732 11.25 8.67154 11.25 8.25732V8.25C11.25 7.83579 11.5858 7.5 12 7.5H12.0073ZM21.75 12C21.75 17.3848 17.3848 21.75 12 21.75C6.61522 21.75 2.25 17.3848 2.25 12C2.25 6.61522 6.61522 2.25 12 2.25C17.3848 2.25 21.75 6.61522 21.75 12Z"
        fill="currentColor"
      />
    </svg>
  );
}

// «Інформація про доставку» (5052:56949, 1014 x 260) and «Деталі
// повернення» (5192:79156, 1014 x 180): title, two fields 24 apart and
// an optional info line (24-px #a5a5a5 glyph + 14/24 #343435). Phones:
// the read-only fields become key / value rows (values wrap, nothing
// truncates at 320) and the note is 14/20.
export function InfoCard({
  title,
  fields,
  note,
}: {
  title: string;
  fields: { label: string; value: ReactNode }[];
  note?: ReactNode;
}) {
  return (
    <section className={CARD}>
      <h2 className={CARD_TITLE}>{title}</h2>
      <div className="flex flex-col gap-6 max-lg:hidden sm:flex-row">
        {fields.map((f) => (
          <ReadField key={f.label} label={f.label} value={f.value} />
        ))}
      </div>
      <KeyValueList
        className="lg:hidden"
        rows={fields.map((f) => ({ id: f.label, label: f.label, value: f.value }))}
      />
      {note && (
        <div className="flex items-start gap-2">
          <InfoCircle24 className="size-6 shrink-0 text-neutral-300" />
          <p className="min-w-0 flex-1 text-[14px] leading-5 text-neutral-800 lg:leading-6">{note}</p>
        </div>
      )}
    </section>
  );
}

// «download» 16 (heroicons-outline, the text button's glyph).
function Download16({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path
        d="M2 12.3333V11C2 10.6318 2.29848 10.3333 2.66667 10.3333C3.03486 10.3333 3.33333 10.6318 3.33333 11V12.3333C3.33333 12.5101 3.40362 12.6797 3.52865 12.8047C3.65367 12.9297 3.82319 13 4 13H12C12.1768 13 12.3463 12.9297 12.4714 12.8047C12.5964 12.6797 12.6667 12.5101 12.6667 12.3333V11C12.6667 10.6318 12.9651 10.3333 13.3333 10.3333C13.7015 10.3333 14 10.6318 14 11V12.3333C14 12.8638 13.7891 13.3723 13.4141 13.7474C13.039 14.1225 12.5304 14.3333 12 14.3333H4C3.46957 14.3333 2.96101 14.1225 2.58594 13.7474C2.21086 13.3723 2 12.8638 2 12.3333ZM7.33333 2.33333C7.33333 1.96514 7.63181 1.66667 8 1.66667C8.36819 1.66667 8.66667 1.96514 8.66667 2.33333V8.72396L10.862 6.52865C11.1223 6.2683 11.5443 6.2683 11.8047 6.52865C12.065 6.789 12.065 7.211 11.8047 7.47135L8.47135 10.8047C8.21101 11.065 7.789 11.065 7.52865 10.8047L4.19531 7.47135C3.93496 7.211 3.93496 6.789 4.19531 6.52865C4.45566 6.2683 4.87767 6.2683 5.13802 6.52865L7.33333 8.72396V2.33333Z"
        fill="currentColor"
      />
    </svg>
  );
}

// «Документи замовлення» card (5052:56950, 1014 x 348): title + «Text
// button» «Завантажити усі документи» (16/22 Medium #4a4a4c + 16-px
// download, gap 2, 231 x 22), then the tiles in two 463-px columns, 24
// apart both ways. A tile needs about 400 px to keep its name and its
// one-line date · size · PDF meta beside the eye / download actions, so
// the grid goes two-up only while the card's content box is at least
// 2 x 400 + 24 = 824 wide (950 at 1710); the 0.7-zoom band from 1024 to
// ~1200 px and tablets get one full-width column instead of 340-px tiles
// with clipped names.
// Phones (TR-25, system spec A16): DocumentRow lines instead of the tiles
// and a full-width outlined «Завантажити все» under them instead of the
// title-row text button.
export function DocumentsCard({ title, documents }: { title: string; documents: OrderDocument[] }) {
  const anyReady = documents.some((d) => d.ready);
  return (
    <section className={`${CARD} @container`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className={CARD_TITLE}>{title}</h2>
        <button
          type="button"
          disabled={!anyReady}
          onClick={() => downloadAll(documents)}
          className="inline-flex cursor-pointer items-center gap-[2px] whitespace-nowrap text-[16px] font-medium leading-[22px] text-[#4a4a4c] transition-colors duration-200 hover:text-brand disabled:cursor-default disabled:opacity-50 max-lg:hidden"
        >
          Завантажити усі документи
          <Download16 className="size-4 shrink-0" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6 max-lg:hidden @min-[824px]:grid-cols-2">
        {documents.map((doc) => (
          <OrderDocumentTile key={doc.id} doc={doc} />
        ))}
      </div>
      <DocumentRowList label={title} className="lg:hidden">
        {documents.map((doc) => (
          <OrderDocumentRow key={doc.id} doc={doc} />
        ))}
      </DocumentRowList>
      <Button
        variant="outlinedDark"
        fullWidth
        disabled={!anyReady}
        onClick={() => downloadAll(documents)}
        className="lg:hidden"
      >
        {COPY.downloadAllShort}
      </Button>
    </section>
  );
}

// One 38-px row of the summary card: «Body/Medium» label in #777779
// (with the 18-px info glyph 8 px after it) and the value on the right.
// Phones let a value that does not fit beside its label (the 182-px
// «Частково оплачено» badge in a 294-px card) drop to its own line.
export function SummaryRow({ label, info, children }: { label: string; info?: boolean; children: ReactNode }) {
  return (
    <div className="flex h-[38px] items-center justify-between gap-4 max-sm:h-auto max-sm:min-h-[38px] max-sm:flex-wrap max-sm:gap-y-1">
      <span className="flex shrink-0 items-center gap-2">
        <span className="whitespace-nowrap text-[16px] leading-6 text-neutral-500">{label}</span>
        {info && <InfoHeadIcon className="size-[18px] text-neutral-500" />}
      </span>
      {children}
    </div>
  );
}

// Plain value (Manrope Medium 16/24 #1d1d1f).
export function SummaryValue({ children, tight }: { children: ReactNode; tight?: boolean }) {
  return (
    <span className={`whitespace-nowrap text-[16px] font-medium text-neutral-900 ${tight ? "leading-[22px]" : "leading-6"}`}>
      {children}
    </span>
  );
}

// Person / company value: ExtraBold underlined; the counterparty is
// clipped to 140 px with an ellipsis (5052:57024).
export function SummaryLink({ children, clip }: { children: string; clip?: boolean }) {
  return (
    <span
      title={clip ? children : undefined}
      className={`whitespace-nowrap text-[16px] font-extrabold leading-6 text-neutral-900 underline decoration-solid [text-underline-position:from-font] ${
        clip ? "w-[140px] truncate text-right tracking-[-0.32px]" : ""
      }`}
    >
      {children}
    </span>
  );
}

// «Підсумок замовлення» (5052:57004, 494 x 508): p-32 gap-32, rows in
// groups (gap 8) separated by the 0.5-px full-width hairline (gap 16).
// `compact` = the phone rows (TR-27 key / value list, 1-px lines): the
// desktop groups then stay desktop-only (they repeat the head's badges).
export function SummaryCard({
  title,
  groups,
  compact,
}: {
  title: string;
  groups: ReactNode[];
  compact?: KeyValueRow[];
}) {
  return (
    <section className="flex flex-col gap-6 bg-white p-6 lg:gap-8 lg:p-8">
      <h2 className={CARD_TITLE}>{title}</h2>
      {compact && <KeyValueList className="lg:hidden" rows={compact} />}
      <div className={compact ? "flex flex-col gap-4 max-lg:hidden" : "flex flex-col gap-4"}>
        {groups.map((g, i) => (
          <div key={i} className="contents">
            {i > 0 && <div aria-hidden className="h-[0.5px] w-full shrink-0 bg-stroke-subtle" />}
            <div className="flex flex-col gap-2">{g}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// The black total block (5052:57038, 494 x 176 / 5192:79242, 494 x 92):
// «Сума замовлення» 20/28 + the sum 24/28 SemiBold -2 %, white, and the
// optional full-width accent Button/Large. Phones: the dark summary
// anatomy (label 14/20 Medium #8e8e8f over the amount 22/28 SemiBold,
// always stacked, so no amount makes the row wrap), 24 to the button.
export function TotalCard({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <section className="flex flex-col gap-6 bg-[#1d1d1f] p-6 lg:gap-8 lg:p-8">
      <div className="flex flex-col items-start gap-2 text-white lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <p className="whitespace-nowrap text-[14px] leading-5 max-lg:font-medium max-lg:text-neutral-400 lg:text-[20px] lg:leading-7">
          {label}
        </p>
        <p className="whitespace-nowrap text-[22px] font-semibold leading-7 tracking-[-0.44px] lg:text-[24px] lg:tracking-[-0.48px]">
          {value}
        </p>
      </div>
      {action && (
        <Button variant="accent" fullWidth onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </section>
  );
}
