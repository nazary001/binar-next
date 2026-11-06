"use client";

import type { Ref } from "react";
import { formatPrice, productHref } from "@/components/catalog/data";
import { QtyStepper } from "@/components/catalog/QtyStepper";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { CatalogueIcon } from "@/components/platform/icons";
import { ListPanel, ListRow, RowDisc } from "@/components/platform/ui/RecordRow";
import { StatusPill } from "@/components/platform/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadMore } from "@/components/ui/LoadMore";
import { ProductLine } from "@/components/ui/ProductLine";
import { SortMenu } from "@/components/ui/SortMenu";
import { ASSORTMENT_SORT_OPTIONS, AVAILABILITY, type AssortmentRow } from "./data";
import { RemoveIcon } from "./icons";
import { CheckboxGlyph, PHONE_COPY as COPY, PhoneCheckbox } from "./parts";

// Phone tree of «Мій асортимент» (< 640, lg:hidden; spec
// docs/superpowers/specs/mobile/assortment.md 2.5 - 2.8, 2.12; template
// T2). Below the shared search field of the toolbar:
//   meta line (44 box, text 16 under the search): «Обрати всі» over the
//     shown rows (on / mixed / off) | SortMenu (the desktop «Сума» head
//     sort);
//   24, ListPanel (white r32 on the slab) of rows, lines 12 apart:
//     A checkbox | availability pill | remove disc (the pill drops to its
//       own line when the row content is under 250 px, i.e. at 320);
//     B ProductLine (64 r16 photo + 3-line name + SKU, one link to the PDP);
//     C the three prices (14/20 Medium labels, values right);
//     a 1-px #d2d2d2 line;
//     D the stepper (typed quantity, partner context) | «Сума» + total;
//   48, LoadMore (batches of 10).
// Empty assortment: the EmptyState panel 48 under the head (no search, no
// meta line; the head keeps «Завантажити з Excel»). No match: the panel 24
// under the search with «Скинути пошук».

export type PhoneListProps = {
  rootRef: Ref<HTMLDivElement>;
  empty: boolean;
  query: string;
  shown: AssortmentRow[];
  total: number;
  selected: ReadonlySet<string>;
  sort: string;
  onSort: (value: string) => void;
  onToggle: (id: string) => void;
  onToggleShown: () => void;
  onQty: (id: string, qty: number) => void;
  onRemove: (row: AssortmentRow) => void;
  onMore: () => void;
  onResetSearch: () => void;
  // The first newly shown row's checkbox after a load-more batch.
  focusAfterMore: () => HTMLElement | null;
};

export function PhoneList({
  rootRef,
  empty,
  query,
  shown,
  total,
  selected,
  sort,
  onSort,
  onToggle,
  onToggleShown,
  onQty,
  onRemove,
  onMore,
  onResetSearch,
  focusAfterMore,
}: PhoneListProps) {
  const checkedShown = shown.filter((r) => selected.has(r.id)).length;
  const allShown = shown.length > 0 && checkedShown === shown.length;
  const mixed = checkedShown > 0 && !allShown;

  return (
    <div ref={rootRef} data-block="list-phone" className="flex flex-col px-6 lg:hidden">
      {empty ? (
        <EmptyState
          surface="panel"
          icon={<CatalogueIcon className="size-6" />}
          title={COPY.emptyTitle}
          text={COPY.emptyText}
          action={
            <span data-block="empty" className="contents">
              <Button href="/catalog" size="small" arrow>
                {COPY.emptyAction}
              </Button>
            </span>
          }
        />
      ) : total === 0 ? (
        <EmptyState
          surface="panel"
          role="status"
          className="mt-6"
          title={COPY.noMatchTitle}
          text={COPY.noMatchText(query.trim())}
          action={
            <Button size="small" variant="outlinedDark" onClick={onResetSearch}>
              {COPY.noMatchReset}
            </Button>
          }
        />
      ) : (
        <>
          <div data-block="list-meta" className="relative mt-1 flex h-11 items-center justify-between gap-4">
            <button
              type="button"
              role="checkbox"
              aria-checked={mixed ? "mixed" : allShown}
              aria-label={COPY.selectAllLabel}
              onClick={onToggleShown}
              className="-ml-2.5 flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full pl-2.5 pr-2 text-[14px] font-medium leading-5 text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <CheckboxGlyph checked={allShown} mixed={mixed} />
              <span className="whitespace-nowrap">{COPY.selectAll}</span>
            </button>
            <SortMenu
              value={sort}
              options={ASSORTMENT_SORT_OPTIONS}
              onChange={onSort}
              label={COPY.sort}
              className="-mr-2 px-2"
            />
          </div>
          <ListPanel label={COPY.list} className="mt-3">
            {shown.map((row) => (
              <PhoneRow
                key={row.id}
                row={row}
                checked={selected.has(row.id)}
                onToggle={() => onToggle(row.id)}
                onQty={(n) => onQty(row.id, n)}
                onRemove={() => onRemove(row)}
              />
            ))}
          </ListPanel>
          <LoadMore
            className="mt-12"
            shown={shown.length}
            total={total}
            onMore={onMore}
            focusAfterLast={focusAfterMore}
          />
        </>
      )}
    </div>
  );
}

function PhoneRow({
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
    <ListRow data-row={row.id}>
      <div className="flex flex-col gap-3 @container">
        <div className="grid grid-cols-[24px_minmax(0,1fr)_40px] items-center gap-x-3 @max-[250px]:gap-y-3">
          <PhoneCheckbox checked={checked} onToggle={onToggle} label={COPY.selectRow(row.name)} />
          <div className="flex min-w-0 @max-[250px]:col-span-3 @max-[250px]:row-start-2">
            <StatusPill tone={badge.tone}>{badge.label}</StatusPill>
          </div>
          <RowDisc
            label={COPY.removeRow(row.name)}
            onClick={onRemove}
            data-action="remove"
            className="col-start-3 row-start-1"
          >
            <RemoveIcon className="size-6" />
          </RowDisc>
        </div>

        <ProductLine
          as="div"
          image={row.product.image}
          title={row.name}
          titleLines={3}
          meta={<span className="whitespace-nowrap">{COPY.sku(row.sku)}</span>}
          href={productHref(row.product)}
        />

        <dl className="flex flex-col gap-2">
          <PriceLine label={COPY.wholesale} value={row.wholesale} />
          <PriceLine label={COPY.retail} value={row.retail} />
          <PriceLine label={COPY.partner} value={row.partner} strong />
        </dl>

        <div aria-hidden className="h-px bg-stroke-subtle" />

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <QtyStepper size="sm" editable qty={row.qty} onQty={onQty} label={COPY.qty(row.name)} />
          <p className="ml-auto flex flex-col items-end">
            <span className="text-[12px] leading-4 text-neutral-500">{COPY.sum}</span>
            <RollingNumber
              value={row.sum}
              format={formatPrice}
              className="whitespace-nowrap text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900"
            />
          </p>
        </div>
      </div>
    </ListRow>
  );
}

function PriceLine({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={`text-[14px] font-medium leading-5 ${strong ? "text-neutral-900" : "text-neutral-500"}`}>
        {label}
      </dt>
      <dd
        className={`whitespace-nowrap text-[16px] leading-6 text-neutral-900 ${strong ? "font-bold" : "font-semibold"}`}
      >
        {formatPrice(value)}
      </dd>
    </div>
  );
}
