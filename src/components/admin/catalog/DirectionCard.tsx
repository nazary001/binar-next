"use client";

import { ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";
import type { ReactNode } from "react";
import { countOf, cx, formatNumber } from "../lib/format";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { DataTable, type Column } from "../ui/DataTable";
import { Input, NumberInput } from "../ui/Input";
import { TEXT } from "../ui/tokens";
import { CountLink, HeadHint, SiteLink, StateLink, productsHref } from "./shared";
import { CATEGORY_META_LIMITS, type CategoryMeta, type TaxonomyCategory, type TaxonomyDirection } from "./types";

// One direction of the catalog on /admin/categories: its head (title,
// tagline, products, storefront page) and its categories with the live
// counts and the meta staff keep next to each one. From 1280 px a table
// edited in place; below it one block per category with labelled fields
// (a table of inputs would scroll sideways on a phone). Both bind the same
// draft, so the page has one "Зберегти зміни" for everything.

export type MetaPatch = Partial<CategoryMeta>;

export type DirectionCardProps = {
  direction: TaxonomyDirection;
  draft: Record<string, CategoryMeta>;
  // Field errors by "<direction>/<category>.<field>".
  errors: Record<string, string>;
  shopThreshold: number;
  // The category a product from BAS lands in when its group has no code here.
  fallbackLabel: string;
  canEdit: boolean;
  onChange: (key: string, patch: MetaPatch) => void;
};

const SHORT_FORMS = ["товар", "товари", "товарів"] as const;

export function codeHint(fallbackLabel: string): string {
  return `Код групи товарів в обліковій системі. Новий товар з BAS потрапляє в категорію з кодом своєї групи; без збігу - прихованим у «${fallbackLabel}».`;
}

export function thresholdHint(shopThreshold: number): string {
  return `Від порогу залежить світлофор залишку в списку товарів: зелений - на складі не менше порогу, жовтий - менше, червоний - нуль. Порожнє поле - діє поріг магазину: ${formatNumber(shopThreshold)} шт.`;
}

function metaOf(draft: Record<string, CategoryMeta>, key: string): CategoryMeta {
  return draft[key] ?? { externalId: null, stockThreshold: null, note: "" };
}

// The states of a category's products besides "in the catalog", each a
// pill that opens those products. Nothing for a category where every
// product is live, listed and available.
function StateLinks({ direction, category }: { direction: string; category: TaxonomyCategory }) {
  const base = { direction, category: category.slug };
  const { unlisted, unavailable, archived } = category.products;
  if (!unlisted && !unavailable && !archived) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {unlisted > 0 && (
        <StateLink
          tone="neutral"
          label="Приховано"
          value={unlisted}
          href={productsHref({ ...base, listed: "false" })}
          title="Товари категорії, яких покупці не бачать у каталозі"
        />
      )}
      {unavailable > 0 && (
        <StateLink
          tone="red"
          label="Немає в наявності"
          value={unavailable}
          href={productsHref({ ...base, available: "false" })}
          title="Товари категорії з позначкою «немає в наявності»"
        />
      )}
      {archived > 0 && (
        <StateLink
          tone="neutral"
          label="Архів"
          value={archived}
          href={productsHref({ ...base, archived: "true" })}
          title="Товари категорії в архіві"
        />
      )}
    </span>
  );
}

function CategoryName({ direction, category }: { direction: string; category: TaxonomyCategory }) {
  // The glyph is glued to the last word, so a wrapping name never leaves
  // it alone on a line.
  const words = category.label.split(" ");
  const last = words.pop() ?? "";
  return (
    <span className="flex min-w-0 flex-col items-start gap-1.5">
      <span className="min-w-0 font-semibold text-neutral-900 [overflow-wrap:anywhere]">
        {words.length > 0 && `${words.join(" ")} `}
        <span className="whitespace-nowrap">
          {last}
          <SiteLink href={category.href} label={`Відкрити «${category.label}» на сайті`} className="-my-1 ml-0.5 align-middle" />
        </span>
      </span>
      <StateLinks direction={direction} category={category} />
    </span>
  );
}

