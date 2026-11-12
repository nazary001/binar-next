"use client";

import { useState } from "react";
import { EntityHistory } from "../common/EntityHistory";
import { adminApi, type ApiFailure } from "../lib/api";
import { cx, formatNumber } from "../lib/format";
import { invalidate, setQueryData, useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Button } from "../ui/Button";
import { FormActions, useDirty, useUnsavedWarning } from "../ui/Form";
import { Page, PageHeader, PageSection } from "../ui/Page";
import { Skeleton, SkeletonText } from "../ui/Skeleton";
import { ErrorState } from "../ui/States";
import { toast, toastError } from "../ui/Toast";
import { SURFACE } from "../ui/tokens";
import { categoriesSharingCode, sharedCodeText } from "./codes";
import { DirectionCard, type MetaPatch } from "./DirectionCard";
import { OrphansCard } from "./OrphansCard";
import { ReferenceLists, type ListKey } from "./ReferenceLists";
import type { CategoryMeta, TaxonomyAnswer } from "./types";

// /admin/categories: the catalog's structure as the code defines it
// (directions and their categories), with live product counts, and what
// the panel keeps next to it: per category the ERP group code, its own
// stock threshold and a note; the extra brands, makers and countries the
// product editor offers. Everything editable is one draft saved with one
// "Зберегти зміни" (PUT /taxonomy/meta replaces the whole map), the same
// document the settings screen's catalog tab shows, so this page reads
// and writes it only through its own route.

const KEY = "/taxonomy";

type Draft = {
  categories: Record<string, CategoryMeta>;
  brands: string[];
  manufacturers: string[];
  countries: string[];
};

function draftOf(data: TaxonomyAnswer): Draft {
  const categories: Record<string, CategoryMeta> = {};
  for (const direction of data.directions) {
    for (const category of direction.categories) categories[category.key] = { ...category.meta };
  }
  return {
    categories,
    brands: data.brands.filter((brand) => brand.inSettings).map((brand) => brand.name),
    manufacturers: [...data.manufacturers],
    countries: [...data.countries],
  };
}

const keyOf = (data: TaxonomyAnswer): string => JSON.stringify(draftOf(data));

// "categories.hotels/x.note" (the API's field path) -> "hotels/x.note";
// the lists keep their own names.
function fieldErrors(failure: ApiFailure): Record<string, string> {
  const fields = failure.data.fields;
  if (!fields || typeof fields !== "object") return {};
  const out: Record<string, string> = {};
  for (const [path, message] of Object.entries(fields as Record<string, unknown>)) {
    if (typeof message !== "string") continue;
    out[path.replace(/^categories\./, "")] = message;
  }
  return out;
}

// Two categories with one group code would send BAS products of that
// group to whichever comes first: refused here before sending, with both
// named (the route refuses the same with the same words, codes.ts).
function duplicateCodes(draft: Draft, labels: Map<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [key, others] of Object.entries(categoriesSharingCode(draft.categories))) {
    errors[`${key}.externalId`] = sharedCodeText(others, (other) => labels.get(other) ?? other);
  }
  return errors;
}

function LoadingCards() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {[0, 1, 2].map((key) => (
        <div key={key} className={cx(SURFACE.card, "flex flex-col gap-5 p-5 min-[1024px]:p-6")}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex w-1/2 flex-col gap-2">
              <Skeleton className="h-5 w-56 max-w-full" />
              <Skeleton className="h-3.5 w-80 max-w-full" />
            </div>
            <Skeleton className="h-8 w-28" shape="pill" />
          </div>
          <SkeletonText lines={5} />
        </div>
      ))}
    </div>
  );
}

type FormProps = { data: TaxonomyAnswer; canEdit: boolean };

