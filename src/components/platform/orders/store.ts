"use client";

// The signed-in partner's orders area, read from the session mirror.
//
// The server sends one OrdersPayload per partner company with the session
// (GET /api/session -> SessionData.orders): the orders and return requests
// as they stand (cancellations, new returns and withdrawals already
// applied), the pending cancel requests, the credit limits and the day the
// cabinet treats as today. lib/session/bootstrap.ts writes it into the
// per-account mirror (lib/session/cache.ts) BEFORE the account is
// committed, so the hooks below read it synchronously on the first
// signed-in render: nothing loads, nothing flashes. The server snapshot is
// the empty payload, so hydration matches the server HTML.
//
// The three actions stay synchronous and optimistic: they compute the new
// payload with the same pure rules the server runs (./data.ts), write it to
// the mirror, then send the change through one ordered queue. The server's
// answer replaces the optimistic record when it arrives (it wins: a new
// return may get another id); a refusal refreshes the session, which puts
// the server's state back (lib/session/push.ts).
//
// A session answer may have been read on the server before a change of
// this tab was stored (the boot's GET /api/session on a slow network, a
// refresh after a refusal sharing a request that was already on its way).
// Such a payload must not take the change back, so every change is kept in
// a small journal until a payload read after it was stored arrives (its
// `asOf` against the answer's `at`, both server clocks); the "orders"
// applier below re-applies the journal on top of every incoming payload
// that does not show a change yet.
import { useMemo, useSyncExternalStore } from "react";
import { currentAccount, getSnapshot as getAuthSnapshot, subscribe as subscribeAuth } from "@/components/auth/store";
import { api } from "@/lib/api/client";
import { registerDomainApplier } from "@/lib/session/bootstrap";
import { readDomain, subscribeCache, writeDomain } from "@/lib/session/cache";
import { createPushQueue } from "@/lib/session/push";
import type { OrdersPayload } from "@/lib/session/types";
import { ledgerCounterparties } from "../dashboard/data";
import {
  RETURN_WITHDRAWABLE,
  dayDate,
  orderAction,
  returnableItems,
  type CancelRecord,
  type Order,
  type OrderItem,
  type ReturnLine,
  type ReturnRequest,
} from "./data";

export type { CancelRecord } from "./data";

// The state the hooks read: the payload of the signed-in partner's company.
export type OrdersState = OrdersPayload;

// Before the database the browser kept its own overlay of the placeholder
// orders under these keys; nothing reads them any more and they are
// removed once on load.
export const ORDERS_STORAGE_PREFIX = "binar.orders.v1";

// The day the cabinet counts from when no payload is there (the server
// render, a visitor): the fixed date the demo history was built around, so
// a server-rendered shell behaves as it always did.
const FALLBACK_TODAY = "2026-05-24";

const EMPTY: OrdersState = { today: FALLBACK_TODAY, orders: [], returns: [], cancelRequests: {}, creditLimits: [] };

function dropLegacyKeys() {
  try {
    const stale: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (key === ORDERS_STORAGE_PREFIX || key.startsWith(`${ORDERS_STORAGE_PREFIX}:`))) stale.push(key);
    }
    stale.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Storage unavailable: nothing to remove.
  }
}

if (typeof window !== "undefined") dropLegacyKeys();

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// The mirror is ours, but it outlives deploys: a value of another shape
// counts as nothing stored (the next session answer replaces it).
function isPayload(v: unknown): v is OrdersState {
  return (
    isRecord(v) &&
    typeof v.today === "string" &&
    Array.isArray(v.orders) &&
    Array.isArray(v.returns) &&
    isRecord(v.cancelRequests) &&
    Array.isArray(v.creditLimits)
  );
}

function accountId(): string | null {
  return currentAccount(getAuthSnapshot())?.id ?? null;
}

// The stored payload of an account, or null.
function payloadOf(id: string | null): OrdersState | null {
  if (id === null) return null;
  const value = readDomain("orders", id);
  return isPayload(value) ? value : null;
}

