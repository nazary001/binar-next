"use client";

import { useSyncExternalStore } from "react";
import { adminApi, errorMessage, type ApiFailure } from "../lib/api";
import { invalidate, setQueryData } from "../lib/query";
import type { PaymentStatus } from "../ui/status";
import { ORDER_ERRORS, type OrderAnswer, type OrderDetail, type OrderPatchBody, type OrderRow } from "./types";

// Pieces the two order screens share: the cache keys, the refresh after a
// change, the wording of refusals, and the way back to the filtered list.

export function orderKey(id: string): string {
  return `/orders/${encodeURIComponent(id)}`;
}

export function orderHref(id: string): string {
  return `/admin/orders/${encodeURIComponent(id)}`;
}

// Everything else that shows orders: the lists, the menu counters, the
// overview and the delivery section.
export function refreshOrderViews(): void {
  invalidate("/orders?");
  invalidate("/nav-counts");
  invalidate("/overview");
  invalidate("/shipping");
}

// A changed order straight into the cache of its page, then the rest.
export function storeOrder(order: OrderDetail): void {
  setQueryData<OrderAnswer>(orderKey(order.id), { ok: true, order });
  refreshOrderViews();
}

// Sentences for one action, on top of the section's and the panel's own.
export function orderErrorText(failure: ApiFailure, own: Record<string, string> = {}): string {
  return errorMessage(failure, { ...ORDER_ERRORS, ...own });
}

// PATCH /orders/<id>. The changed order lands in the cache; a refusal
// comes back as it is (the caller words it). A "conflict" (somebody
// changed the order meanwhile) reloads the page's data at once, so the
// next try starts from what is stored.
export async function patchOrder(id: string, body: OrderPatchBody) {
  const result = await adminApi<OrderAnswer>(orderKey(id), { method: "PATCH", body });
  if (result.ok) storeOrder(result.data.order);
  else if (result.error === "conflict" || result.error === "state") invalidate(orderKey(id));
  return result;
}

// What the payment of an order is, as the status vocabulary names it (a
// shop order with nothing recorded is waiting for its money).
export function paymentKindOf(order: Pick<OrderRow, "payment">): PaymentStatus {
  return order.payment?.kind ?? "awaiting";
}

// --- the way back to the list ------------------------------------------------------
//
// The list remembers its address (filters, sort, page) here, so the back
// pill of an order page returns to the same filtered list. A tiny store
// read through useSyncExternalStore: the server and a fresh load render the
// plain list address.

let lastListQuery = "";
const listeners = new Set<() => void>();

export function rememberListQuery(query: string): void {
  if (query === lastListQuery) return;
  lastListQuery = query;
  for (const listener of [...listeners]) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOrdersBackHref(): string {
  const query = useSyncExternalStore(
    subscribe,
    () => lastListQuery,
    () => "",
  );
  return query ? `/admin/orders?${query}` : "/admin/orders";
}