function CategoriesForm({ data, canEdit }: FormProps) {
  const loadedKey = keyOf(data);
  const [seen, setSeen] = useState(loadedKey);
  const [base, setBase] = useState<Draft>(() => draftOf(data));
  const [draft, setDraft] = useState<Draft>(() => draftOf(data));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const dirty = useDirty(base, draft);
  useUnsavedWarning(dirty);

  // Newer data from the server (another tab, a colleague): adopt it when
  // nothing is being edited; keep the edits otherwise.
  if (seen !== loadedKey) {
    setSeen(loadedKey);
    const next = draftOf(data);
    setBase(next);
    if (!dirty) setDraft(next);
  }

  const labels = new Map<string, string>();
  for (const direction of data.directions) for (const category of direction.categories) labels.set(category.key, category.label);
  const fallbackLabel = labels.get("hotels/inshi-tovary") ?? "Інші товари для готелів";

  // An edited field loses its error at once; a duplicate code also clears
  // on the other categories that named it.
  const dropErrors = (names: string[]) => {
    const hit = names.filter((name) => name in errors);
    if (hit.length === 0) return;
    const next = { ...errors };
    for (const name of hit) delete next[name];
    setErrors(next);
  };

  const changeCategory = (key: string, patch: MetaPatch) => {
    const current = draft.categories[key] ?? { externalId: null, stockThreshold: null, note: "" };
    setDraft({ ...draft, categories: { ...draft.categories, [key]: { ...current, ...patch } } });
    const names = Object.keys(patch).map((field) => `${key}.${field}`);
    if ("externalId" in patch) names.push(...Object.keys(errors).filter((name) => name.endsWith(".externalId")));
    dropErrors(names);
  };

  const changeList = (list: ListKey, value: string[]) => {
    setDraft({ ...draft, [list]: value });
    dropErrors([list]);
  };

  const reset = () => {
    setDraft(base);
    setErrors({});
  };

  const save = async () => {
    const local = duplicateCodes(draft, labels);
    if (Object.keys(local).length > 0) {
      setErrors(local);
      toast.error("Один код групи вказано в кількох категоріях. Залиште його лише в одній.");
      return;
    }
    setSaving(true);
    const result = await adminApi<TaxonomyAnswer>("/taxonomy/meta", { method: "PUT", body: draft });
    setSaving(false);
    if (!result.ok) {
      if (result.error === "fields") setErrors(fieldErrors(result));
      toastError(result);
      return;
    }
    const next = draftOf(result.data);
    setSeen(keyOf(result.data));
    setBase(next);
    setDraft(next);
    setErrors({});
    setQueryData(KEY, result.data);
    // The product editor's vocabulary, the stock states of the products
    // list and the settings tab of the same document read what changed.
    invalidate("/products");
    invalidate("/settings");
    invalidate("/audit");
    toast.success("Зміни збережено");
  };

  const errorCount = Object.keys(errors).length;
  const status = errorCount > 0 ? "Виправте виділені поля" : dirty ? "Є незбережені зміни" : "Усі зміни збережено";

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (dirty && !saving) void save();
      }}
      className="flex min-w-0 flex-col gap-8"
    >
      <div className="flex min-w-0 flex-col gap-4">
        {data.directions.map((direction) => (
          <DirectionCard
            key={direction.slug}
            direction={direction}
            draft={draft.categories}
            errors={errors}
            shopThreshold={data.shopStockThreshold}
            fallbackLabel={fallbackLabel}
            canEdit={canEdit}
            onChange={changeCategory}
          />
        ))}
      </div>

      <PageSection title="Довідники товарів" description="Значення, які редактор товарів пропонує на вибір.">
        <ReferenceLists
          brands={data.brands}
          manufacturersInUse={data.manufacturersInUse ?? []}
          countriesInUse={data.countriesInUse ?? []}
          draft={{ brands: draft.brands, manufacturers: draft.manufacturers, countries: draft.countries }}
          errors={errors}
          canEdit={canEdit}
          onChange={changeList}
        />
      </PageSection>

      {canEdit && (
        <FormActions sticky status={status}>
          <Button variant="secondary" onClick={reset} disabled={!dirty || saving}>
            Скасувати
          </Button>
          <Button type="submit" loading={saving} disabled={!dirty}>
            Зберегти зміни
          </Button>
        </FormActions>
      )}
    </form>
  );
}

export function CategoriesScreen() {
  const { can } = useStaff();
  const canEdit = can("catalog.edit");
  const taxonomy = useAdminQuery<TaxonomyAnswer>(KEY);
  const data = taxonomy.data;
  const categoryCount = data ? data.directions.reduce((sum, direction) => sum + direction.categories.length, 0) : null;
  const orphans = data?.orphans ?? [];

  return (
    <Page>
      <PageHeader
        title="Категорії"
        light={categoryCount !== null ? formatNumber(categoryCount) : undefined}
        subtitle={
          <span className="block max-w-[820px]">
            Напрями й категорії закладено в код сайту: додати чи перейменувати їх може лише розробник. Тут видно, скільки в них товарів, і
            зберігається те, що панель тримає поруч: код групи в BAS (за ним обмін з обліковою системою розкладає нові товари по
            категоріях), власний поріг залишку й нотатка.
          </span>
        }
      />
      {taxonomy.error && !data ? (
        <div className={SURFACE.card}>
          <ErrorState failure={taxonomy.error} onRetry={taxonomy.reload} />
        </div>
      ) : !data ? (
        <LoadingCards />
      ) : (
        <div className="flex min-w-0 flex-col gap-8">
          {orphans.length > 0 && <OrphansCard orphans={orphans} canEdit={canEdit} />}
          <CategoriesForm data={data} canEdit={canEdit} />
          <EntityHistory type="settings" id="catalog" />
        </div>
      )}
    </Page>
  );
}