// The signed-in account's payload (the empty one for visitors, retail
// customers and partners whose payload has not arrived). Referentially
// stable until the mirror or the account changes.
function snapshot(): OrdersState {
  return payloadOf(accountId()) ?? EMPTY;
}

function getServerSnapshot(): OrdersState {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  const offCache = subscribeCache(listener);
  const offAuth = subscribeAuth(listener);
  return () => {
    offCache();
    offAuth();
  };
}

// Changes the mirror of `id` (only while that account is still the one
// signed in and its payload is there).
function update(id: string, updater: (prev: OrdersState) => OrdersState) {
  if (accountId() !== id) return;
  const prev = payloadOf(id);
  if (!prev) return;
  writeDomain("orders", id, updater(prev));
}

// --- today ------------------------------------------------------------------

// The cabinet's today as a Date (midnight UTC of OrdersPayload.today): the
// return window, the period filters and their range labels count from it.
// The getter serves plain functions that run during a render which already
// subscribes to the store (useOrders & co.); components use the hook.
export function ordersToday(): Date {
  return dayDate(snapshot().today);
}

export function useOrdersToday(): Date {
  const today = useOrdersState().today;
  return useMemo(() => dayDate(today), [today]);
}

// --- actions ----------------------------------------------------------------

const queue = createPushQueue();

// `at` = the server's clock when the change was stored.
type OrderAnswer = { ok: true; order: Order; cancel: CancelRecord; at?: number };
type ReturnAnswer = { ok: true; return: ReturnRequest; at?: number };

function replaceOrder(prev: OrdersState, order: Order, cancel?: CancelRecord): OrdersState {
  const cancelRequests = { ...prev.cancelRequests };
  if (cancel?.request) cancelRequests[order.id] = cancel;
  else delete cancelRequests[order.id];
  return { ...prev, orders: prev.orders.map((o) => (o.id === order.id ? order : o)), cancelRequests };
}

// Puts the server's record of a return in the place of the record `id`
// (the optimistic one, or the same request before a withdrawal), or on top
// when that is not there (a payload replaced the mirror meanwhile). A copy
// of the server's record under its own id is never left twice.
function adoptReturn(prev: OrdersState, id: string, ret: ReturnRequest): OrdersState {
  const index = prev.returns.findIndex((r) => r.id === id);
  const rest = prev.returns.filter((r) => r.id !== id && r.id !== ret.id);
  if (index < 0) return { ...prev, returns: [ret, ...rest] };
  const before = prev.returns.slice(0, index).filter((r) => r.id !== ret.id).length;
  return { ...prev, returns: [...rest.slice(0, before), ret, ...rest.slice(before)] };
}

// --- the journal of this tab's changes -----------------------------------------

type Change = {
  // The change as the mirror should show it: the optimistic version while
  // the request is on the way, the server's record once it answered.
  apply: (p: OrdersState) => OrdersState;
  // True when a payload already shows the change.
  shows: (p: OrdersState) => boolean;
  // The server's clock when the change was stored (from the answer);
  // undefined while the request is on the way.
  at?: number;
};

// Per account, in the order the changes were made.
const journal = new Map<string, Change[]>();

function track(accountId: string, change: Change): Change {
  journal.set(accountId, [...(journal.get(accountId) ?? []), change]);
  return change;
}

// A refused change (the server's state wins on the refresh that follows)
// or one that never reached the server (the next payload settles it).
function untrack(accountId: string, change: Change) {
  const rest = (journal.get(accountId) ?? []).filter((c) => c !== change);
  if (rest.length) journal.set(accountId, rest);
  else journal.delete(accountId);
}

// The server stored the change: from now on it shows as the server's
// record, and a payload read after `at` no longer needs it.
function settle(accountId: string, change: Change, at: unknown, apply: Change["apply"], shows?: Change["shows"]) {
  change.apply = apply;
  if (shows) change.shows = shows;
  // An answer without a usable stamp (a server before the stamps): the
  // next payload wins, as it always did.
  change.at = typeof at === "number" && Number.isFinite(at) ? at : -Infinity;
  update(accountId, apply);
}

