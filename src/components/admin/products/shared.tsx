"use client";

/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";
import { adminApi, errorMessage, type ApiFailure } from "../lib/api";
import { countOf, cx } from "../lib/format";
import { invalidate, useAdminQuery } from "../lib/query";
import { confirmDialog, toast, TONES, type Tone } from "../ui";
import {
  PRODUCT_ERRORS,
  STOCK_STATES,
  type ProductAnswer,
  type ProductBulkAction,
  type ProductBulkAnswer,
  type ProductDetail,
  type ProductOptionsAnswer,
  type ProductOptionsDirection,
  type StockState,
} from "./types";

// What the list and the editor of /admin/products share: the editor's
// vocabulary, the wording of refusals, and the actions both screens offer
// (duplicate, archive, restore, delete, bulk changes), each with its
// question, its toast and the refresh of every list showing products.

export const PRODUCTS_PATH = "/admin/products";

export const productPath = (id: string): string => `${PRODUCTS_PATH}/${encodeURIComponent(id)}`;
export const productApi = (id: string): string => `/products/${encodeURIComponent(id)}`;

export const PRODUCT_FORMS = ["товар", "товари", "товарів"] as const;

// --- vocabulary ----------------------------------------------------------------

export function useProductOptions() {
  return useAdminQuery<ProductOptionsAnswer>("/products/options");
}

// Short names of the directions for filters and table cells (the full
// titles are long sentences of the storefront menu).
const SHORT_DIRECTION: Record<string, string> = {
  hotels: "Готелі",
  protect: "Захист (ЗІЗ)",
  cleaning: "Прибирання",
};

export function directionShort(direction: Pick<ProductOptionsDirection, "slug" | "title"> | undefined | null): string {
  if (!direction) return "";
  return SHORT_DIRECTION[direction.slug] ?? direction.title;
}

// The direction a category label belongs to (the storefront files a product
// under the first card with its label; options list each label once).
export function directionOfLabel(directions: ProductOptionsDirection[], label: string): ProductOptionsDirection | null {
  return directions.find((direction) => direction.categories.some((category) => category.label === label)) ?? null;
}

// --- stock -------------------------------------------------------------------------

export const STOCK_TONE: Record<StockState, Tone> = { in: "green", low: "amber", out: "red", unknown: "neutral" };

// Shorter labels than the API's, for the filter: "В наявності" already
// names the storefront's own flag, so the warehouse says "на складі".
export const STOCK_FILTER_LABELS: Record<StockState, string> = {
  in: "Є на складі",
  low: "Мало на складі",
  out: "Немає на складі",
  unknown: "Залишок невідомий",
};

export function stockLabel(state: StockState): string {
  return STOCK_STATES.find((item) => item.value === state)?.label ?? state;
}

export function stockColor(state: StockState): string | undefined {
  return state === "unknown" ? undefined : TONES[STOCK_TONE[state]].text;
}

// --- refusals ----------------------------------------------------------------------

// A refused write as one sentence: the field's own message when the API
// named one ("Товар в архіві: спершу поверніть його"), else the shared or
// the section's wording.
export function refusalText(result: ApiFailure, own: Record<string, string> = PRODUCT_ERRORS): string {
  const fields = result.data?.fields;
  if ((result.error === "fields" || result.error === "exists") && fields && typeof fields === "object") {
    const first = Object.values(fields as Record<string, unknown>).find((value) => typeof value === "string");
    if (typeof first === "string") return first;
  }
  return errorMessage(result, own);
}

function usageSentence(result: ApiFailure): string | null {
  const usage = result.data?.usage as { orders?: number } | undefined;
  if (result.error !== "in-use" || !usage || typeof usage.orders !== "number" || usage.orders < 1) return null;
  return `Товар є в ${countOf(usage.orders, ["замовленні", "замовленнях", "замовленнях"])}: його можна залишити в архіві, але не видалити.`;
}

// --- actions -------------------------------------------------------------------------

// Each returns what the screen needs next (the new or changed product, or
// true for a removal) and null when it was cancelled or refused; the
// question, the toast and the refresh are done here.

export async function duplicateProduct(id: string): Promise<ProductDetail | null> {
  const result = await adminApi<ProductAnswer>(`${productApi(id)}/duplicate`, { method: "POST" });
  if (!result.ok) {
    toast.error(refusalText(result));
    return null;
  }
  invalidate("/products");
  toast.show({ tone: "success", title: "Копію створено", text: "Вона прихована з каталогу, поки ви її не покажете." });
  return result.data.product;
}

export async function archiveProduct(id: string, title: string): Promise<ProductDetail | null> {
  const confirmed = await confirmDialog({
    title: "Перенести товар в архів?",
    text: `«${title}» зникне з каталогу, а сторінка товару на сайті перестане відкриватися. Замовлення з ним не зміняться.`,
    confirmLabel: "Перенести в архів",
    tone: "danger",
  });
  if (!confirmed) return null;
  const result = await adminApi<ProductAnswer>(`${productApi(id)}/archive`, { method: "POST" });
  if (!result.ok) {
    toast.error(refusalText(result, { ...PRODUCT_ERRORS, state: "Товар уже в архіві. Оновіть сторінку." }));
    return null;
  }
  invalidate("/products");
  toast.success("Товар перенесено в архів");
  return result.data.product;
}

