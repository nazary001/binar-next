"use client";

import { ArrowDownIcon, ArrowTopRightOnSquareIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useCallback, type ReactNode } from "react";
import { ProductPicker, type ProductOption } from "../common/pickers";
import type { MediaDetailAnswer } from "../media/types";
import { cx, formatMoney } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import {
  Badge,
  Button,
  Checkbox,
  Combobox,
  FIELD_ERROR,
  FileField,
  IconButton,
  Input,
  NumberInput,
  TEXT,
  Textarea,
  moveItem,
  type FieldControlProps,
} from "../ui";
import { type FileDraft, type PackageDraft, type SpecRowDraft, type TextItem, type TogetherDraft, newKey, newRowId } from "./draft";
import { ProductThumb, productPath } from "./shared";
import { PRODUCT_LIMITS, type RelatedProductDto } from "./types";

// The editor's composite fields: free text with suggestions, ordered lists
// (benefits, label-value rows, packages, files) and the related-product
// lists. Each is controlled (value + onChange) and takes `disabled` for a
// role that may only look.

// --- free text with suggestions ------------------------------------------------------------

type FreeTextProps = FieldControlProps & {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  disabled?: boolean;
  newLabel?: string;
};

// One value from a list, or a new one typed in: the list offers the typed
// text as its own row ("Новий бренд: «...»"), first when nothing matches.
export function FreeTextCombo({ value, onChange, options, placeholder, disabled, newLabel = "Нове значення", ...frame }: FreeTextProps) {
  const search = useCallback(
    async (query: string): Promise<string[]> => {
      const typed = query.trim();
      const needle = typed.toLocaleLowerCase("uk");
      const hits = options.filter((option) => option.toLocaleLowerCase("uk").includes(needle)).slice(0, 50);
      if (!needle || hits.some((option) => option.toLocaleLowerCase("uk") === needle)) return hits;
      return hits.length ? [...hits, typed] : [typed];
    },
    [options],
  );
  return (
    <Combobox<string>
      {...frame}
      value={value || null}
      onChange={(next) => onChange(next ?? "")}
      search={search}
      searchKey={options.length}
      getKey={(item) => item}
      getLabel={(item) => item}
      renderOption={(item) => (options.includes(item) ? item : `${newLabel}: «${item}»`)}
      placeholder={placeholder}
      disabled={disabled}
      clearable
      debounceMs={0}
      emptyText="Почніть вводити"
    />
  );
}

// --- an ordered list ------------------------------------------------------------------------

// Up, down and remove buttons of a row in an ordered list.
function RowTools({
  index,
  count,
  onMove,
  onRemove,
  disabled,
  what,
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  disabled?: boolean;
  what: string;
}) {
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      <IconButton size="sm" icon={ArrowUpIcon} label={`Вище: ${what}`} disabled={disabled || index === 0} onClick={() => onMove(index, index - 1)} />
      <IconButton
        size="sm"
        icon={ArrowDownIcon}
        label={`Нижче: ${what}`}
        disabled={disabled || index === count - 1}
        onClick={() => onMove(index, index + 1)}
      />
      <IconButton size="sm" variant="danger" icon={TrashIcon} label={`Прибрати: ${what}`} disabled={disabled} onClick={onRemove} />
    </span>
  );
}

function ListFoot({ error, empty, children }: { error?: string; empty?: ReactNode; children?: ReactNode }) {
  return (
    <>
      {empty && <p className={cx(TEXT.muted, "rounded-2xl bg-bg-subtle px-4 py-3")}>{empty}</p>}
      {error && (
        <p role="alert" className={FIELD_ERROR}>
          {error}
        </p>
      )}
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </>
  );
}