// Every orders payload of a session answer: the journal's changes that the
// payload may not know (stored after it was read, or still on the way) are
// applied on top of it unless it already shows them; the others are done.
// A payload without `asOf` counts as read after every change.
registerDomainApplier("orders", (value, account) => {
  const changes = journal.get(account.id);
  if (!changes?.length || !isPayload(value)) {
    writeDomain("orders", account.id, value);
    return;
  }
  const asOf = typeof value.asOf === "number" && Number.isFinite(value.asOf) ? value.asOf : Infinity;
  let next: OrdersState = value;
  const open: Change[] = [];
  for (const change of changes) {
    if (change.at !== undefined && change.at <= asOf) continue;
    open.push(change);
    if (!change.shows(next)) next = change.apply(next);
  }
  if (open.length) journal.set(account.id, open);
  else journal.delete(account.id);
  writeDomain("orders", account.id, next);
});

// "Скасувати замовлення": an order "Нове" / "Заблоковано" turns
// "Скасовано" at once; for "В роботі" (`request`) the request is recorded
// and the order keeps its status until the manager decides.
export function cancelOrder(orderId: string, input: { reason: string; solution?: string; request: boolean }) {
  const id = accountId();
  const prev = payloadOf(id);
  if (id === null || !prev) return;
  const order = prev.orders.find((o) => o.id === orderId);
  if (!order) return;
  const action = orderAction(order, returnableItems(order, prev.returns), dayDate(prev.today));
  if (action.kind !== "cancel" || action.request !== input.request) return;
  if (input.request && prev.cancelRequests[orderId]?.request) return;

  const record: CancelRecord = {
    reason: input.reason,
    at: prev.today,
    ...(input.solution ? { solution: input.solution } : {}),
    ...(input.request ? { request: true } : {}),
  };
  const change = track(id, {
    apply: (p) =>
      input.request
        ? { ...p, cancelRequests: { ...p.cancelRequests, [orderId]: record } }
        : { ...p, orders: p.orders.map((o) => (o.id === orderId ? { ...o, status: "cancelled" as const } : o)) },
    shows: input.request
      ? (p) => p.cancelRequests[orderId]?.request === true
      : (p) => p.orders.find((o) => o.id === orderId)?.status === "cancelled",
  });
  update(id, change.apply);
  queue.push(async () => {
    const result = await api<OrderAnswer>(`/api/orders/${encodeURIComponent(orderId)}/cancel`, {
      body: { reason: input.reason, ...(input.solution ? { solution: input.solution } : {}), request: input.request },
    });
    if (result.ok) {
      const { order, cancel, at } = result.data;
      settle(id, change, at, (p) => replaceOrder(p, order, cancel));
    } else untrack(id, change);
    return result;
  });
}

// Creates the request in «Створено» and returns it (the wizard routes to
// the returns tab afterwards). Its id is the next one after the requests
// this browser knows; the server keeps it when it is free, otherwise its
// answer brings the id the request really got.
export function createReturn(input: {
  orderId: string;
  lines: ReturnLine[];
  solution: string;
  delivery: string;
}): ReturnRequest {
  const id = accountId();
  const prev = payloadOf(id) ?? EMPTY;
  const maxId = prev.returns.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
  const request: ReturnRequest = {
    id: String(maxId + 1),
    orderId: input.orderId,
    date: prev.today,
    status: "created",
    lines: input.lines,
    solution: input.solution,
    delivery: input.delivery,
  };
  if (id === null || !payloadOf(id)) return request;

  const change = track(id, {
    // (A payload that already holds another request under this id: the
    // answer brings the id this one got.)
    apply: (p) => (p.returns.some((r) => r.id === request.id) ? p : { ...p, returns: [request, ...p.returns] }),
    shows: (p) => p.returns.some((r) => r.id === request.id && r.orderId === request.orderId),
  });
  update(id, change.apply);
  queue.push(async () => {
    const result = await api<ReturnAnswer>("/api/returns", {
      body: {
        id: request.id,
        orderId: request.orderId,
        lines: request.lines.map((l) => ({ itemId: l.itemId, qty: l.qty, reason: l.reason })),
        solution: request.solution,
        delivery: request.delivery,
      },
    });
    if (result.ok) {
      const { return: stored, at } = result.data;
      settle(
        id,
        change,
        at,
        (p) => adoptReturn(p, request.id, stored),
        (p) => p.returns.some((r) => r.id === stored.id),
      );
    } else untrack(id, change);
    return result;
  });
  return request;
}