function ListedLink({ direction, category, strong }: { direction: string; category: TaxonomyCategory; strong?: boolean }) {
  return (
    <CountLink
      value={category.products.listed}
      href={productsHref({ direction, category: category.slug, listed: "true" })}
      label={`Товари категорії «${category.label}» у каталозі: ${formatNumber(category.products.listed)}`}
      strong={strong}
    />
  );
}

// Read-only values (a role that may look but not edit).
function Muted({ children }: { children: ReactNode }) {
  return <span className="text-neutral-400">{children}</span>;
}

function codeText(meta: CategoryMeta) {
  return meta.externalId ? <span className="[overflow-wrap:anywhere]">{meta.externalId}</span> : <Muted>Не вказано</Muted>;
}

function thresholdText(meta: CategoryMeta, shopThreshold: number) {
  return meta.stockThreshold !== null ? (
    <span className="tabular-nums">{formatNumber(meta.stockThreshold)} шт.</span>
  ) : (
    <span className="flex flex-col">
      <span className="tabular-nums text-neutral-500">{formatNumber(shopThreshold)} шт.</span>
      <span className={TEXT.caption}>як у магазині</span>
    </span>
  );
}

function noteText(meta: CategoryMeta) {
  return meta.note ? <span className="[overflow-wrap:anywhere]">{meta.note}</span> : <Muted>-</Muted>;
}

