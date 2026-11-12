"use client";

import { useSyncExternalStore } from "react";
import { adminApi, errorMessage, type ApiFailure } from "../lib/api";
import { invalidate, setQueryData } from "../lib/query";
import { RETURN_ERRORS, RETURN_STATE_REASONS, type ReturnAnswer, type ReturnDetail, type ReturnPatchBody } from "./types";

// Pieces the two return screens share: the cache keys, the refresh after
// a change, the wording of refusals, and the way back to the filtered list.

export function returnKey(id: string): string {
  return `/returns/${encodeURIComponent(id)}`;
}

export function returnHref(id: string): string {
  return `/admin/returns/${encodeURIComponent(id)}`;
}

export function orderHref(id: string): string {
  return `/admin/orders/${encodeURIComponent(id)}`;
}

export function companyHref(id: string): string {
  return `/admin/companies/${encodeURIComponent(id)}`;
}

// Everything else that shows return requests: the lists, the menu
// counter (requests waiting for a decision), the overview, and the page of
// the order (its "Повернення" card).
export function refreshReturnViews(orderId?: string): void {
  invalidate("/returns?");
  invalidate("/nav-counts");
  invalidate("/overview");
  if (orderId) invalidate(`/orders/${encodeURIComponent(orderId)}`);
}

// A changed request straight into the cache of its page, then the rest.
export function storeReturn(ret: ReturnDetail): void {
  setQueryData<ReturnAnswer>(returnKey(ret.id), { ok: true, return: ret });
  refreshReturnViews(ret.orderId);
}

// A sentence for a refusal: the reason of a 409 "state" first (a request
// the partner withdrew, too many notes), then the caller's own wording,
// the section's and the panel's.
export function returnErrorText(failure: ApiFailure, own: Record<string, string> = {}): string {
  const reason = typeof failure.data.reason === "string" ? failure.data.reason : "";
  if (failure.error === "state" && RETURN_STATE_REASONS[reason]) return RETURN_STATE_REASONS[reason];
  return errorMessage(failure, { ...RETURN_ERRORS, ...own });
}

// PATCH /returns/<id>. The changed request lands in the cache; a refusal
// comes back as it is (the caller words it). A "conflict" or "state"
// reloads the page's data at once, so the next try starts from what is
// stored (a withdrawal in the cabinet shows up straight away).
export async function patchReturn(id: string, body: ReturnPatchBody) {
  const result = await adminApi<ReturnAnswer>(returnKey(id), { method: "PATCH", body });
  if (result.ok) storeReturn(result.data.return);
  else if (result.error === "conflict" || result.error === "state") invalidate(returnKey(id));
  return result;
}

// The field errors of a 400 "fields" answer: { returnTtn: "format", ... }.
export function fieldErrors(failure: ApiFailure): Record<string, string> {
  const fields = failure.data.fields;
  if (failure.error !== "fields" || !fields || typeof fields !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields as Record<string, unknown>)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

// --- the way back to the list ------------------------------------------------------
//
// The list remembers its address (tab, filters, sort, page) here, so the
// back pill of a request page returns to the same filtered list. Read
// through useSyncExternalStore: the server and a fresh load render the
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

export function useReturnsBackHref(): string {
  const query = useSyncExternalStore(
    subscribe,
    () => lastListQuery,
    () => "",
  );
  return query ? `/admin/returns?${query}` : "/admin/returns";
}