export function TextListEditor({
  value,
  onChange,
  disabled,
  error,
  itemLabel,
  addLabel,
  emptyText,
  max = PRODUCT_LIMITS.listItems,
  maxLength = PRODUCT_LIMITS.listItem,
}: {
  value: TextItem[];
  onChange: (value: TextItem[]) => void;
  disabled?: boolean;
  error?: string;
  itemLabel: string;
  addLabel: string;
  emptyText: string;
  max?: number;
  maxLength?: number;
}) {
  const update = (index: number, text: string) => onChange(value.map((item, i) => (i === index ? { ...item, text } : item)));
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {value.map((item, index) => (
        <div key={item.key} className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="w-5 shrink-0 text-right text-[13px] font-semibold tabular-nums text-neutral-400">
            {index + 1}
          </span>
          <Input
            aria-label={`${itemLabel} ${index + 1}`}
            value={item.text}
            onChange={(text) => update(index, text)}
            maxLength={maxLength}
            disabled={disabled}
            className="min-w-0 flex-1"
          />
          {!disabled && (
            <RowTools
              index={index}
              count={value.length}
              what={`${itemLabel.toLowerCase()} ${index + 1}`}
              onMove={(from, to) => onChange(moveItem(value, from, to))}
              onRemove={() => onChange(value.filter((_, i) => i !== index))}
            />
          )}
        </div>
      ))}
      <ListFoot error={error} empty={value.length === 0 ? emptyText : undefined}>
        {!disabled && value.length < max && (
          <Button size="sm" variant="secondary" iconLeft={PlusIcon} onClick={() => onChange([...value, { key: newKey("item"), text: "" }])}>
            {addLabel}
          </Button>
        )}
        {value.length >= max && <span className={TEXT.caption}>Не більше {max}</span>}
      </ListFoot>
    </div>
  );
}

// --- label-value rows -------------------------------------------------------------------------

export function SpecRowsEditor({
  value,
  onChange,
  disabled,
  error,
  labelPlaceholder,
  valuePlaceholder,
  emptyText,
}: {
  value: SpecRowDraft[];
  onChange: (value: SpecRowDraft[]) => void;
  disabled?: boolean;
  error?: string;
  labelPlaceholder: string;
  valuePlaceholder: string;
  emptyText: string;
}) {
  const update = (index: number, patch: Partial<SpecRowDraft>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {value.length > 0 && (
        <div aria-hidden className="hidden gap-2 pr-[104px] min-[640px]:grid min-[640px]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <span className={TEXT.label}>Назва</span>
          <span className={TEXT.label}>Значення</span>
        </div>
      )}
      {value.map((row, index) => (
        <div
          key={row.key}
          className="flex min-w-0 flex-col gap-2 rounded-2xl bg-bg-subtle p-2 min-[640px]:flex-row min-[640px]:items-center min-[640px]:bg-transparent min-[640px]:p-0"
        >
          <div className="grid min-w-0 flex-1 gap-2 min-[640px]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <Input
              aria-label={`Назва, рядок ${index + 1}`}
              value={row.label}
              onChange={(label) => update(index, { label })}
              placeholder={labelPlaceholder}
              maxLength={PRODUCT_LIMITS.rowLabel}
              disabled={disabled}
            />
            <Input
              aria-label={`Значення, рядок ${index + 1}`}
              value={row.value}
              onChange={(next) => update(index, { value: next })}
              placeholder={valuePlaceholder}
              maxLength={PRODUCT_LIMITS.rowValue}
              disabled={disabled}
            />
          </div>
          {!disabled && (
            <span className="self-end min-[640px]:self-auto">
              <RowTools
                index={index}
                count={value.length}
                what={row.label || `рядок ${index + 1}`}
                onMove={(from, to) => onChange(moveItem(value, from, to))}
                onRemove={() => onChange(value.filter((_, i) => i !== index))}
              />
            </span>
          )}
        </div>
      ))}
      <ListFoot error={error} empty={value.length === 0 ? emptyText : undefined}>
        {!disabled && value.length < PRODUCT_LIMITS.listItems && (
          <Button
            size="sm"
            variant="secondary"
            iconLeft={PlusIcon}
            onClick={() => onChange([...value, { key: newKey("row"), label: "", value: "" }])}
          >
            Додати рядок
          </Button>
        )}
      </ListFoot>
    </div>
  );
}

