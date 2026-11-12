"use client";

import {
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUturnLeftIcon,
  DocumentDuplicateIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminApi, adminUrl } from "../lib/api";
import { countOf, cx, formatMoney, formatNumber, formatDayMonth } from "../lib/format";
import { invalidate, setQueryData, useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import {
  Badge,
  Button,
  DataTable,
  DateCell,
  EmptyState,
  FilterChip,
  FLOAT_SHADOW,
  KebabMenu,
  Page,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Switch,
  TEXT,
  toast,
  TwoLineCell,
  useListParams,
  Z,
  type Column,
  type MenuItem,
  type SelectOption,
} from "../ui";
import {
  PRODUCT_FORMS,
  STOCK_FILTER_LABELS,
  ProductThumb,
  archiveProduct,
  bulkProducts,
  deleteProduct,
  directionShort,
  duplicateProduct,
  productApi,
  productPath,
  refusalText,
  restoreProduct,
  stockColor,
  useProductOptions,
} from "./shared";
import { STOCK_STATES, type ProductBulkAction, type ProductListAnswer, type ProductPatchAnswer, type ProductRow, type StockState } from "./types";

// /admin/products: the catalog as staff see it. Search, filters, sort and
// the page live in the address bar under the same names the list route
// reads (q, direction, category, brand, stock, listed, available, promo,
// preorder, archived, sort, page, limit), so the links other sections make
// (/admin/products?listed=false, ?direction=hotels&category=...) land on
// the right list. Editors toggle "У каталозі" and "В наявності" in place
// and act on a selection from the bar at the bottom.

const DEFAULTS = { sort: "sort", limit: "20" };

// Filters the "Скинути все" button clears; `archived` is a mode of its own.
const FILTER_NAMES = ["q", "direction", "category", "brand", "stock", "listed", "available", "promo", "preorder"] as const;

const SORT_LABELS: Record<string, string> = {
  title: "назва від А до Я",
  "-title": "назва від Я до А",
  price: "спершу дешевші",
  "-price": "спершу дорожчі",
  stockQty: "спершу менший залишок",
  "-stockQty": "спершу більший залишок",
  updatedAt: "спершу давно змінені",
  "-updatedAt": "спершу нещодавно змінені",
  "-sort": "порядок каталогу з кінця",
};

type Override = Partial<Pick<ProductRow, "listed" | "available">>;

// --- small parts ---------------------------------------------------------------------

// A filter that is either on or off, as a pill: white with a hairline when
// off, the panel's black when on (the toolbar's own "pressed" look).
function TogglePill({ label, pressed, onToggle }: { label: string; pressed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cx(
        "inline-flex h-8 shrink-0 cursor-pointer items-center rounded-full border px-3.5 text-[13px] font-medium leading-[18px]",
        "outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none",
        pressed
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-stroke-subtle bg-white text-neutral-800 hover:border-neutral-800",
      )}
    >
      {label}
    </button>
  );
}

function ProductCell({ row }: { row: ProductRow }) {
  const sub = [row.sku ? `Арт. ${row.sku}` : "Без артикулу", row.volume].filter(Boolean).join(", ");
  return (
    <span className="flex min-w-[150px] items-center gap-3 min-[640px]:min-w-[220px]">
      <ProductThumb src={row.image} />
      <span className="flex min-w-0 flex-col">
        <span className="line-clamp-2 font-semibold text-neutral-900 [overflow-wrap:anywhere]">{row.title}</span>
        <span className={cx(TEXT.caption, "truncate")}>{sub}</span>
      </span>
    </span>
  );
}