export async function restoreProduct(id: string): Promise<ProductDetail | null> {
  const result = await adminApi<ProductAnswer>(`${productApi(id)}/restore`, { method: "POST" });
  if (!result.ok) {
    toast.error(refusalText(result, { ...PRODUCT_ERRORS, state: "Товар уже не в архіві. Оновіть сторінку." }));
    return null;
  }
  invalidate("/products");
  toast.show({
    tone: "success",
    title: "Товар повернуто з архіву",
    text: "Сторінка товару знову працює. У каталозі він з'явиться, коли ви ввімкнете показ.",
  });
  return result.data.product;
}

export async function deleteProduct(id: string, title: string): Promise<boolean> {
  const confirmed = await confirmDialog({
    title: "Видалити товар назавжди?",
    text: `«${title}» буде видалено без можливості відновити, а згадки про нього приберемо з інших товарів.`,
    confirmLabel: "Видалити назавжди",
    tone: "danger",
  });
  if (!confirmed) return false;
  const result = await adminApi<{ ok: true; id: string }>(productApi(id), { method: "DELETE" });
  if (!result.ok) {
    toast.error(
      usageSentence(result) ?? refusalText(result, { ...PRODUCT_ERRORS, state: "Видалити можна лише товар з архіву." }),
    );
    return false;
  }
  // Lists only: the removed product's own page would answer 404.
  invalidate("/products?");
  toast.success("Товар видалено");
  return true;
}

const BULK_DONE: Record<ProductBulkAction, string> = {
  list: "показано в каталозі",
  unlist: "приховано з каталогу",
  available: "позначено як наявні",
  unavailable: "позначено як відсутні",
  archive: "перенесено в архів",
  restore: "повернуто з архіву",
};

export async function bulkProducts(ids: string[], action: ProductBulkAction): Promise<ProductBulkAnswer | null> {
  if (action === "archive") {
    const confirmed = await confirmDialog({
      title: `Перенести в архів ${countOf(ids.length, PRODUCT_FORMS)}?`,
      text: "Вони зникнуть з каталогу, а їхні сторінки на сайті перестануть відкриватися. Замовлення не зміняться.",
      confirmLabel: "Перенести в архів",
      tone: "danger",
    });
    if (!confirmed) return null;
  }
  const result = await adminApi<ProductBulkAnswer>("/products/bulk", { method: "POST", body: { ids, action } });
  if (!result.ok) {
    toast.error(refusalText(result));
    return null;
  }
  const answer = result.data;
  invalidate("/products");
  const notes: string[] = [];
  if (answer.skipped.length) {
    notes.push(`${countOf(answer.skipped.length, PRODUCT_FORMS)} пропущено: архівні товари й товари без категорії каталогу показати не можна.`);
  }
  if (answer.missing.length) notes.push(`${countOf(answer.missing.length, PRODUCT_FORMS)} вже не існує.`);
  if (answer.changed === 0) {
    toast.show({ tone: "info", title: "Нічого не змінилося", text: notes.join(" ") || "Вибрані товари вже в такому стані." });
  } else {
    const title = `${countOf(answer.changed, PRODUCT_FORMS)} ${BULK_DONE[action]}`;
    if (notes.length) toast.show({ tone: "success", title, text: notes.join(" ") });
    else toast.success(title);
  }
  return answer;
}

// --- small pieces --------------------------------------------------------------------

// A product photo: square, contained on the light tile (the storefront shows
// product photos uncropped on a light backdrop).
export function ProductThumb({ src, size = "md", className }: { src: string | null | undefined; size?: "sm" | "md" | "lg"; className?: string }) {
  const box = size === "sm" ? "size-8 rounded-lg" : size === "lg" ? "size-14 rounded-2xl" : "size-10 rounded-xl";
  if (!src) return <span aria-hidden className={cx("shrink-0 bg-bg-cabinet", box, className)} />;
  return <img src={src} alt="" loading="lazy" className={cx("shrink-0 bg-bg-subtle object-contain p-0.5", box, className)} />;
}

// A quiet note inside a card: a tinted tile with one or two sentences.
// `onSlab`: the note sits on the grey page itself, so it is white.
export function Note({
  tone = "neutral",
  title,
  children,
  onSlab = false,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children: ReactNode;
  onSlab?: boolean;
  className?: string;
}) {
  const colors = TONES[tone];
  return (
    <div
      className={cx(
        "py-3 text-[13px] leading-[18px]",
        onSlab ? "rounded-3xl px-5 min-[1024px]:px-6" : "rounded-2xl px-4",
        tone === "neutral" && (onSlab ? "bg-white" : "bg-bg-subtle"),
        className,
      )}
      style={tone === "neutral" ? undefined : { backgroundColor: colors.bg, color: colors.text }}
    >
      {title && <p className="font-semibold">{title}</p>}
      <div className={cx(tone === "neutral" ? "text-neutral-600" : undefined, title ? "mt-0.5" : undefined)}>{children}</div>
    </div>
  );
}