export function DirectionCard({ direction, draft, errors, shopThreshold, fallbackLabel, canEdit, onChange }: DirectionCardProps) {
  const live = direction.categories.reduce((sum, item) => sum + item.products.listed + item.products.unlisted, 0);
  const slug = direction.slug;

  const fieldError = (key: string, field: keyof CategoryMeta) => errors[`${key}.${field}`];

  const codeField = (category: TaxonomyCategory, labelled: boolean) => {
    const meta = metaOf(draft, category.key);
    return (
      <Input
        size="sm"
        label={labelled ? "Код групи в BAS" : undefined}
        aria-label={labelled ? undefined : `Код групи в BAS: ${category.label}`}
        value={meta.externalId ?? ""}
        onChange={(value) => onChange(category.key, { externalId: value === "" ? null : value })}
        maxLength={CATEGORY_META_LIMITS.externalId}
        placeholder="Не вказано"
        error={fieldError(category.key, "externalId")}
      />
    );
  };

  const thresholdField = (category: TaxonomyCategory, labelled: boolean) => {
    const meta = metaOf(draft, category.key);
    return (
      <NumberInput
        size="sm"
        label={labelled ? "Власний поріг залишку" : undefined}
        aria-label={labelled ? undefined : `Власний поріг залишку: ${category.label}`}
        hint={labelled ? "Порожньо - як у магазині" : undefined}
        value={meta.stockThreshold}
        onChange={(value) => onChange(category.key, { stockThreshold: value })}
        // Enter only commits the number: a submit in the same keystroke
        // would save the draft from before the commit.
        onEnter={() => {}}
        min={0}
        max={CATEGORY_META_LIMITS.stockThreshold}
        step={1}
        precision={0}
        placeholder={formatNumber(shopThreshold)}
        suffix="шт."
        error={fieldError(category.key, "stockThreshold")}
      />
    );
  };

  const noteField = (category: TaxonomyCategory, labelled: boolean) => {
    const meta = metaOf(draft, category.key);
    return (
      <Input
        size="sm"
        label={labelled ? "Нотатка" : undefined}
        aria-label={labelled ? undefined : `Нотатка: ${category.label}`}
        value={meta.note}
        onChange={(note) => onChange(category.key, { note })}
        maxLength={CATEGORY_META_LIMITS.note}
        placeholder="Для колег"
        error={fieldError(category.key, "note")}
      />
    );
  };

  const columns: Column<TaxonomyCategory>[] = [
    {
      key: "name",
      header: "Категорія",
      cell: (category) => <CategoryName direction={slug} category={category} />,
    },
    {
      key: "listed",
      header: "У каталозі",
      align: "right",
      width: 104,
      cell: (category) => <ListedLink direction={slug} category={category} />,
    },
    {
      key: "code",
      header: <HeadHint label="Код групи в BAS" hint={codeHint(fallbackLabel)} light />,
      width: 176,
      interactive: true,
      cell: (category) => (canEdit ? codeField(category, false) : codeText(metaOf(draft, category.key))),
    },
    {
      key: "threshold",
      header: <HeadHint label="Власний поріг" hint={thresholdHint(shopThreshold)} light />,
      width: 144,
      interactive: true,
      cell: (category) => (canEdit ? thresholdField(category, false) : thresholdText(metaOf(draft, category.key), shopThreshold)),
    },
    {
      key: "note",
      header: "Нотатка",
      width: "26%",
      interactive: true,
      cell: (category) => (canEdit ? noteField(category, false) : noteText(metaOf(draft, category.key))),
    },
  ];

  return (
    <Card
      padding="none"
      className="overflow-hidden"
      title={direction.title}
      subtitle={direction.tagline}
      actions={
        <>
          <Button size="sm" variant="secondary" href={productsHref({ direction: slug })}>
            {countOf(live, SHORT_FORMS)}
          </Button>
          <Button size="sm" variant="ghost" href={direction.href} external iconRight={ArrowTopRightOnSquareIcon}>
            На сайті
          </Button>
        </>
      }
    >
      <DataTable
        caption={`Категорії напряму «${direction.title}»`}
        columns={columns}
        rows={direction.categories}
        rowKey={(category) => category.key}
        // Fixed layout: the fields keep their widths and the name takes the
        // rest, so the table fits from 1280 px without squeezing the names.
        className="rounded-none! max-[1279px]:hidden [&_table]:table-fixed"
      />

      <ul className="flex flex-col border-t border-stroke-subtle xl:hidden" aria-label={`Категорії напряму «${direction.title}»`}>
        {direction.categories.map((category) => {
          const meta = metaOf(draft, category.key);
          return (
            <li key={category.key} className="flex min-w-0 flex-col gap-4 border-b border-stroke-subtle px-5 py-4 last:border-b-0 min-[1024px]:px-6">
              <div className="flex min-w-0 items-start justify-between gap-4">
                <CategoryName direction={slug} category={category} />
                <span className="flex shrink-0 flex-col items-end">
                  <span className="text-[16px] leading-[22px]">
                    <ListedLink direction={slug} category={category} />
                  </span>
                  <span className={TEXT.caption}>у каталозі</span>
                </span>
              </div>
              {canEdit ? (
                <div className="grid grid-cols-2 items-start gap-x-3 gap-y-4 min-[640px]:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.4fr)]">
                  {codeField(category, true)}
                  {thresholdField(category, true)}
                  <div className="col-span-2 min-[640px]:col-span-1">{noteField(category, true)}</div>
                </div>
              ) : (
                <dl className={cx("grid grid-cols-2 gap-x-3 gap-y-3 min-[640px]:grid-cols-3", TEXT.body)}>
                  <div className="min-w-0">
                    <dt className={TEXT.caption}>Код групи в BAS</dt>
                    <dd className="mt-0.5">{codeText(meta)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className={TEXT.caption}>Власний поріг залишку</dt>
                    <dd className="mt-0.5">{thresholdText(meta, shopThreshold)}</dd>
                  </div>
                  <div className="col-span-2 min-w-0 min-[640px]:col-span-1">
                    <dt className={TEXT.caption}>Нотатка</dt>
                    <dd className="mt-0.5">{noteText(meta)}</dd>
                  </div>
                </dl>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