// --- packages --------------------------------------------------------------------------------------

export function PackagesEditor({
  value,
  onChange,
  disabled,
  error,
  unit,
}: {
  value: PackageDraft[];
  onChange: (value: PackageDraft[]) => void;
  disabled?: boolean;
  error?: string;
  unit: string;
}) {
  const update = (index: number, patch: Partial<PackageDraft>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const makeDefault = (index: number, on: boolean) =>
    onChange(value.map((row, i) => ({ ...row, isDefault: i === index ? on : on ? false : row.isDefault })));
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {value.map((row, index) => (
        <div key={row.key} className="flex min-w-0 flex-col gap-3 rounded-2xl bg-bg-subtle p-3 min-[640px]:p-4">
          <div className="grid min-w-0 gap-3 min-[640px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <Input
              label="Назва упаковки"
              value={row.name}
              onChange={(name) => update(index, { name })}
              placeholder="Коробка"
              maxLength={60}
              disabled={disabled}
              required
            />
            <NumberInput
              label="Одиниць в упаковці"
              value={row.coefficient}
              onChange={(coefficient) => update(index, { coefficient })}
              min={0}
              max={1_000_000}
              suffix={unit || "шт"}
              disabled={disabled}
              required
            />
            <Input
              label="Код одиниці"
              value={row.unitCode}
              onChange={(unitCode) => update(index, { unitCode })}
              maxLength={10}
              disabled={disabled}
            />
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <Checkbox
              label="Типова упаковка"
              hint="Її пропонують першою"
              checked={row.isDefault}
              onChange={(on) => makeDefault(index, on)}
              disabled={disabled}
            />
            {!disabled && (
              <Button size="sm" variant="dangerGhost" iconLeft={TrashIcon} onClick={() => onChange(value.filter((_, i) => i !== index))}>
                Прибрати
              </Button>
            )}
          </div>
        </div>
      ))}
      <ListFoot error={error} empty={value.length === 0 ? "Упаковок немає: товар продається поштучно." : undefined}>
        {!disabled && value.length < PRODUCT_LIMITS.packages && (
          <Button
            size="sm"
            variant="secondary"
            iconLeft={PlusIcon}
            onClick={() =>
              onChange([
                ...value,
                { key: newKey("package"), id: newRowId("pkg"), name: "", coefficient: null, unitCode: "", isDefault: value.length === 0, externalId: null },
              ])
            }
          >
            Додати упаковку
          </Button>
        )}
      </ListFoot>
    </div>
  );
}

// --- files ---------------------------------------------------------------------------------------------

const MEDIA_REF = /^media:([A-Za-z0-9][A-Za-z0-9_-]{0,63})$/;

// The file of a row: a library file (media:<id>) as the kit's file tile, a
// site path or an address as a link with the upload under it.
function FileCell({ row, onChange, disabled, invalid }: { row: FileDraft; onChange: (file: string, name?: string) => void; disabled?: boolean; invalid?: boolean }) {
  const mediaId = MEDIA_REF.exec(row.file)?.[1] ?? null;
  const media = useAdminQuery<MediaDetailAnswer>(mediaId ? `/media/${encodeURIComponent(mediaId)}` : null);
  const known = media.data && media.data.media.id === mediaId ? media.data.media : null;
  const value = mediaId ? { mediaId, name: known?.filename ?? (row.name || "Файл"), size: known?.size ?? 0 } : null;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <FileField
        label="Файл"
        folder="products"
        access="public"
        value={value}
        onChange={(next, uploaded) => onChange(next ? `media:${next.mediaId}` : "", uploaded?.filename)}
        disabled={disabled}
        error={invalid ? true : undefined}
      />
      {!mediaId && row.file && (
        <p className={cx(TEXT.caption, "flex min-w-0 items-center gap-1")}>
          <span className="shrink-0">Зараз:</span>
          <a href={row.file} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 text-neutral-800 underline underline-offset-2">
            <span className="truncate">{row.file}</span>
            <ArrowTopRightOnSquareIcon aria-hidden className="size-3.5 shrink-0" />
          </a>
        </p>
      )}
    </div>
  );
}

