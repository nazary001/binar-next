"use client";

import {
  ArchiveBoxIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUturnLeftIcon,
  DocumentDuplicateIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { EntityHistory } from "../common/EntityHistory";
import { adminApi } from "../lib/api";
import { countOf, cx, formatDateTime } from "../lib/format";
import { invalidate, setQueryData, useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import {
  Badge,
  Button,
  ErrorState,
  FormActions,
  KebabMenu,
  LinkTabs,
  NotFoundState,
  Page,
  PageHeader,
  Skeleton,
  SkeletonText,
  Stack,
  SURFACE,
  toast,
  useUnsavedWarning,
  type MenuItem,
} from "../ui";
import { draftOf, EDITOR_TABS, firstErrorTab, patchOf, tabOf, validate, type Draft, type EditorTab, type Errors } from "./draft";
import { AccountingTab, DescriptionTab, MainTab, PhotosTab, PricesTab, RelatedTab, SeoTab } from "./EditorTabs";
import type { KnownProduct } from "./fields";
import {
  PRODUCTS_PATH,
  archiveProduct,
  deleteProduct,
  directionOfLabel,
  directionShort,
  duplicateProduct,
  productApi,
  productPath,
  refusalText,
  restoreProduct,
  useProductOptions,
} from "./shared";
import type { ProductAnswer, ProductDetail, ProductListAnswer, ProductOptionsAnswer, ProductPatchAnswer, ProductReorderAnswer } from "./types";

// /admin/products/<id>: the whole product in tabs (?tab= in the address
// bar), one save bar for all of them. A save sends only the fields that
// changed; refused fields land under their inputs and the editor opens the
// tab of the first one. Archive, restore, duplicate, delete and the moves
// in the listing order act on the saved record, so they ask to save or
// cancel pending edits first.

const FIELD_FORMS = ["поле", "поля", "полів"] as const;

// The error paths a draft key feeds (an edit clears their errors).
const ERROR_PATHS: Partial<Record<keyof Draft, string[]>> = {
  direction: ["subcategory", "zone", "productType"],
  promo: ["oldPrice", "discount"],
  sku: ["details.sku"],
  description: ["details.description"],
  benefits: ["details.benefits"],
  characteristics: ["details.characteristics"],
  payment: ["details.payment"],
  delivery: ["details.delivery"],
  scent: ["details.scent"],
  images: ["details.images"],
  platformImages: ["details.platformImages"],
  mirror: ["details.platformImages"],
  boughtTogether: ["details.boughtTogether"],
  seriesIds: ["details.seriesIds"],
  similarIds: ["details.similarIds"],
};

function clearErrors(errors: Errors, keys: string[]): Errors {
  const paths = keys.flatMap((key) => ERROR_PATHS[key as keyof Draft] ?? [key]);
  const next: Errors = {};
  let changed = false;
  for (const [path, message] of Object.entries(errors)) {
    if (paths.some((prefix) => path === prefix || path.startsWith(`${prefix}.`))) changed = true;
    else next[path] = message;
  }
  return changed ? next : errors;
}

function EditorSkeleton() {
  return (
    <Page>
      <div className="flex flex-col gap-4 pb-6">
        <Skeleton className="h-8 w-40" shape="pill" />
        <Skeleton className="h-10 w-[min(520px,80%)]" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-10 w-[min(640px,100%)]" shape="pill" />
      </div>
      <Stack gap={4}>
        {[0, 1].map((key) => (
          <div key={key} className={cx(SURFACE.card, SURFACE.cardPadding, "xl:grid xl:grid-cols-[280px_minmax(0,1fr)] xl:gap-x-10")}>
            <SkeletonText lines={2} className="mb-5 xl:mb-0" />
            <div className="grid gap-5 min-[640px]:grid-cols-2">
              <Skeleton className="h-10 min-[640px]:col-span-2" shape="pill" />
              <Skeleton className="h-10" shape="pill" />
              <Skeleton className="h-10" shape="pill" />
            </div>
          </div>
        ))}
      </Stack>
    </Page>
  );
}

export function ProductEditorScreen({ id }: { id: string }) {
  const query = useAdminQuery<ProductAnswer>(productApi(id));
  const options = useProductOptions();
  // Bumped after every save: the form starts again from the saved record.
  const [version, setVersion] = useState(0);
  const product = query.data?.product.id === id ? query.data.product : null;

  if (query.error && query.error.status === 404) {
    return (
      <Page>
        <div className={cx(SURFACE.card, "flex flex-1 flex-col")}>
          <NotFoundState
            title="Товар не знайдено"
            text="Можливо, його вже видалили або адреса неточна."
            backHref={PRODUCTS_PATH}
            backLabel="До списку товарів"
          />
        </div>
      </Page>
    );
  }
  if ((query.error && !product) || (options.error && !options.data)) {
    const failure = query.error ?? options.error;
    return (
      <Page>
        <div className={cx(SURFACE.card, "flex flex-1 flex-col")}>
          <ErrorState
            failure={failure ?? undefined}
            onRetry={() => {
              query.reload();
              options.reload();
            }}
          />
        </div>
      </Page>
    );
  }
  if (!product || !options.data) return <EditorSkeleton />;
  return (
    <ProductEditor
      key={`${product.id}:${product.updatedAt}:${version}`}
      product={product}
      options={options.data}
      onSaved={(saved) => {
        setQueryData<ProductAnswer>(productApi(saved.id), { ok: true, product: saved });
        setVersion((value) => value + 1);
      }}
    />
  );
}

function ProductEditor({
  product,
  options,
  onSaved,
}: {
  product: ProductDetail;
  options: ProductOptionsAnswer;
  onSaved: (product: ProductDetail) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { can } = useStaff();
  const canEdit = can("catalog.edit");
  const readOnly = !canEdit;

  const [initial] = useState<Draft>(() => draftOf(product, options.directions));
  const [draft, setDraft] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState<"start" | "end" | null>(null);
  // Titles of related products picked in this session (the saved ones come
  // with the record).
  const [picked, setPicked] = useState<Record<string, KnownProduct>>({});

  const asked = search.get("tab");
  const tab: EditorTab = EDITOR_TABS.some((item) => item.key === asked) ? (asked as EditorTab) : "main";
  const tabHref = (key: EditorTab) => {
    const params = new URLSearchParams(search.toString());
    if (key === "main") params.delete("tab");
    else params.set("tab", key);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const patch = patchOf(initial, draft);
  const changedCount = Object.keys(patch).length + (patch.details ? Object.keys(patch.details).length - 1 : 0);
  const dirty = changedCount > 0;
  useUnsavedWarning(dirty && canEdit);

  const set = (next: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...next }));
    setErrors((current) => clearErrors(current, Object.keys(next)));
  };

  const known: Record<string, KnownProduct> = { ...picked };
  for (const [relatedId, item] of Object.entries(product.related)) known[relatedId] = item;
  const relatedIds = [...draft.boughtTogether.map((item) => item.productId), ...draft.seriesIds, ...draft.similarIds];
  for (const relatedId of relatedIds) {
    if (!known[relatedId]) known[relatedId] = { id: relatedId, title: relatedId, image: "", sku: "", archived: false, missing: true };
  }
  const remember = (item: KnownProduct) => setPicked((current) => ({ ...current, [item.id]: item }));

  const errorTabs = new Set(Object.keys(errors).map(tabOf));

  const openTab = (key: EditorTab) => {
    if (key !== tab) router.replace(tabHref(key), { scroll: false });
  };

  // --- save ---------------------------------------------------------------------------

  const save = async () => {
    const found = validate(draft, false);
    if (Object.keys(found).length) {
      setErrors(found);
      const first = firstErrorTab(found);
      if (first) openTab(first);
      toast.error("Перевірте виділені поля");
      return;
    }
    setSaving(true);
    const result = await adminApi<ProductPatchAnswer>(productApi(product.id), { method: "PATCH", body: patch });
    setSaving(false);
    if (!result.ok) {
      const fields = result.data?.fields;
      if ((result.error === "fields" || result.error === "exists") && fields && typeof fields === "object") {
        const next = Object.fromEntries(
          Object.entries(fields as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
        );
        setErrors(next);
        const first = firstErrorTab(next);
        if (first) openTab(first);
      }
      toast.error(refusalText(result));
      return;
    }
    invalidate("/products");
    invalidate("/audit");
    toast.success(result.data.changed.length ? "Зміни збережено" : "Змін немає: товар уже такий");
    onSaved(result.data.product);
  };

  const cancel = () => {
    setDraft(initial);
    setErrors({});
  };

  // Actions on the saved record would drop the edits on screen.
  const blockedByEdits = (): boolean => {
    if (!dirty) return false;
    toast.info("Спершу збережіть або скасуйте зміни");
    return true;
  };

  const afterRecordChange = (saved: ProductDetail | null) => {
    if (saved) onSaved(saved);
  };

  // --- listing order -----------------------------------------------------------------------

  const reorder = async (where: "start" | "end") => {
    if (blockedByEdits()) return;
    setMoving(where);
    let beforeId: string | null = null;
    if (where === "start") {
      const first = await adminApi<ProductListAnswer>("/products?archived=all&sort=sort&limit=1");
      if (!first.ok) {
        setMoving(null);
        toast.error(refusalText(first));
        return;
      }
      beforeId = first.data.items[0]?.id ?? null;
      if (beforeId === product.id) {
        setMoving(null);
        toast.info("Товар уже перший у каталозі");
        return;
      }
    }
    const result = await adminApi<ProductReorderAnswer>("/products/reorder", { method: "POST", body: { id: product.id, beforeId } });
    if (!result.ok) {
      setMoving(null);
      toast.error(refusalText(result));
      return;
    }
    if (!result.data.moved) {
      setMoving(null);
      toast.info(where === "start" ? "Товар уже перший у каталозі" : "Товар уже останній у каталозі");
      return;
    }
    const fresh = await adminApi<ProductAnswer>(productApi(product.id));
    setMoving(null);
    invalidate("/products");
    toast.success(where === "start" ? "Товар переміщено на початок каталогу" : "Товар переміщено в кінець каталогу");
    if (fresh.ok) onSaved(fresh.data.product);
  };

  // --- head --------------------------------------------------------------------------------------

  const direction = directionOfLabel(options.directions, product.subcategory);
  const subtitle = product.orphan
    ? "Поза розділами каталогу"
    : [directionShort(direction), product.subcategory].filter(Boolean).join(" / ");

  const menu: MenuItem[] = [
    {
      key: "duplicate",
      label: "Дублювати",
      icon: DocumentDuplicateIcon,
      onSelect: async () => {
        if (blockedByEdits()) return;
        const copy = await duplicateProduct(product.id);
        if (copy) router.push(productPath(copy.id));
      },
    },
    { key: "divider", divider: true },
    product.archived
      ? {
          key: "restore",
          label: "Відновити з архіву",
          icon: ArrowUturnLeftIcon,
          onSelect: async () => {
            if (!blockedByEdits()) afterRecordChange(await restoreProduct(product.id));
          },
        }
      : {
          key: "archive",
          label: "Перенести в архів",
          icon: ArchiveBoxIcon,
          tone: "danger",
          onSelect: async () => {
            if (!blockedByEdits()) afterRecordChange(await archiveProduct(product.id, product.title));
          },
        },
  ];
  if (product.archived) {
    menu.push({
      key: "delete",
      label: "Видалити назавжди",
      icon: TrashIcon,
      tone: "danger",
      onSelect: async () => {
        if (await deleteProduct(product.id, product.title)) router.replace(`${PRODUCTS_PATH}?archived=true`);
      },
    });
  }

  const usage = product.usage;
  const usageText = [
    usage.orders ? `у ${countOf(usage.orders, ["замовленні", "замовленнях", "замовленнях"])}` : "",
    usage.assortments ? `в асортименті ${countOf(usage.assortments, ["партнера", "партнерів", "партнерів"])}` : "",
    usage.carts ? `у ${countOf(usage.carts, ["кошику", "кошиках", "кошиках"])}` : "",
  ].filter(Boolean);

  const tabProps = { draft, set, errors, product, options, readOnly };

  return (
    <Page>
      <PageHeader
        back={{ href: PRODUCTS_PATH, label: "До списку товарів" }}
        title={product.title}
        subtitle={subtitle}
        meta={
          <>
            {product.archived ? (
              <Badge tone="neutral" size="md">
                Архів
              </Badge>
            ) : product.listed ? (
              <Badge tone="green" size="md" dot>
                У каталозі
              </Badge>
            ) : (
              <Badge tone="neutral" size="md" dot>
                Приховано
              </Badge>
            )}
            {product.available ? (
              <Badge tone="green" size="md">
                В наявності
              </Badge>
            ) : (
              <Badge tone="red" size="md">
                Немає в наявності
              </Badge>
            )}
            {product.preorder && (
              <Badge tone="amber" size="md">
                Під замовлення
              </Badge>
            )}
            {product.oldPrice !== null && (
              <Badge tone="orange" size="md">
                Акція
              </Badge>
            )}
            <span className="text-[13px] leading-[18px] text-neutral-500">Оновлено {formatDateTime(product.updatedAt)}</span>
            {usageText.length > 0 && (
              <span className="text-[13px] leading-[18px] text-neutral-500">Є {usageText.join(", ")}</span>
            )}
          </>
        }
        actions={
          <>
            <Button
              variant="secondary"
              iconLeft={ArrowTopRightOnSquareIcon}
              href={product.href}
              external
              disabled={product.archived}
              title={product.archived ? "Товар в архіві: його сторінка не відкривається" : undefined}
            >
              Відкрити на сайті
            </Button>
            {canEdit && <KebabMenu label="Інші дії з товаром" items={menu} />}
          </>
        }
        tabs={
          // Switching tabs keeps the edits: the tab links must not ask.
          <div data-unsaved-ignore="">
            <LinkTabs
              label="Розділи товару"
              value={tab}
              items={EDITOR_TABS.map((item) => ({ key: item.key, label: item.label, href: tabHref(item.key) }))}
            />
          </div>
        }
      />

      {/* Every panel stays mounted (an upload in progress survives a tab switch). */}
      <div hidden={tab !== "main"}>
        <MainTab
          {...tabProps}
          creating={false}
          initialSubcategory={initial.subcategory}
          reorder={canEdit ? { busy: moving, toStart: () => void reorder("start"), toEnd: () => void reorder("end") } : undefined}
        />
      </div>
      <div hidden={tab !== "prices"}>
        <PricesTab {...tabProps} />
      </div>
      <div hidden={tab !== "photos"}>
        <PhotosTab {...tabProps} />
      </div>
      <div hidden={tab !== "description"}>
        <DescriptionTab {...tabProps} />
      </div>
      <div hidden={tab !== "related"}>
        <RelatedTab {...tabProps} selfId={product.id} known={known} remember={remember} />
      </div>
      <div hidden={tab !== "accounting"}>
        <AccountingTab {...tabProps} />
      </div>
      <div hidden={tab !== "seo"}>
        <SeoTab {...tabProps} />
      </div>

      {canEdit && (
        <FormActions
          sticky
          className="mt-4"
          status={
            Object.keys(errors).length
              ? `Перевірте поля на вкладках: ${EDITOR_TABS.filter((item) => errorTabs.has(item.key))
                  .map((item) => `«${item.label}»`)
                  .join(", ")}`
              : dirty
                ? `Не збережено: змінено ${countOf(changedCount, FIELD_FORMS)}`
                : "Усі зміни збережено"
          }
        >
          <Button variant="secondary" onClick={cancel} disabled={!dirty || saving}>
            Скасувати
          </Button>
          <Button onClick={() => void save()} loading={saving} disabled={!dirty}>
            Зберегти зміни
          </Button>
        </FormActions>
      )}

      <div className="mt-6">
        <EntityHistory type="product" id={product.id} refreshKey={product.updatedAt} />
      </div>
    </Page>
  );
}
