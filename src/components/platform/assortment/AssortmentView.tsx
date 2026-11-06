"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/CartProvider";
import { addMany } from "@/components/cart/store";
import {
  CheckboxOffIcon,
  CheckboxOnIcon,
  ChevronDown16,
  ChevronSideIcon,
  MinusIcon,
  PlusIcon,
} from "@/components/catalog/icons";
import { formatPrice, productHref, productsPlural } from "@/components/catalog/data";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { SortIcon } from "@/components/platform/orderIcons";
import { PAGE_SIZES } from "@/components/platform/orders/data";
import { useDismiss } from "@/components/platform/orders/listParts";
import {
  CabinetPage,
  CabinetPageHead,
  ConfirmModal,
  InfoHeadIcon,
  SignInPrompt,
  StatusPill,
  TableEmptyState,
} from "@/components/platform/ui";
import { SearchField } from "@/components/ui/SearchField";
import { showToast } from "@/components/ui/Toast";
import {
  AVAILABILITY,
  EXCEL_ACCEPT,
  PHONE_STEP,
  resolveRows,
  rowsTotal,
  sortFromValue,
  sortValue,
  type AssortmentRow,
} from "./data";
import { CheckboxMixedIcon, RemoveIcon, TrashIcon } from "./icons";
import { ExcelNoticeMessage, isPhoneNow, PHONE_COPY } from "./parts";
import { PhoneList } from "./PhoneList";
import { PhoneSelectionBar } from "./PhoneSelectionBar";
import {
  assortmentOwner,
  removeLines,
  setLineQty,
  setSelected,
  useAddedKey,
  useAssortmentState,
  writeAddedKey,
} from "./store";

// «Мій асортимент» — Figma 4202:36108 (1710 x 1714) inside the platform
// shell; content column 1606 on the 40 / 32 gutters:
//   title block 208 (py-32): Back «До каталогу» 165 x 40, 24 below the
//     H2 44/48 + 14/24 tagline (gap 8); Button/Large «Завантажити з
//     Excel» 230 x 52 centred on the right;
//   toolbar 78: Search 364 x 46 + 32 below; with checked rows the
//     selection bar 4204:55404 (626 x 42) sits on the right, after the
//     bulk add (4204:55408) it loses the trash (568) and the «Скинути
//     виділення» text button (4376:61553) appears 24 px after the search;
//   table 1534: white r24, #343435 head 64 (pt-8, heads p-16 14/24
//     SemiBold white; info glyphs on the three prices, sort on «Сума»),
//     rows 108 under 0.5-px #d2d2d2 full-width dividers, px-24, cells
//     px-16 py-24: checkbox 56 | product 412 (60-px r12 photo, 16/22 Bold
//     name, 16/24 «Артикул:») | availability pill 204 | prices 150 / 170
//     / 140 (16/24 SemiBold) | stepper 140 | sum 140 | remove 74;
//   pager row 100 + 32 bottom padding.
// Empty (4929:65033): head + the 250-px row «Ваш асортимент ще не
// сформовано» with «Завантажити з Excel» / «Переглянути каталог», no pager.
// Phones (< 640, mobile pass): the toolbar keeps only the search, the
// table / pager / in-flow selection bar are max-lg:hidden and the phone
// tree (PhoneList: meta line, list panel of rows, load-more; the sticky
// PhoneSelectionBar) renders lg:hidden; the Excel notice and the bulk add
// feedback use the shared toast host below 640.

type Sort = "desc" | "asc" | null;

// The Excel import: a hidden .xlsx picker. There is no import endpoint
// yet, so the chosen file is not uploaded (the input is reset so the same
// file can be picked again); a status note says so instead of the button
// looking dead.
type ExcelNotice = { name: string; at: number };

function useExcelPicker() {
  const ref = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState<ExcelNotice | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 8000);
    return () => window.clearTimeout(t);
  }, [notice]);
  const input = (
    <input
      ref={ref}
      type="file"
      accept={EXCEL_ACCEPT}
      tabIndex={-1}
      aria-hidden
      className="hidden"
      onChange={(e) => {
        const file = e.currentTarget.files?.[0];
        e.currentTarget.value = "";
        if (!file) return;
        setNotice({ name: file.name, at: Date.now() });
        // Phones: the shared toast host (A23) shows the notice; the local
        // desktop toast below is max-lg:hidden.
        if (isPhoneNow()) {
          showToast({ message: <ExcelNoticeMessage name={file.name} />, dismissible: true, durationMs: 8000 });
        }
      }}
    />
  );
  return { input, open: () => ref.current?.click(), notice, dismiss: () => setNotice(null) };
}