// "Скасувати повернення": the request turns "Скасовано" (possible while
// it is "Створено", "На розгляді" or "Погоджено").
export function withdrawReturn(returnId: string) {
  const id = accountId();
  const prev = payloadOf(id);
  if (id === null || !prev) return;
  const ret = prev.returns.find((r) => r.id === returnId);
  if (!ret || !RETURN_WITHDRAWABLE.has(ret.status)) return;

  const change = track(id, {
    apply: (p) => ({
      ...p,
      returns: p.returns.map((r) => (r.id === returnId ? { ...r, status: "cancelled" as const } : r)),
    }),
    shows: (p) => p.returns.find((r) => r.id === returnId)?.status === "cancelled",
  });
  update(id, change.apply);
  queue.push(async () => {
    const result = await api<ReturnAnswer>(`/api/returns/${encodeURIComponent(returnId)}/withdraw`, { method: "POST" });
    if (result.ok) {
      const { return: stored, at } = result.data;
      settle(id, change, at, (p) => adoptReturn(p, returnId, stored));
    } else untrack(id, change);
    return result;
  });
}

// --- hooks ------------------------------------------------------------------

// The signed-in account's payload (the empty one for everyone else).
export function useOrdersState(): OrdersState {
  return useSyncExternalStore(subscribe, snapshot, getServerSnapshot);
}

// The payload already carries every change; these two stay for the
// callers that combined a base list with local changes before.
export function applyOrders(s: OrdersState): Order[] {
  return s.orders;
}

export function applyReturns(s: OrdersState): ReturnRequest[] {
  return s.returns;
}

export function useOrders(): Order[] {
  return applyOrders(useOrdersState());
}

export function useReturns(): ReturnRequest[] {
  return applyReturns(useOrdersState());
}

export function useOrder(id: string): Order | undefined {
  const orders = useOrders();
  return orders.find((o) => o.id === id);
}

// A pending «Запит на скасування» of an order «В роботі».
export function useCancelRequest(orderId: string): CancelRecord | undefined {
  const s = useOrdersState();
  const rec = s.cancelRequests[orderId];
  return rec?.request ? rec : undefined;
}

export function useReturn(id: string): ReturnRequest | undefined {
  const returns = useReturns();
  return returns.find((r) => r.id === id);
}

// The lines of `order` not yet covered by an active return request, with
// the quantity still free to return («Оформити повернення» offers only
// these; none left = no button).
export function useReturnableItems(order: Order | undefined): OrderItem[] {
  const returns = useReturns();
  return useMemo(() => (order ? returnableItems(order, returns) : []), [order, returns]);
}

// The credit limit per counterparty name (dashboard KPIs).
export function useCreditLimits(): OrdersState["creditLimits"] {
  return useOrdersState().creditLimits;
}

// The counterparties the orders filters offer (desktop selects and the
// phone filter sheet): the company's own ledger, the names its credit lines
// and orders go by (dashboard/data.ts ledgerCounterparties). For the demo
// company these are the four names the filter always listed, in the same
// order.
export function useCounterpartyNames(): string[] {
  const orders = useOrders();
  const limits = useCreditLimits();
  return useMemo(() => ledgerCounterparties(orders, limits), [orders, limits]);
}
