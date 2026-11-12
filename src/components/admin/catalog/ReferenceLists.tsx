"use client";

import { countOf, cx, formatNumber, plural } from "../lib/format";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { Chip, TagInput } from "../ui/TagInput";
import { TEXT } from "../ui/tokens";
import { CountLink, productsHref } from "./shared";
import { REFERENCE_LIST_LIMITS, type BrandCount, type ValueCount } from "./types";

// The vocabularies the product editor offers next to the taxonomy, on
// /admin/categories: brands (with how many live products carry each and
// whether the storefront's filter knows it), makers and countries. Staff
// edit only the extra values; the values products already carry and the
// brands built into the site are shown, not edited.

export type ListKey = "brands" | "manufacturers" | "countries";

export type ReferenceListsProps = {
  brands: BrandCount[];
  manufacturersInUse: ValueCount[];
  countriesInUse: ValueCount[];
  draft: Record<ListKey, string[]>;
  errors: Record<string, string>;
  canEdit: boolean;
  onChange: (list: ListKey, value: string[]) => void;
};

const PRODUCT_FORMS = ["товар", "товари", "товарів"] as const;

const byName = (a: string, b: string) => a.localeCompare(b, "uk");

// The brand rows as they will be after a save: the extra brands typed in
// the field show at once (a new one with no products yet).
function brandRows(brands: BrandCount[], extra: string[]): BrandCount[] {
  const chosen = new Set(extra.map((name) => name.toLowerCase()));
  const rows = brands.map((brand) => ({ ...brand, inSettings: chosen.has(brand.name.toLowerCase()) }));
  const known = new Set(brands.map((brand) => brand.name.toLowerCase()));
  for (const name of extra) {
    if (!known.has(name.toLowerCase())) rows.push({ name, products: 0, inCode: false, inSettings: true });
  }
  return rows.sort((a, b) => byName(a.name, b.name));
}

function ReadOnlyList({ values, empty }: { values: string[]; empty: string }) {
  if (values.length === 0) return <p className={TEXT.muted}>{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <Chip key={value}>{value}</Chip>
      ))}
    </div>
  );
}

function InUse({ values, empty }: { values: ValueCount[]; empty: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className={TEXT.label}>Уже в товарах</p>
      {values.length === 0 ? (
        <p className={TEXT.muted}>{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <Chip key={value.name} title={`${value.name}: ${countOf(value.products, PRODUCT_FORMS)}`}>
              {value.name} <span className="tabular-nums text-neutral-500">{formatNumber(value.products)}</span>
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

type ExtraFieldProps = {
  list: ListKey;
  label: string;
  hint: string;
  placeholder: string;
  empty: string;
  maxLength: number;
  value: string[];
  error?: string;
  canEdit: boolean;
  onChange: (list: ListKey, value: string[]) => void;
};

function ExtraField({ list, label, hint, placeholder, empty, maxLength, value, error, canEdit, onChange }: ExtraFieldProps) {
  if (!canEdit) {
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <p className={TEXT.label}>{label}</p>
        <ReadOnlyList values={value} empty={empty} />
      </div>
    );
  }
  return (
    <TagInput
      label={label}
      hint={hint}
      value={value}
      onChange={(next) => onChange(list, next)}
      placeholder={placeholder}
      max={REFERENCE_LIST_LIMITS.items}
      maxLength={maxLength}
      error={error}
    />
  );
}

export function ReferenceLists({ brands, manufacturersInUse, countriesInUse, draft, errors, canEdit, onChange }: ReferenceListsProps) {
  const rows = brandRows(brands, draft.brands);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card
        title="Бренди"
        subtitle="Фільтр «Виробник» на сайті пропонує лише бренди, закладені в код сайту. Редактор товарів пропонує їх, бренди з товарів і додаткові бренди нижче."
      >
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] xl:gap-10">
          <ul className="flex min-w-0 flex-col" aria-label="Бренди і кількість товарів">
            {rows.map((brand) => (
              <li
                key={brand.name}
                className="flex min-h-11 min-w-0 items-center gap-3 border-b border-stroke-subtle py-2 first:pt-0 last:border-b-0 last:pb-0"
              >
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={cx(TEXT.bodyStrong, "[overflow-wrap:anywhere]")}>{brand.name}</span>
                  {brand.inCode && (
                    <Badge tone="green" title="Покупці можуть відібрати товари цього бренду у фільтрі каталогу">
                      у фільтрі сайту
                    </Badge>
                  )}
                  {brand.inSettings && <Badge tone="neutral">додано тут</Badge>}
                </span>
                <span className={cx(TEXT.body, "shrink-0 whitespace-nowrap")}>
                  <CountLink
                    value={brand.products}
                    href={productsHref({ brand: brand.name })}
                    label={`Товари бренду «${brand.name}»: ${formatNumber(brand.products)}`}
                    strong={false}
                  />{" "}
                  <span className="text-neutral-500">{plural(brand.products, PRODUCT_FORMS)}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="min-w-0 xl:border-l xl:border-stroke-subtle xl:pl-10">
            <ExtraField
              list="brands"
              label="Додаткові бренди"
              hint="Бренди, яких ще немає в товарах: редактор запропонує їх на вибір. Прибраний звідси бренд лишається в товарах."
              placeholder="Назва бренду, Enter"
              empty="Додаткових брендів немає."
              maxLength={REFERENCE_LIST_LIMITS.brands}
              value={draft.brands}
              error={errors.brands}
              canEdit={canEdit}
              onChange={onChange}
            />
          </div>
        </div>
      </Card>

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 min-[1024px]:grid-cols-2">
        <Card title="Виробники" subtitle="Поле «Виробник» в обліку товару. Покупці його поки не бачать.">
          <div className="flex min-w-0 flex-col gap-5">
            <InUse values={manufacturersInUse} empty="Жоден товар ще не має виробника." />
            <ExtraField
              list="manufacturers"
              label="Додаткові виробники"
              hint="Редактор запропонує їх разом із тими, що вже є в товарах."
              placeholder="Назва виробника, Enter"
              empty="Додаткових виробників немає."
              maxLength={REFERENCE_LIST_LIMITS.manufacturers}
              value={draft.manufacturers}
              error={errors.manufacturers}
              canEdit={canEdit}
              onChange={onChange}
            />
          </div>
        </Card>
        <Card title="Країни" subtitle="Поле «Країна» в обліку товару. Покупці його поки не бачать.">
          <div className="flex min-w-0 flex-col gap-5">
            <InUse values={countriesInUse} empty="Жоден товар ще не має країни." />
            <ExtraField
              list="countries"
              label="Додаткові країни"
              hint="Редактор запропонує їх разом із тими, що вже є в товарах."
              placeholder="Назва країни, Enter"
              empty="Додаткових країн немає."
              maxLength={REFERENCE_LIST_LIMITS.countries}
              value={draft.countries}
              error={errors.countries}
              canEdit={canEdit}
              onChange={onChange}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
