"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { adminApi } from "../lib/api";
import { cx } from "../lib/format";
import { invalidate, setQueryData } from "../lib/query";
import {
  Button,
  ErrorState,
  FormActions,
  FormGrid,
  FormSection,
  MoneyInput,
  Page,
  PageHeader,
  Skeleton,
  SkeletonText,
  Stack,
  SURFACE,
  Switch,
  toast,
  useUnsavedWarning,
} from "../ui";
import { createOf, emptyDraft, validate, type Draft, type Errors } from "./draft";
import { MainTab, PhotosTab } from "./EditorTabs";
import { PRODUCTS_PATH, productApi, productPath, refusalText, useProductOptions } from "./shared";
import type { ProductAnswer, ProductOptionsAnswer } from "./types";

// /admin/products/new: only what a product needs to exist (the card, the
// category, the price, the photo). After "Створити товар" the full editor
// opens for the rest (description, galleries, related products...).

export function ProductNewScreen() {
  const options = useProductOptions();
  if (options.error && !options.data) {
    return (
      <Page width="narrow">
        <div className={cx(SURFACE.card, "flex flex-1 flex-col")}>
          <ErrorState failure={options.error} onRetry={options.reload} />
        </div>
      </Page>
    );
  }
  if (!options.data) {
    return (
      <Page width="narrow">
        <div className="flex flex-col gap-4 pb-6">
          <Skeleton className="h-8 w-40" shape="pill" />
          <Skeleton className="h-10 w-72" />
        </div>
        <Stack gap={4}>
          {[0, 1, 2].map((key) => (
            <div key={key} className={cx(SURFACE.card, SURFACE.cardPadding)}>
              <SkeletonText lines={3} />
            </div>
          ))}
        </Stack>
      </Page>
    );
  }
  return <NewProductForm options={options.data} />;
}

function NewProductForm({ options }: { options: ProductOptionsAnswer }) {
  const router = useRouter();
  const search = useSearchParams();
  const [initial] = useState<Draft>(() =>
    emptyDraft(options.directions, { direction: search.get("direction") ?? undefined, category: search.get("category") ?? undefined }),
  );
  const [draft, setDraft] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(false);

  const dirty = !created && JSON.stringify(createOf(initial)) !== JSON.stringify(createOf(draft));
  useUnsavedWarning(dirty);

  const set = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const keys = Object.keys(patch).flatMap((key) => (key === "direction" ? ["subcategory", "zone", "productType"] : key === "sku" ? ["details.sku"] : [key]));
      const next = Object.fromEntries(Object.entries(current).filter(([path]) => !keys.includes(path)));
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  };

  const create = async () => {
    const found = validate(draft, true);
    if (Object.keys(found).length) {
      setErrors(found);
      toast.error("Перевірте виділені поля");
      return;
    }
    setSaving(true);
    const result = await adminApi<ProductAnswer>("/products", { method: "POST", body: createOf(draft) });
    if (!result.ok) {
      setSaving(false);
      const fields = result.data?.fields;
      if (fields && typeof fields === "object") {
        setErrors(
          Object.fromEntries(
            Object.entries(fields as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
          ),
        );
      }
      toast.error(refusalText(result));
      return;
    }
    const product = result.data.product;
    setCreated(true);
    setQueryData<ProductAnswer>(productApi(product.id), result.data);
    invalidate("/products?");
    toast.show({
      tone: "success",
      title: "Товар створено",
      text: product.listed ? "Він уже є в каталозі. Додайте опис і галерею." : "Поки він прихований з каталогу. Додайте опис і галерею, потім увімкніть показ.",
    });
    router.replace(productPath(product.id));
  };

  const tabProps = { draft, set, errors, product: null, options, readOnly: false };

  return (
    <Page width="narrow">
      <PageHeader
        back={{ href: PRODUCTS_PATH, label: "До списку товарів" }}
        title="Новий товар"
        subtitle="Спершу головне: назва, категорія, ціна і фото. Опис, галереї та інше додасте після створення."
      />
      <Stack gap={4}>
        <MainTab {...tabProps} creating initialSubcategory="" />
        <FormSection title="Ціна і показ" description="Ціну можна змінити будь-коли; акцію й партнерські ціни налаштуєте в редакторі.">
          <div className="flex min-w-0 flex-col gap-5">
            <FormGrid>
              <MoneyInput label="Роздрібна ціна" required value={draft.price} onChange={(price) => set({ price })} error={errors.price} />
            </FormGrid>
            <div className="flex min-w-0 flex-col divide-y divide-stroke-subtle [&>*]:py-3 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
              <Switch
                label="В наявності"
                labelPosition="start"
                checked={draft.available}
                onChange={(available) => set({ available })}
                hint="Вимкнено: роздрібні покупці не можуть купити товар, партнери бачать «Під замовлення»."
              />
              <Switch
                label="Одразу показати в каталозі"
                labelPosition="start"
                checked={draft.listed}
                onChange={(listed) => set({ listed })}
                hint="Можна ввімкнути пізніше, коли заповните опис. Сторінка товару працюватиме за посиланням і без цього."
              />
            </div>
          </div>
        </FormSection>
        <PhotosTab {...tabProps} creating />
      </Stack>
      <FormActions sticky className="mt-4" status={dirty ? "Товар ще не створено" : "Заповніть поля, позначені зірочкою"}>
        <Button variant="secondary" href={PRODUCTS_PATH}>
          Скасувати
        </Button>
        <Button onClick={() => void create()} loading={saving} disabled={created}>
          Створити товар
        </Button>
      </FormActions>
    </Page>
  );
}