// No Figma frame: a minimal status note pinned to the bottom of the
// window (it does not move the page layout), #1d1d1f pill, 14/24 white,
// closed by its cross or after 8 s. The live region stays mounted so the
// note is announced.
function ExcelNoticeToast({ notice, onClose }: { notice: ExcelNotice | null; onClose: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 max-lg:hidden"
    >
      {notice && (
        <div className="pointer-events-auto flex max-w-[560px] items-center gap-3 rounded-3xl bg-neutral-900 py-3 pl-5 pr-3 text-[14px] leading-6 text-white shadow-[0px_2px_6px_0px_rgba(29,29,31,0.1)]">
          <p>
            Імпорт з Excel ще недоступний: файл «{notice.name}» не завантажено.
          </p>
          <button
            type="button"
            aria-label="Закрити повідомлення"
            onClick={onClose}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-colors duration-200 hover:text-brand"
          >
            <RemoveIcon className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ table atoms

function Checkbox({
  checked,
  mixed = false,
  onToggle,
  label,
  tone = "dark",
  disabled = false,
}: {
  checked: boolean;
  mixed?: boolean;
  onToggle: () => void;
  label: string;
  tone?: "dark" | "light";
  disabled?: boolean;
}) {
  const off = tone === "light" ? "text-white" : "text-neutral-900";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? "mixed" : checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className="relative flex size-6 cursor-pointer items-center justify-center disabled:cursor-default before:absolute before:-inset-2 before:content-['']"
    >
      {mixed ? (
        <CheckboxMixedIcon className="size-6 text-brand" />
      ) : checked ? (
        <CheckboxOnIcon className="size-6 text-brand" />
      ) : (
        <CheckboxOffIcon className={`size-6 ${off}`} />
      )}
    </button>
  );
}

// Stepper of 4204:42463: 16-px minus, 8, the 20/22 Bold count hugging
// its digits, 8, 16-px plus; no frame. The glyph buttons get an 8-px
// invisible hit area around the 16-px box.
function RowStepper({ qty, onQty, name }: { qty: number; onQty: (n: number) => void; name: string }) {
  const btn =
    "relative flex size-4 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 hover:text-brand disabled:cursor-default disabled:text-neutral-400 before:absolute before:-inset-2 before:content-['']";
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Зменшити кількість: ${name}`}
        disabled={qty <= 1}
        onClick={() => onQty(qty - 1)}
        className={btn}
      >
        <MinusIcon className="size-4" />
      </button>
      <span className="whitespace-nowrap text-[20px] font-bold leading-[22px] tracking-[0.2px] text-neutral-900">
        <RollingNumber value={qty} />
      </span>
      <button type="button" aria-label={`Збільшити кількість: ${name}`} onClick={() => onQty(qty + 1)} className={btn}>
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}

// «<TableHead>»: p-16 (the cells right of «Товар» sit 2 px further in -
// the master's head columns are 414 / 72 while the rows are 412 / 74, so
// the labels keep their master x over the row columns).
function Head({
  children,
  className = "",
  shifted = false,
  info = false,
  sort,
  onSort,
}: {
  children?: ReactNode;
  className?: string;
  shifted?: boolean;
  info?: boolean;
  sort?: Sort;
  onSort?: () => void;
}) {
  const pad = shifted ? "py-4 pl-[18px] pr-[14px]" : "p-4";
  const inner = (
    <>
      {children && (
        <span className="whitespace-nowrap text-[14px] font-semibold leading-6 text-white">{children}</span>
      )}
      {(info || onSort) && (
        <span className="flex items-start pl-2 pr-1">
          {onSort ? (
            <SortIcon className={`size-[18px] ${sort ? "text-brand" : "text-[#bbbbbc]"}`} />
          ) : (
            <InfoHeadIcon className="size-[18px] text-[#bbbbbc]" />
          )}
        </span>
      )}
    </>
  );
  return (
    <th
      scope="col"
      aria-sort={onSort ? (sort === "asc" ? "ascending" : sort === "desc" ? "descending" : "none") : undefined}
      className={`p-0 pt-2 text-left font-normal ${className}`}
    >
      {onSort ? (
        <button
          type="button"
          onClick={onSort}
          aria-label={`Сортувати за сумою`}
          className={`flex h-14 w-full cursor-pointer items-center gap-1 ${pad}`}
        >
          {inner}
        </button>
      ) : (
        <span className={`flex h-14 items-center gap-1 ${pad}`}>{inner}</span>
      )}
    </th>
  );
}

const CELL = "px-4 align-middle";
// Rows 108 under a 0.5-px full-width divider (Divider instances
// 1534 x 0.5 between every row, also under the head): the cells pad
// 24.5 on top so the hairline takes no extra layout.
const ROW =
  "[background:linear-gradient(var(--color-stroke-subtle),var(--color-stroke-subtle))_0_0/100%_0.5px_no-repeat] [&>td]:pt-[24.5px] [&>td]:pb-6";

function TableHeadRow({
  allChecked,
  someChecked,
  onToggleAll,
  sort,
  onSort,
  disabled,
}: {
  allChecked: boolean;
  someChecked: boolean;
  onToggleAll: () => void;
  sort: Sort;
  onSort: () => void;
  disabled: boolean;
}) {
  return (
    <thead>
      <tr className="bg-neutral-800">
        <th aria-hidden className="w-6 p-0 pt-2" />
        <th scope="col" className="w-14 p-0 pt-2 text-left font-normal">
          <span className="flex h-14 items-center p-4">
            <Checkbox
              tone="light"
              checked={allChecked}
              mixed={someChecked && !allChecked}
              onToggle={onToggleAll}
              disabled={disabled}
              label="Обрати всі товари на сторінці"
            />
          </span>
        </th>
        <Head>Товар</Head>
        <Head className="w-[204px]" shifted>
          Доступність товару
        </Head>
        <Head className="w-[150px]" shifted info>
          Оптова ціна
        </Head>
        <Head className="w-[170px]" shifted info>
          Роздрібна ціна
        </Head>
        <Head className="w-[140px]" shifted info>
          Ваша ціна
        </Head>
        <Head className="w-[140px]" shifted>
          Кількість
        </Head>
        <Head className="w-[140px]" shifted sort={sort} onSort={onSort}>
          Сума
        </Head>
        <th aria-hidden className="w-[74px] p-0 pt-2" />
        <th aria-hidden className="w-6 p-0 pt-2" />
      </tr>
    </thead>
  );
}

function AssortmentTableRow({
  row,
  checked,
  onToggle,
  onQty,
  onRemove,
}: {
  row: AssortmentRow;
  checked: boolean;
  onToggle: () => void;
  onQty: (n: number) => void;
  onRemove: () => void;
}) {
  const badge = AVAILABILITY[row.availability];
  return (
    <tr className={ROW} data-row={row.id}>
      <td aria-hidden className="w-6 p-0" />
      <td className={CELL}>
        <Checkbox checked={checked} onToggle={onToggle} label={`Обрати «${row.name}»`} />
      </td>
      <td className={CELL}>
        <div className="flex min-w-0 items-center gap-4">
          <span className="relative size-[60px] shrink-0 overflow-clip rounded-xl bg-bg-product">
            <img
              src={row.product.image}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-cover"
            />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[7px]">
            <Link
              href={productHref(row.product)}
              title={row.name}
              className="truncate text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900 transition-colors duration-200 hover:text-brand"
            >
              {row.name}
            </Link>
            <span className="truncate text-[16px] leading-6 text-neutral-800">Артикул: {row.sku}</span>
          </span>
        </div>
      </td>
      <td className={CELL}>
        <StatusPill tone={badge.tone}>{badge.label}</StatusPill>
      </td>
      <td className={`${CELL} whitespace-nowrap text-[16px] font-semibold leading-6 text-neutral-900`}>
        {formatPrice(row.wholesale)}
      </td>
      <td className={`${CELL} whitespace-nowrap text-[16px] font-semibold leading-6 text-neutral-900`}>
        {formatPrice(row.retail)}
      </td>
      <td className={`${CELL} whitespace-nowrap text-[16px] font-semibold leading-6 text-neutral-900`}>
        {formatPrice(row.partner)}
      </td>
      <td className={CELL}>
        <RowStepper qty={row.qty} name={row.name} onQty={onQty} />
      </td>
      <td className={`${CELL} whitespace-nowrap text-[16px] font-semibold leading-6 text-neutral-900`}>
        <RollingNumber value={row.sum} format={formatPrice} />
      </td>
      <td className={CELL}>
        <button
          type="button"
          aria-label={`Видалити «${row.name}» з асортименту`}
          data-action="remove"
          onClick={onRemove}
          className="flex size-[42px] cursor-pointer items-center justify-center rounded-[26px] text-neutral-900 transition-colors duration-200 hover:bg-bg-subtle hover:text-brand"
        >
          <RemoveIcon className="size-6" />
        </button>
      </td>
      <td aria-hidden className="w-6 p-0" />
    </tr>
  );
}

// «<TableCellRow>» 4990:72271 as a table row. The shared TableEmptyRow
// draws the orders master's 0.5-px hairline under the head; the
// assortment master has none (head 64 + row 250 = the 314 block), so
// the state goes into a plain full-width cell. Below lg the cell spans
// the 1400-px scroll width while the card shows only its own width: the
// block is pinned to the visible part (sticky left 0, as wide as the
// scroller = 100cqw of the table card's inline-size container), so the
// title, text and buttons are readable without scrolling sideways.
function EmptyRow(props: Parameters<typeof TableEmptyState>[0]) {
  return (
    <tr>
      <td colSpan={11} className="p-0" data-block="empty">
        <div>
          <TableEmptyState {...props} />
        </div>
      </td>
    </tr>
  );
}

// ------------------------------------------------------------ toolbar

// Selection bar 4204:55404: «Обрано: N товарів» | «Сума: X ₴» (16/24
// Regular + 20/22 Bold, gap 8; groups 24 apart around a 24-px #d2d2d2
// hairline), 32, Button/Small accent «Додати у кошик» 169 x 42 and the
// 42-px outlined trash (gap 16). After the bulk add (4376:61556) the
// trash is gone. The «Сума:» group keeps Figma's 156-px box (4204:55398 =
// 45 + 8 + 103) as a minimum: Figma's value reads «7  247,50 ₴» with a
// designer double space (103 wide), the site prints one space (98), and
// the bar is right-aligned, so without the floor every bar item would
// start ~5 px right of the master (1052 / 1110).
function SelectionBar({
  count,
  total,
  added,
  onAdd,
  onRemove,
}: {
  count: number;
  total: number;
  added: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div data-block="selection-bar" className="flex flex-wrap items-center gap-x-8 gap-y-4 max-lg:hidden">
      <div className="flex items-center gap-6" aria-live="polite">
        <p className="flex items-center gap-2 whitespace-nowrap text-neutral-900">
          <span className="text-[16px] leading-6">Обрано:</span>
          <span className="text-[20px] font-bold leading-[22px] tracking-[0.2px]">
            <RollingNumber value={count} format={(n) => `${n} ${productsPlural(n)}`} />
          </span>
        </p>
        <span aria-hidden className="-mr-px h-6 w-px shrink-0 bg-stroke-subtle" />
        <p className="flex min-w-[156px] items-center gap-2 whitespace-nowrap text-neutral-900">
          <span className="text-[16px] leading-6">Сума:</span>
          <RollingNumber
            value={total}
            format={formatPrice}
            className="text-[20px] font-bold leading-[22px] tracking-[0.2px]"
          />
        </p>
      </div>
      <div className="flex items-center gap-4">
        <Button type="button" size="small" variant="accent" onClick={onAdd}>
          Додати у кошик
        </Button>
        {!added && (
          <button
            type="button"
            aria-label="Видалити обрані товари з асортименту"
            onClick={onRemove}
            className="flex size-[42px] cursor-pointer items-center justify-center rounded-[26px] border border-neutral-900 text-neutral-900 transition-colors duration-200 hover:border-brand hover:bg-brand hover:text-white"
          >
            <TrashIcon className="size-6" />
          </button>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ view

type PendingRemoval = { ids: string[]; name?: string };

export function AssortmentView() {
  const { user } = useAuth();
  const { openCart } = useCart();
  // Each partner keeps an assortment of their own (store.ts); null for
  // visitors and B2C customers.
  const owner = assortmentOwner(user);
  const { lines, selected } = useAssortmentState(owner);
  const excel = useExcelPicker();
  const tableRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>(null);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);
  // Phones: rows shown by the load-more batches (back to 10 on a search /
  // sort change; the desktop pager keeps `page`).
  const [shownCount, setShownCount] = useState(PHONE_STEP);
  const [sizeOpen, setSizeOpen] = useState(false);
  // The rows the confirmation modal asks about; kept after closing so
  // the copy does not change while the modal fades out.
  const [pending, setPending] = useState<PendingRemoval>({ ids: [] });
  const [removalOpen, setRemovalOpen] = useState(false);
  const askRemoval = (next: PendingRemoval) => {
    setPending(next);
    setRemovalOpen(true);
  };
  // Snapshot of the selection (ids + quantities) the last bulk add sent
  // to the cart: while the selection still equals it the page shows the
  // «Додано у кошик» state; any change brings the trash back. Kept for
  // the tab session (store.ts), so a reload does not re-arm a second add.
  const addedKey = useAddedKey(owner ? owner.id : null);
  const sizeRef = useRef<HTMLDivElement | null>(null);
  useDismiss(sizeOpen, sizeRef, () => setSizeOpen(false));

  const rows = useMemo(() => resolveRows(lines), [lines]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedRows = useMemo(() => rows.filter((r) => selectedSet.has(r.id)), [rows, selectedSet]);
  const selectionKey = selectedRows.map((r) => `${r.id}:${r.qty}`).join("|");
  const added = selectedRows.length > 0 && addedKey === selectionKey;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? rows.filter((r) => `${r.name} ${r.sku} ${r.product.subcategory}`.toLowerCase().includes(q))
      : rows;
    if (!sort) return list;
    return [...list].sort((a, b) => (sort === "asc" ? a.sum - b.sum : b.sum - a.sum));
  }, [rows, query, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const paged = filtered.slice((current - 1) * pageSize, current * pageSize);
  const first = filtered.length === 0 ? 0 : (current - 1) * pageSize + 1;
  const last = Math.min(current * pageSize, filtered.length);
  const windowStart = Math.max(1, Math.min(current - 2, pages - 4));
  const numbers = Array.from({ length: Math.min(5, pages) }, (_, i) => windowStart + i);

  const pageIds = paged.map((r) => r.id);
  const shown = filtered.slice(0, shownCount);
  const shownIds = shown.map((r) => r.id);
  const pageChecked = pageIds.filter((id) => selectedSet.has(id)).length;
  const allChecked = pageIds.length > 0 && pageChecked === pageIds.length;

  // Visitors and B2C customers: the assortment belongs to the partner
  // cabinet.
  if (!owner) {
    return (
      <SignInPrompt
        title="Мій асортимент"
        text="Швидке замовлення регулярних товарів доступне в особистому кабінеті бізнес-клієнта."
      />
    );
  }

  const toggle = (id: string) =>
    setSelected(owner, selectedSet.has(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  const toggleAll = () =>
    setSelected(
      owner,
      allChecked ? selected.filter((id) => !pageIds.includes(id)) : [...selected, ...pageIds],
    );

  // Phones toggle every shown row (on / mixed / off like the desktop head
  // checkbox over the page).
  const toggleShown = () => {
    const allShown = shownIds.length > 0 && shownIds.every((id) => selectedSet.has(id));
    setSelected(owner, allShown ? selected.filter((id) => !shownIds.includes(id)) : [...selected, ...shownIds]);
  };

  // Desktop opens the cart drawer as today; phones keep the page and show
  // the «Додано у кошик» toast with «Кошик» (DECISIONS O-11), the bar
  // flips to «Відкрити кошик».
  const addSelected = () => {
    addMany(selectedRows.map((r) => ({ id: r.id, qty: r.qty })));
    writeAddedKey(owner.id, selectionKey);
    if (isPhoneNow()) {
      showToast({
        message: PHONE_COPY.added,
        action: { label: PHONE_COPY.cart, onClick: openCart },
        dismissible: true,
        durationMs: 5000,
      });
    } else {
      openCart();
    }
  };

  const filteredIds = new Set(filtered.map((r) => r.id));
  const hiddenBySearch = query.trim() ? selectedRows.filter((r) => !filteredIds.has(r.id)).length : 0;

  const changeQuery = (v: string) => {
    setQuery(v);
    setPage(1);
    setShownCount(PHONE_STEP);
  };

  // The opener of the confirmation (a row «×» or the bar's trash) leaves
  // the DOM with the removal, so the modal cannot hand focus back to it:
  // focus moves to the remove button of the row that takes the first
  // removed row's place (the new last row at the end of a page), else to
  // the empty state's first button, else to the search.
  const confirmRemoval = () => {
    if (isPhoneNow()) {
      confirmRemovalPhone();
      return;
    }
    const at = pending.ids.map((id) => pageIds.indexOf(id)).filter((i) => i >= 0);
    const index = at.length > 0 ? Math.min(...at) : 0;
    removeLines(owner, pending.ids);
    setRemovalOpen(false);
    requestAnimationFrame(() => {
      const root = tableRef.current;
      if (!root) return;
      const removes = [...root.querySelectorAll<HTMLElement>('tbody button[data-action="remove"]')];
      const target =
        removes[Math.min(index, removes.length - 1)] ??
        root.querySelector<HTMLElement>('[data-block="empty"] button, [data-block="empty"] a') ??
        root.closest("main")?.querySelector<HTMLElement>('input[type="search"]');
      target?.focus();
    });
  };

  // Phones: the same hand-off in the visible list, without scrolling: a
  // single removal focuses the remove disc of the row that slides into
  // the removed row's place, a bulk removal the checkbox of the first
  // remaining row at the smallest removed index; nothing left -> the
  // empty panel's link, no match left -> the search.
  const confirmRemovalPhone = () => {
    const at = pending.ids.map((id) => shownIds.indexOf(id)).filter((i) => i >= 0);
    const index = at.length > 0 ? Math.min(...at) : 0;
    const single = pending.ids.length === 1 && Boolean(pending.name);
    removeLines(owner, pending.ids);
    writeAddedKey(owner.id, null);
    setRemovalOpen(false);
    requestAnimationFrame(() => {
      const root = listRef.current;
      if (!root) return;
      const items = [
        ...root.querySelectorAll<HTMLElement>(
          single ? 'li button[data-action="remove"]' : 'li button[role="checkbox"]',
        ),
      ];
      const item = items[Math.min(index, items.length - 1)];
      const target =
        item ??
        root.querySelector<HTMLElement>('[data-block="empty"] a') ??
        root.closest("main")?.querySelector<HTMLElement>('input[type="search"]');
      if (!target) return;
      target.focus({ preventScroll: true });
      if (item) {
        const r = item.getBoundingClientRect();
        if (r.top < 66 || r.bottom > window.innerHeight) (item.closest("li") ?? item).scrollIntoView({ block: "nearest" });
      }
    });
  };

  const empty = rows.length === 0;
  const removalTitle =
    pending.ids.length > 1
      ? `Видалити ${pending.ids.length} ${productsPlural(pending.ids.length)}?`
      : "Видалити товар?";
  const removalBody = pending.name
    ? `Ви впевнені, що хочете видалити «${pending.name}» з асортименту? Цю дію неможливо скасувати.`
    : "Ви впевнені, що хочете видалити обрані товари з асортименту? Цю дію неможливо скасувати.";

  return (
    <CabinetPage flushBottom={selectedRows.length > 0}>
      {excel.input}
      <ExcelNoticeToast notice={excel.notice} onClose={excel.dismiss} />
      <CabinetPageHead
        className="lg:h-[208px]"
        back={{ label: "До каталогу", href: "/catalog" }}
        title="Мій асортимент"
        subtitle="Швидке замовлення регулярних товарів: оберіть потрібні позиції та додайте їх у кошик в один клік."
        actions={
          <Button type="button" size="responsive" onClick={excel.open}>
            Завантажити з Excel
          </Button>
        }
      />

      {/* Toolbar 4204:54196 (78 = 46 + 32). */}
      <div
        data-block="toolbar"
        className={`flex flex-col gap-4 px-6 lg:min-h-[46px] lg:flex-row lg:items-center lg:justify-between lg:pb-8 lg:pl-10 lg:pr-8 ${empty ? "max-lg:hidden" : ""}`}
      >
        <div className="flex flex-wrap items-center gap-6">
          <SearchField
            value={query}
            onChange={changeQuery}
            label="Пошук товарів в асортименті"
            className="w-full lg:w-[364px]"
          />
          {added && (
            <button
              type="button"
              data-block="reset-selection"
              onClick={() => setSelected(owner, [])}
              className="cursor-pointer whitespace-nowrap text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand max-lg:hidden"
            >
              Скинути виділення
            </button>
          )}
        </div>
        {selectedRows.length > 0 && (
          <SelectionBar
            count={selectedRows.length}
            total={rowsTotal(selectedRows)}
            added={added}
            onAdd={addSelected}
            onRemove={() => askRemoval({ ids: selectedRows.map((r) => r.id) })}
          />
        )}
      </div>

      <div className="px-6 max-lg:hidden lg:pl-10 lg:pr-8">
        <div ref={tableRef} data-block="table" className="overflow-x-auto rounded-3xl bg-white">
          <table className="w-full min-w-[1400px] table-fixed border-separate border-spacing-0">
            <TableHeadRow
              allChecked={allChecked}
              someChecked={pageChecked > 0}
              onToggleAll={toggleAll}
              sort={sort}
              onSort={() => {
                setSort((s) => (s === null ? "desc" : s === "desc" ? "asc" : null));
                setPage(1);
                setShownCount(PHONE_STEP);
              }}
              disabled={paged.length === 0}
            />
            <tbody>
              {empty ? (
                <EmptyRow
                  size="lg"
                  title="Ваш асортимент ще не сформовано"
                  text="Зробіть перше замовлення, щоб автоматично додати ваші найзатребуваніші товари, або завантажте власний список товарів з Excel."
                  actions={
                    <>
                      <Button type="button" size="small" variant="outlinedDark" onClick={excel.open}>
                        Завантажити з Excel
                      </Button>
                      <Button href="/catalog" size="small" variant="accent">
                        Переглянути каталог
                      </Button>
                    </>
                  }
                />
              ) : paged.length === 0 ? (
                <EmptyRow title="Нічого не знайдено" text={`За запитом «${query.trim()}» товарів в асортименті немає.`} />
              ) : (
                paged.map((row) => (
                  <AssortmentTableRow
                    key={row.id}
                    row={row}
                    checked={selectedSet.has(row.id)}
                    onToggle={() => toggle(row.id)}
                    onQty={(n) => setLineQty(owner, row.id, n)}
                    onRemove={() => askRemoval({ ids: [row.id], name: row.name })}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pager 4204:41357 (1606 x 100): «1-10 із 48» + «Показувати по:»
          with the 59 x 34 size pill on the left, the 52-px page buttons
          (gap 10) on the right. Absent in the empty state. */}
      {!empty && filtered.length > 0 && (
        <div
          data-block="pager"
          className="flex flex-col gap-4 px-6 py-6 max-lg:hidden sm:flex-row sm:items-center sm:justify-between lg:h-[100px] lg:py-0 lg:pl-10 lg:pr-8"
        >
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[16px] font-semibold leading-[22px] text-neutral-800">
              {first}-{last} із {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-button-md text-neutral-500">Показувати по:</span>
              <div ref={sizeRef} className="relative">
                <button
                  type="button"
                  aria-label="Кількість товарів на сторінці"
                  aria-haspopup="listbox"
                  aria-expanded={sizeOpen}
                  onClick={() => setSizeOpen((v) => !v)}
                  className="flex h-[34px] cursor-pointer items-center gap-[2px] rounded-3xl border border-stroke-subtle bg-white px-[11px] text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
                >
                  {pageSize}
                  <ChevronDown16 className={`size-4 shrink-0 transition-[rotate] duration-200 ${sizeOpen ? "rotate-180" : ""}`} />
                </button>
                {sizeOpen && (
                  <ul role="listbox" className="absolute bottom-full left-0 z-20 mb-2 min-w-[120px] rounded-2xl border border-stroke-subtle bg-white p-2 shadow-lg">
                    {PAGE_SIZES.map((n) => (
                      <li key={n} role="none">
                        <button
                          type="button"
                          role="option"
                          aria-selected={n === pageSize}
                          onClick={() => {
                            setPageSize(n);
                            setPage(1);
                            setSizeOpen(false);
                          }}
                          className={`block w-full cursor-pointer rounded-xl px-4 py-2 text-left text-button-md hover:text-brand ${
                            n === pageSize ? "text-brand" : "text-neutral-700"
                          }`}
                        >
                          {n}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {pages > 1 && (
            <nav aria-label="Сторінки асортименту" className="flex flex-wrap items-center gap-1 sm:gap-[10px]">
              <button
                type="button"
                aria-label="Попередня сторінка"
                disabled={current === 1}
                onClick={() => setPage(current - 1)}
                className="flex size-10 cursor-pointer items-center justify-center rounded-[26px] text-neutral-900 transition-colors duration-200 hover:text-brand disabled:cursor-default disabled:text-neutral-400 sm:size-[52px]"
              >
                <ChevronSideIcon className="size-6" />
              </button>
              {numbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`Сторінка ${n}`}
                  aria-current={n === current ? "page" : undefined}
                  onClick={() => setPage(n)}
                  className={`flex size-10 cursor-pointer items-center justify-center rounded-[26px] text-[18px] font-semibold leading-[22px] tracking-[0.18px] transition-colors duration-200 sm:size-[52px] ${
                    n === current ? "bg-brand text-white" : "text-neutral-900 hover:text-brand"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                aria-label="Наступна сторінка"
                disabled={current === pages}
                onClick={() => setPage(current + 1)}
                className="flex size-10 cursor-pointer items-center justify-center rounded-[26px] text-neutral-900 transition-colors duration-200 hover:text-brand disabled:cursor-default disabled:text-neutral-400 sm:size-[52px]"
              >
                <ChevronSideIcon mirrored className="size-6" />
              </button>
            </nav>
          )}
        </div>
      )}

      <PhoneList
        rootRef={listRef}
        empty={empty}
        query={query}
        shown={shown}
        total={filtered.length}
        selected={selectedSet}
        sort={sortValue(sort)}
        onSort={(v) => {
          setSort(sortFromValue(v));
          setPage(1);
          setShownCount(PHONE_STEP);
        }}
        onToggle={toggle}
        onToggleShown={toggleShown}
        onQty={(id, n) => setLineQty(owner, id, n)}
        onRemove={(row) => askRemoval({ ids: [row.id], name: row.name })}
        onMore={() => setShownCount(shown.length + PHONE_STEP)}
        onResetSearch={() => {
          changeQuery("");
          requestAnimationFrame(() =>
            listRef.current
              ?.closest("main")
              ?.querySelector<HTMLElement>('input[type="search"]')
              ?.focus({ preventScroll: true }),
          );
        }}
        focusAfterMore={() =>
          listRef.current?.querySelectorAll<HTMLElement>('li button[role="checkbox"]')[shown.length] ?? null
        }
      />

      <ConfirmModal
        open={removalOpen}
        onClose={() => setRemovalOpen(false)}
        onConfirm={confirmRemoval}
        title={removalTitle}
        body={removalBody}
      />

      {selectedRows.length > 0 && (
        <PhoneSelectionBar
          count={selectedRows.length}
          total={rowsTotal(selectedRows)}
          hiddenBySearch={hiddenBySearch}
          added={added}
          onAdd={addSelected}
          onOpenCart={openCart}
          onRemove={() => askRemoval({ ids: selectedRows.map((r) => r.id) })}
          onReset={() => {
            setSelected(owner, []);
            writeAddedKey(owner.id, null);
          }}
        />
      )}
    </CabinetPage>
  );
}