// The retail price (with the struck price before a promo) over the partner
// price when the product has one of its own. On phones the struck price
// goes under the price and the partner price stays in the editor.
function PriceCell({ row }: { row: ProductRow }) {
  const old =
    row.oldPrice !== null ? (
      <>
        <span className="sr-only">Без акції: </span>
        <span className="line-through">{formatMoney(row.oldPrice)}</span>
      </>
    ) : null;
  return (
    <span className="inline-flex flex-col items-end tabular-nums">
      <span className="flex items-baseline gap-1.5">
        {old && <span className={cx(TEXT.caption, "max-[639px]:hidden")}>{old}</span>}
        <span className="font-semibold text-neutral-900">{formatMoney(row.price)}</span>
      </span>
      {old && <span className={cx(TEXT.caption, "min-[640px]:hidden")}>{old}</span>}
      {row.partnerPrice !== null && <span className={cx(TEXT.caption, "max-[639px]:hidden")}>Партнерам {formatMoney(row.partnerPrice)}</span>}
    </span>
  );
}

function StockCell({ row }: { row: ProductRow }) {
  return (
    <span className="inline-flex flex-col items-end tabular-nums">
      {row.stockQty === null ? (
        <span className="text-neutral-400" title="Облікова система ще не надсилала залишок">
          -
        </span>
      ) : (
        <span className="font-semibold" style={{ color: stockColor(row.stock) }} title={STOCK_FILTER_LABELS[row.stock]}>
          {formatNumber(row.stockQty)}
        </span>
      )}
      {row.expectedDate && <span className={TEXT.caption}>Очікується {formatDayMonth(row.expectedDate)}</span>}
    </span>
  );
}

function StateBadges({ row }: { row: ProductRow }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {row.archived ? (
        <Badge tone="neutral">Архів</Badge>
      ) : row.listed ? (
        <Badge tone="green">У каталозі</Badge>
      ) : (
        <Badge tone="neutral">Приховано</Badge>
      )}
      {!row.available && <Badge tone="red">Немає в наявності</Badge>}
    </span>
  );
}

// --- the screen --------------------------------------------------------------------------