export function FilesEditor({
  value,
  onChange,
  disabled,
  errors,
}: {
  value: FileDraft[];
  onChange: (value: FileDraft[]) => void;
  disabled?: boolean;
  errors: { name?: string; file?: string; list?: string };
}) {
  const update = (index: number, patch: Partial<FileDraft>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {value.map((row, index) => (
        <div key={row.key} className="flex min-w-0 flex-col gap-3 rounded-2xl bg-bg-subtle p-3 min-[640px]:p-4">
          <div className="flex min-w-0 items-end gap-2">
            <Input
              label="Назва для покупця"
              value={row.name}
              onChange={(name) => update(index, { name })}
              placeholder="Сертифікат відповідності"
              maxLength={200}
              disabled={disabled}
              required
              error={errors.name && !row.name.trim() ? errors.name : undefined}
              className="min-w-0 flex-1"
            />
            {!disabled && (
              <IconButton
                variant="danger"
                icon={TrashIcon}
                label={`Прибрати файл ${row.name || index + 1}`}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              />
            )}
          </div>
          <FileCell
            row={row}
            disabled={disabled}
            invalid={Boolean(errors.file) && !row.file}
            onChange={(file, filename) =>
              update(index, { file, ...(filename && !row.name.trim() ? { name: filename.replace(/\.[a-z0-9]{1,5}$/i, "") } : {}) })
            }
          />
          {errors.file && !row.file && (
            <p role="alert" className={FIELD_ERROR}>
              {errors.file}
            </p>
          )}
        </div>
      ))}
      <ListFoot error={errors.list} empty={value.length === 0 ? "Файлів немає. Додайте сертифікати, інструкції чи паспорти безпеки." : undefined}>
        {!disabled && value.length < PRODUCT_LIMITS.files && (
          <Button
            size="sm"
            variant="secondary"
            iconLeft={PlusIcon}
            onClick={() => onChange([...value, { key: newKey("file"), id: newRowId("file"), name: "", file: "" }])}
          >
            Додати файл
          </Button>
        )}
      </ListFoot>
    </div>
  );
}

// --- related products -------------------------------------------------------------------------------------

export type KnownProduct = Pick<RelatedProductDto, "id" | "title" | "image" | "sku" | "archived"> & { missing?: boolean };

export function knownFromOption(option: ProductOption): KnownProduct {
  return { id: option.id, title: option.title, image: option.image, sku: option.sku, archived: option.archived };
}

function RelatedLine({ product, id, tools }: { product: KnownProduct | undefined; id: string; tools?: ReactNode }) {
  const missing = !product || product.missing;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProductThumb src={missing ? null : product.image} />
      <span className="flex min-w-0 flex-1 flex-col">
        {missing ? (
          <span className="truncate font-semibold text-negative">Товару з кодом {id} немає</span>
        ) : (
          <a
            href={productPath(id)}
            target="_blank"
            rel="noreferrer"
            className="line-clamp-2 font-semibold [overflow-wrap:anywhere] text-neutral-900 underline-offset-2 hover:underline"
            title="Відкрити в новій вкладці"
          >
            {product.title}
          </a>
        )}
        <span className={cx(TEXT.caption, "flex min-w-0 items-center gap-2")}>
          <span className="truncate">{missing ? "Приберіть його зі списку" : product.sku ? `Арт. ${product.sku}` : `Код ${id}`}</span>
          {product?.archived && <Badge tone="amber">В архіві</Badge>}
        </span>
      </span>
      {tools}
    </div>
  );
}