export function ProductsScreen() {
  const router = useRouter();
  const { can } = useStaff();
  const canEdit = can("catalog.edit");
  const list = useListParams({ defaults: DEFAULTS });
  const key = `/products?${list.queryString}`;
  const products = useAdminQuery<ProductListAnswer>(key);
  const options = useProductOptions();
  const directions = options.data?.directions ?? [];

  const archived = list.get("archived") === "true";
  const direction = list.get("direction");
  const category = list.get("category");
  const brand = list.get("brand");
  const stock = list.get("stock") as StockState | "";

  // Selection: ids across pages of the same filter; a new filter starts a
  // new selection (the rows picked before are no longer in view).
  const filterKey = list.queryString.replace(/(^|&)(page|limit)=[^&]*/g, "");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectionFor, setSelectionFor] = useState(filterKey);
  if (selectionFor !== filterKey) {
    setSelectionFor(filterKey);
    setSelected([]);
  }
  const [bulkBusy, setBulkBusy] = useState<ProductBulkAction | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});

  const anyFilter = FILTER_NAMES.some((name) => list.get(name) !== "");
  const sortChanged = list.sort !== DEFAULTS.sort;

  // --- filter controls -------------------------------------------------------------

  const directionOptions: SelectOption<string>[] = directions.map((item) => ({
    value: item.slug,
    label: directionShort(item),
    hint: item.title,
  }));
  const categoryOptions: SelectOption<string>[] = directions
    .filter((item) => !direction || item.slug === direction)
    .flatMap((item) =>
      item.categories.map((card) => ({
        value: `${item.slug}/${card.slug}`,
        label: card.label,
        hint: direction ? undefined : directionShort(item),
      })),
    );
  const categoryValue = direction && category ? `${direction}/${category}` : null;
  const brandOptions: SelectOption<string>[] = (options.data?.brands ?? []).map((name) => ({ value: name, label: name }));
  if (brand && !brandOptions.some((option) => option.value === brand)) brandOptions.unshift({ value: brand, label: brand });
  const stockOptions: SelectOption<StockState>[] = STOCK_STATES.map((state) => ({
    value: state.value,
    label: STOCK_FILTER_LABELS[state.value],
  }));

  const directionTitle = (slug: string) => directionShort(directions.find((item) => item.slug === slug)) || slug;
  const categoryTitle = (slug: string) => {
    const labels = directions
      .filter((item) => !direction || item.slug === direction)
      .flatMap((item) => item.categories.filter((card) => card.slug === slug).map((card) => card.label));
    return labels.length ? labels.join(" / ") : slug;
  };

  const chips = [
    ...(list.q ? [{ key: "q", label: `Пошук: ${list.q}`, onRemove: () => list.set({ q: null }) }] : []),
    ...(direction ? [{ key: "direction", label: `Напрям: ${directionTitle(direction)}`, onRemove: () => list.set({ direction: null, category: null }) }] : []),
    ...(category ? [{ key: "category", label: `Категорія: ${categoryTitle(category)}`, onRemove: () => list.set({ category: null }) }] : []),
    ...(brand ? [{ key: "brand", label: `Бренд: ${brand}`, onRemove: () => list.set({ brand: null }) }] : []),
    ...(stock ? [{ key: "stock", label: STOCK_FILTER_LABELS[stock] ?? stock, onRemove: () => list.set({ stock: null }) }] : []),
    ...(sortChanged
      ? [{ key: "sort", label: `Сортування: ${SORT_LABELS[list.sort] ?? list.sort}`, onRemove: () => list.set({ sort: null }) }]
      : []),
  ];

  // A pill of a two-way filter: pressing the pressed one clears it.
  const flagPill = (name: string, value: string, label: string) => (
    <TogglePill
      key={`${name}-${value}`}
      label={label}
      pressed={list.get(name) === value}
      onToggle={() => list.set({ [name]: list.get(name) === value ? null : value })}
    />
  );

  const resetFilters = () => list.set(Object.fromEntries([...FILTER_NAMES.map((name) => [name, null]), ["sort", null]]));

  // --- addresses ----------------------------------------------------------------------

  const exportQuery = list.queryString
    .split("&")
    .filter((part) => !/^(page|limit)=/.test(part))
    .join("&");
  // A new product starts in the category the list is filtered by.
  const newHref =
    direction && category
      ? `/admin/products/new?direction=${encodeURIComponent(direction)}&category=${encodeURIComponent(category)}`
      : "/admin/products/new";

  // --- row actions ---------------------------------------------------------------------

  const rowValue = (row: ProductRow, field: keyof Override): boolean => overrides[row.id]?.[field] ?? row[field];

  const toggle = async (row: ProductRow, field: keyof Override, value: boolean) => {
    setOverrides((current) => ({ ...current, [row.id]: { ...current[row.id], [field]: value } }));
    const result = await adminApi<ProductPatchAnswer>(productApi(row.id), { method: "PATCH", body: { [field]: value } });
    const data = products.data;
    if (result.ok && data) {
      // The answer goes straight into the list on screen, then the lists
      // refresh in the background (a filtered one may drop the row).
      const saved = result.data.product;
      setQueryData<ProductListAnswer>(key, {
        ...data,
        items: data.items.map((item) =>
          item.id === row.id ? { ...item, listed: saved.listed, available: saved.available, updatedAt: saved.updatedAt } : item,
        ),
      });
    }
    setOverrides((current) => {
      const next = { ...current };
      delete next[row.id];
      return next;
    });
    if (!result.ok) {
      toast.error(refusalText(result));
      return;
    }
    invalidate("/products");
    const text =
      field === "listed"
        ? value
          ? "Товар показано в каталозі"
          : "Товар приховано з каталогу"
        : value
          ? "Товар позначено як наявний"
          : "Товар позначено як відсутній";
    toast.success(text);
  };

  const rowMenu = (row: ProductRow): MenuItem[] => {
    const items: MenuItem[] = [
      {
        key: "site",
        label: "Відкрити на сайті",
        icon: ArrowTopRightOnSquareIcon,
        href: row.href,
        disabled: row.archived,
        hint: row.archived ? "в архіві" : undefined,
      },
    ];
    if (!canEdit) return items;
    items.push({
      key: "duplicate",
      label: "Дублювати",
      icon: DocumentDuplicateIcon,
      onSelect: async () => {
        const copy = await duplicateProduct(row.id);
        if (copy) router.push(productPath(copy.id));
      },
    });
    items.push({ key: "divider", divider: true });
    if (row.archived) {
      items.push({ key: "restore", label: "Відновити", icon: ArrowUturnLeftIcon, onSelect: () => void restoreProduct(row.id) });
      items.push({
        key: "delete",
        label: "Видалити назавжди",
        icon: TrashIcon,
        tone: "danger",
        onSelect: () => void deleteProduct(row.id, row.title),
      });
    } else {
      items.push({
        key: "archive",
        label: "Перенести в архів",
        icon: ArchiveBoxIcon,
        tone: "danger",
        onSelect: () => void archiveProduct(row.id, row.title),
      });
    }
    return items;
  };

  // --- columns --------------------------------------------------------------------------

  const columns: Column<ProductRow>[] = [
    { key: "product", header: "Товар", sortKey: "title", cell: (row) => <ProductCell row={row} /> },
    {
      key: "category",
      header: "Категорія",
      hideBelow: 1024,
      cell: (row) =>
        row.orphan ? (
          <span className="flex max-w-[220px] flex-col items-start gap-1">
            <Badge tone="red">Поза каталогом</Badge>
            <span className={cx(TEXT.caption, "max-w-full truncate")}>{row.subcategory || "Без категорії"}</span>
          </span>
        ) : (
          <span className="block max-w-[180px]">
            <TwoLineCell
              title={<span className="font-medium">{row.subcategory}</span>}
              subtitle={directionTitle(row.directionSlug)}
            />
          </span>
        ),
    },
    { key: "price", header: "Ціна", align: "right", sortKey: "price", cell: (row) => <PriceCell row={row} /> },
    { key: "stock", header: "Залишок", align: "right", sortKey: "stockQty", firstSort: "desc", hideBelow: 640, cell: (row) => <StockCell row={row} /> },
  ];

  if (canEdit && !archived) {
    // Both switches in one column: they are what an editor changes most,
    // and two narrow columns of their own would crowd out the product.
    columns.push({
      key: "site",
      header: "На сайті",
      hideBelow: 640,
      interactive: true,
      cell: (row) => (
        <span className="flex flex-col gap-1.5">
          <span title={row.orphan && !row.listed ? "Спершу оберіть категорію каталогу" : undefined}>
            <Switch
              size="sm"
              label="У каталозі"
              checked={rowValue(row, "listed")}
              onChange={(value) => void toggle(row, "listed", value)}
              disabled={overrides[row.id] !== undefined || (row.orphan && !row.listed)}
              aria-label={`Показувати в каталозі: ${row.title}`}
              className="whitespace-nowrap"
            />
          </span>
          <Switch
            size="sm"
            label="В наявності"
            checked={rowValue(row, "available")}
            onChange={(value) => void toggle(row, "available", value)}
            disabled={overrides[row.id] !== undefined}
            aria-label={`В наявності: ${row.title}`}
            className="whitespace-nowrap"
          />
        </span>
      ),
    });
  } else if (!archived) {
    // In the archive every row would read "Архів": no column there.
    columns.push({ key: "state", header: "На сайті", hideBelow: 640, cell: (row) => <StateBadges row={row} /> });
  }

  columns.push(
    { key: "updated", header: "Оновлено", sortKey: "updatedAt", firstSort: "desc", hideBelow: 1280, cell: (row) => <DateCell value={row.updatedAt} withTime /> },
    {
      key: "menu",
      header: <span className="sr-only">Дії</span>,
      interactive: true,
      width: 56,
      // Phones keep the product and its price; the same actions are in the
      // editor's menu one tap away.
      hideBelow: 640,
      cell: (row) => <KebabMenu size="sm" label={`Дії з товаром «${row.title}»`} items={rowMenu(row)} />,
    },
  );

  // --- bulk ---------------------------------------------------------------------------------

  const runBulk = async (action: ProductBulkAction) => {
    setBulkBusy(action);
    const answer = await bulkProducts(selected, action);
    setBulkBusy(null);
    if (answer) setSelected([]);
  };

  const bulkActions: { action: ProductBulkAction; label: string }[] = archived
    ? [{ action: "restore", label: "Відновити" }]
    : [
        { action: "list", label: "Показати в каталозі" },
        { action: "unlist", label: "Приховати" },
        { action: "available", label: "В наявності" },
        { action: "unavailable", label: "Немає в наявності" },
        { action: "archive", label: "Архівувати" },
      ];

  // --- states -----------------------------------------------------------------------------------

  const total = products.data?.total;
  const empty = archived ? (
    <EmptyState
      icon={<ArchiveBoxIcon aria-hidden className="size-6" strokeWidth={1.7} />}
      title={anyFilter ? "В архіві нічого не знайдено" : "В архіві порожньо"}
      text={
        anyFilter
          ? "Змініть пошук або фільтри."
          : "Сюди потрапляють товари, які прибрали з магазину: їх не видно на сайті, але замовлення з ними зберігаються."
      }
      action={
        anyFilter ? (
          <Button size="sm" variant="secondary" onClick={resetFilters}>
            Скинути фільтри
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => list.set({ archived: null })}>
            До товарів
          </Button>
        )
      }
    />
  ) : anyFilter ? (
    <EmptyState
      title="Товарів не знайдено"
      text="Жоден товар не відповідає пошуку та фільтрам. Змініть їх або скиньте."
      action={
        <Button size="sm" variant="secondary" onClick={resetFilters}>
          Скинути фільтри
        </Button>
      }
    />
  ) : (
    <EmptyState
      title="Товарів ще немає"
      text="Додайте перший товар: він з'явиться в каталозі, щойно ви ввімкнете показ."
      action={
        canEdit ? (
          <Button size="sm" iconLeft={PlusIcon} href={newHref}>
            Додати товар
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <Page>
      <PageHeader
        title={archived ? "Архів товарів" : "Товари"}
        light={total !== undefined ? formatNumber(total) : undefined}
        subtitle={
          archived
            ? "Товари, прибрані з магазину: на сайті їх немає, замовлення з ними зберігаються"
            : "Картки, ціни й наявність усього, що продає сайт"
        }
        back={archived ? { href: "/admin/products", label: "До товарів" } : undefined}
        actions={
          <>
            <Button variant="secondary" iconLeft={ArrowDownTrayIcon} href={adminUrl(`/products/export?${exportQuery}`)} external>
              Експорт CSV
            </Button>
            {canEdit && !archived && (
              <Button iconLeft={PlusIcon} href={newHref}>
                Додати товар
              </Button>
            )}
          </>
        }
      />

      {/* The toolbar: search and the lists on top, the yes / no filters
          under them, then what is in effect as removable chips. */}
      <div className="flex min-w-0 flex-col gap-3 pb-4">
        <div className="flex min-w-0 flex-col gap-2 min-[1024px]:flex-row min-[1024px]:flex-wrap min-[1024px]:items-center">
          <div className="w-full min-[1024px]:w-[300px] min-[1024px]:shrink-0">
            <SearchInput label="Пошук товарів" value={list.q} onChange={(q) => list.set({ q })} placeholder="Назва, артикул або код" />
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-2 min-[640px]:flex min-[640px]:flex-wrap">
            <div className="min-w-0 min-[640px]:w-[170px]">
              <Select
                aria-label="Напрям"
                value={direction || null}
                onChange={(next) =>
                  list.set({
                    direction: next,
                    category: next && category && categoryValue?.startsWith(`${next}/`) ? category : null,
                  })
                }
                clearable
                placeholder="Усі напрями"
                options={directionOptions}
              />
            </div>
            <div className="min-w-0 min-[640px]:w-[220px]">
              <Select
                aria-label="Категорія"
                value={categoryValue}
                onChange={(next) => {
                  if (!next) return list.set({ category: null });
                  const [nextDirection, nextCategory] = next.split("/");
                  list.set({ direction: nextDirection, category: nextCategory });
                }}
                clearable
                placeholder="Усі категорії"
                options={categoryOptions}
              />
            </div>
            <div className="min-w-0 min-[640px]:w-[170px]">
              <Select aria-label="Бренд" value={brand || null} onChange={(next) => list.set({ brand: next })} clearable placeholder="Усі бренди" options={brandOptions} />
            </div>
            <div className="min-w-0 min-[640px]:w-[190px]">
              <Select
                aria-label="Залишок на складі"
                value={stock || null}
                onChange={(next) => list.set({ stock: next })}
                clearable
                placeholder="Усі залишки"
                options={stockOptions}
              />
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
          {!archived && (
            <div role="group" aria-label="Показ у каталозі" className="flex flex-wrap gap-1.5">
              {flagPill("listed", "true", "У каталозі")}
              {flagPill("listed", "false", "Приховані")}
            </div>
          )}
          <div role="group" aria-label="Наявність на сайті" className="flex flex-wrap gap-1.5">
            {flagPill("available", "true", "В наявності")}
            {flagPill("available", "false", "Немає в наявності")}
          </div>
          <div role="group" aria-label="Інші позначки" className="flex flex-wrap gap-1.5">
            {flagPill("promo", "true", "Акція")}
            {flagPill("preorder", "true", "Під замовлення")}
          </div>
          <div className="ml-auto flex items-center gap-3">
            {(anyFilter || sortChanged) && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Скинути все
              </Button>
            )}
            <Switch
              size="sm"
              label="Архів"
              checked={archived}
              onChange={(on) => list.set({ archived: on ? "true" : null, listed: null })}
            />
          </div>
        </div>

        {chips.length > 0 && (
          <div className="flex min-w-0 flex-wrap items-center gap-2" role="group" aria-label="Застосовані фільтри">
            {chips.map((chip) => (
              <FilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
            ))}
          </div>
        )}
      </div>

      <DataTable
        caption={archived ? "Архів товарів" : "Товари"}
        columns={columns}
        rows={products.data?.items}
        rowKey={(row) => row.id}
        loading={products.loading}
        stale={products.stale}
        error={products.error}
        onRetry={products.reload}
        sort={list.sort}
        onSort={(sort) => list.set({ sort })}
        rowHref={(row) => productPath(row.id)}
        selection={canEdit ? { selected, onChange: setSelected } : undefined}
        empty={empty}
        footer={
          <Pagination
            page={list.page}
            limit={list.limit}
            total={total ?? 0}
            onPage={(page) => list.set({ page })}
            onLimit={(limit) => list.set({ limit })}
            limits={[20, 50, 100]}
          />
        }
      />

      {canEdit && selected.length > 0 && (
        <div
          role="region"
          aria-label="Дії з вибраними товарами"
          className={cx(
            "sticky bottom-4 mt-4 flex flex-col gap-3 rounded-3xl bg-white p-3 min-[1024px]:flex-row min-[1024px]:items-center min-[1024px]:px-4",
            FLOAT_SHADOW,
            Z.sticky,
          )}
        >
          <div className="flex min-w-0 items-center justify-between gap-3 min-[1024px]:flex-1 min-[1024px]:justify-start">
            <p className={TEXT.bodyStrong}>Вибрано {countOf(selected.length, PRODUCT_FORMS)}</p>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              Зняти вибір
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {bulkActions.map((item) => (
              <Button
                key={item.action}
                size="sm"
                variant={item.action === "archive" ? "dangerGhost" : "secondary"}
                loading={bulkBusy === item.action}
                disabled={bulkBusy !== null && bulkBusy !== item.action}
                onClick={() => void runBulk(item.action)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </Page>
  );
}