// An ordered list of products (series, similar) with a picker under it.
export function RelatedListEditor({
  value,
  onChange,
  known,
  remember,
  exclude,
  disabled,
  error,
  pickLabel,
  emptyText,
  max = PRODUCT_LIMITS.related,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  known: Record<string, KnownProduct>;
  remember: (product: KnownProduct) => void;
  exclude: string[];
  disabled?: boolean;
  error?: string;
  pickLabel: string;
  emptyText: string;
  max?: number;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex min-w-0 flex-col divide-y divide-stroke-subtle rounded-2xl border border-stroke-subtle px-3">
          {value.map((id, index) => (
            <li key={id} className="py-2">
              <RelatedLine
                id={id}
                product={known[id]}
                tools={
                  disabled ? undefined : (
                    <RowTools
                      index={index}
                      count={value.length}
                      what={known[id]?.title ?? id}
                      onMove={(from, to) => onChange(moveItem(value, from, to))}
                      onRemove={() => onChange(value.filter((item) => item !== id))}
                    />
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}
      <ListFoot error={error} empty={value.length === 0 ? emptyText : undefined} />
      {!disabled && value.length < max && (
        <ProductPicker
          aria-label={pickLabel}
          placeholder={`${pickLabel}: назва або артикул`}
          value={null}
          exclude={[...exclude, ...value]}
          onChange={(id, product) => {
            if (!id || !product) return;
            remember(knownFromOption(product));
            onChange([...value, id]);
          }}
        />
      )}
    </div>
  );
}

// "Купують разом": products with their own short benefits.
export function TogetherEditor({
  value,
  onChange,
  known,
  remember,
  exclude,
  disabled,
  error,
}: {
  value: TogetherDraft[];
  onChange: (value: TogetherDraft[]) => void;
  known: Record<string, KnownProduct>;
  remember: (product: KnownProduct) => void;
  exclude: string[];
  disabled?: boolean;
  error?: string;
}) {
  const update = (index: number, benefits: string) => onChange(value.map((row, i) => (i === index ? { ...row, benefits } : row)));
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {value.map((row, index) => (
        <div key={row.key} className="flex min-w-0 flex-col gap-3 rounded-2xl bg-bg-subtle p-3 min-[640px]:p-4">
          <RelatedLine
            id={row.productId}
            product={known[row.productId]}
            tools={
              disabled ? undefined : (
                <RowTools
                  index={index}
                  count={value.length}
                  what={known[row.productId]?.title ?? row.productId}
                  onMove={(from, to) => onChange(moveItem(value, from, to))}
                  onRemove={() => onChange(value.filter((_, i) => i !== index))}
                />
              )
            }
          />
          <Textarea
            label="Чому їх беруть разом"
            hint="Кожна перевага з нового рядка, до 6. Сайт показує їх списком на картці."
            value={row.benefits}
            onChange={(benefits) => update(index, benefits)}
            rows={3}
            autoGrow
            maxRows={8}
            disabled={disabled}
          />
        </div>
      ))}
      <ListFoot error={error} empty={value.length === 0 ? "Поки нічого. Додайте товари, які зазвичай купують разом із цим." : undefined} />
      {!disabled && value.length < PRODUCT_LIMITS.boughtTogether && (
        <ProductPicker
          aria-label="Додати товар до «Купують разом»"
          placeholder="Додати товар: назва або артикул"
          value={null}
          exclude={[...exclude, ...value.map((row) => row.productId)]}
          onChange={(id, product) => {
            if (!id || !product) return;
            remember(knownFromOption(product));
            onChange([...value, { key: newKey("together"), productId: id, benefits: "" }]);
          }}
        />
      )}
    </div>
  );
}

// "1 234,50 ₴" or a quiet dash.
export function MoneyText({ value }: { value: number | null | undefined }) {
  return <span className="tabular-nums">{value === null || value === undefined ? "-" : formatMoney(value)}</span>;
}
