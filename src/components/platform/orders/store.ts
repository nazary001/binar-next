"use client";

// What the partner did to the placeholder orders on this device: orders
// cancelled through «Скасувати замовлення», return requests sent from
// «Оформити повернення» and requests withdrawn with «Скасувати
// повернення». Same pattern as cart/store.ts: a tiny external store over
// localStorage read through useSyncExternalStore (server snapshot =
// nothing changed, so hydration matches the server HTML), other tabs
// follow through the `storage` event. One record per account
// (`binar.orders.v1:<account id>`, like assortment/store.ts and the
// profile lists), so a second partner signing in on the same browser
// never sees the first one's cancellations or return requests. The
// record belongs to whoever is signed in (read from the auth store), so
// the actions below need no account argument. The placeholder history
// itself stays the demo partner's: the views gate it with isDemoAccount.
// Replace the bodies of the actions with CRM calls when the API exists.
import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Account } from "@/components/auth/data";
import { isDemoAccount } from "@/components/auth/demo";
import {
  currentAccount,
  getServerSnapshot as getAuthServerSnapshot,
  getSnapshot as getAuthSnapshot,
  subscribe as subscribeAuth,
} from "@/components/auth/store";
import {
  ORDERS,
  ORDERS_TODAY,
  RETURNS,
  returnableItems,
  type Order,
  type OrderItem,
  type ReturnLine,
  type ReturnRequest,
} from "./data";

export const ORDERS_STORAGE_PREFIX = "binar.orders.v1";

export function ordersStorageKey(accountId: string): string {
  return `${ORDERS_STORAGE_PREFIX}:${accountId}`;
}

// Before the per-account records the whole browser shared this one key,
// and only the demo partner had orders to act on: the demo account still
// reads it (once, until its first change moves it to its own key) so
// earlier device history keeps working.
const LEGACY_KEY = ORDERS_STORAGE_PREFIX;

// `request` = «Запит на скасування» of an order «В роботі»: the manager
// still has to confirm it, so the order keeps its status meanwhile.
export type CancelRecord = {
  reason: string;
  solution?: string;
  request?: boolean;
  at: string;
};

export type OrdersState = {
  cancelled: Record<string, CancelRecord>;
  returns: ReturnRequest[];
  withdrawn: Record<string, string>;
};

// The account the store reads and writes for.
type Owner = { id: string; demo: boolean };

function ownerOf(account: Account | null): Owner | null {
  return account ? { id: account.id, demo: isDemoAccount(account) } : null;
}

const EMPTY: OrdersState = { cancelled: {}, returns: [], withdrawn: {} };
// Snapshots per account id; cleared when another tab writes.
const cache = new Map<string, OrdersState>();
const listeners = new Set<() => void>();

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isLine(v: unknown): v is ReturnLine {
  return (
    isRecord(v) &&
    typeof v.itemId === "string" &&
    typeof v.reason === "string" &&
    typeof v.qty === "number" &&
    Number.isFinite(v.qty) &&
    v.qty > 0
  );
}

function isReturn(v: unknown): v is ReturnRequest {
  return (
    isRecord(v) &&
    typeof v.id === "string" &&
    typeof v.orderId === "string" &&
    typeof v.date === "string" &&
    typeof v.status === "string" &&
    typeof v.solution === "string" &&
    typeof v.delivery === "string" &&
    Array.isArray(v.lines) &&
    v.lines.length > 0 &&
    v.lines.every(isLine)
  );
}

function parse(raw: string): OrdersState {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) return EMPTY;
  const cancelled: Record<string, CancelRecord> = {};
  if (isRecord(parsed.cancelled)) {
    for (const [id, rec] of Object.entries(parsed.cancelled)) {
      if (isRecord(rec) && typeof rec.reason === "string" && typeof rec.at === "string") {
        cancelled[id] = {
          reason: rec.reason,
          at: rec.at,
          ...(typeof rec.solution === "string" ? { solution: rec.solution } : {}),
          ...(rec.request === true ? { request: true } : {}),
        };
      }
    }
  }
  const returns = Array.isArray(parsed.returns) ? parsed.returns.filter(isReturn) : [];
  const withdrawn: Record<string, string> = {};
  if (isRecord(parsed.withdrawn)) {
    for (const [id, at] of Object.entries(parsed.withdrawn)) {
      if (typeof at === "string") withdrawn[id] = at;
    }
  }
  return { cancelled, returns, withdrawn };
}

function readStorage(owner: Owner): OrdersState {
  try {
    const raw =
      window.localStorage.getItem(ordersStorageKey(owner.id)) ??
      (owner.demo ? window.localStorage.getItem(LEGACY_KEY) : null);
    return raw ? parse(raw) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeStorage(owner: Owner, next: OrdersState) {
  try {
    window.localStorage.setItem(ordersStorageKey(owner.id), JSON.stringify(next));
    if (owner.demo) window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Storage may be unavailable (private mode); the change still holds
    // for this session.
  }
}

function snapshot(owner: Owner): OrdersState {
  let s = cache.get(owner.id);
  if (!s) {
    s = readStorage(owner);
    cache.set(owner.id, s);
  }
  return s;
}

function getServerSnapshot(): OrdersState {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== LEGACY_KEY && !e.key.startsWith(`${ORDERS_STORAGE_PREFIX}:`)) return;
    cache.clear();
    listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// The actions write for the signed-in account; without a session there
// is nothing to change.
function update(updater: (prev: OrdersState) => OrdersState) {
  const owner = ownerOf(currentAccount(getAuthSnapshot()));
  if (!owner) return;
  const next = updater(snapshot(owner));
  cache.set(owner.id, next);
  writeStorage(owner, next);
  listeners.forEach((l) => l());
}

// The placeholder history is anchored at ORDERS_TODAY (24.05.2026), so
// what the partner does is dated on the same clock: a request sent from
// the wizard lands at the top of «Останні 30 днів» instead of months
// after the newest order. Switch to the real date with the CRM feed.
function today(): string {
  return ORDERS_TODAY.toISOString().slice(0, 10);
}

export function cancelOrder(orderId: string, input: { reason: string; solution?: string; request: boolean }) {
  update((prev) => ({
    ...prev,
    cancelled: {
      ...prev.cancelled,
      [orderId]: {
        reason: input.reason,
        at: today(),
        ...(input.solution ? { solution: input.solution } : {}),
        ...(input.request ? { request: true } : {}),
      },
    },
  }));
}

// Creates the request in «Створено» and returns it (the wizard routes to
// the returns tab afterwards).
export function createReturn(input: {
  orderId: string;
  lines: ReturnLine[];
  solution: string;
  delivery: string;
}): ReturnRequest {
  const owner = ownerOf(currentAccount(getAuthSnapshot()));
  const prev = owner ? snapshot(owner) : EMPTY;
  const maxId = [...RETURNS, ...prev.returns].reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
  const request: ReturnRequest = {
    id: String(maxId + 1),
    orderId: input.orderId,
    date: today(),
    status: "created",
    lines: input.lines,
    solution: input.solution,
    delivery: input.delivery,
  };
  update((p) => ({ ...p, returns: [request, ...p.returns] }));
  return request;
}

export function withdrawReturn(returnId: string) {
  update((prev) => ({ ...prev, withdrawn: { ...prev.withdrawn, [returnId]: today() } }));
}

// The signed-in account's record (nothing changed for visitors).
export function useOrdersState(): OrdersState {
  const auth = useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthServerSnapshot);
  const owner = ownerOf(currentAccount(auth));
  const id = owner?.id ?? null;
  const demo = owner?.demo ?? false;
  const getSnapshot = useCallback(() => (id === null ? EMPTY : snapshot({ id, demo })), [id, demo]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// The placeholder orders with this device's cancellations applied.
export function applyOrders(s: OrdersState): Order[] {
  if (Object.keys(s.cancelled).length === 0) return ORDERS;
  return ORDERS.map((o) => {
    const rec = s.cancelled[o.id];
    return rec && !rec.request ? { ...o, status: "cancelled" as const } : o;
  });
}

// Placeholder returns + the ones sent from this device (newest first),
// withdrawn ones in «Скасовано».
export function applyReturns(s: OrdersState): ReturnRequest[] {
  const all = [...s.returns, ...RETURNS];
  return all.map((r) => (s.withdrawn[r.id] ? { ...r, status: "cancelled" as const } : r));
}

export function useOrders(): Order[] {
  const s = useOrdersState();
  return useMemo(() => applyOrders(s), [s]);
}

export function useReturns(): ReturnRequest[] {
  const s = useOrdersState();
  return useMemo(() => applyReturns(s), [s]);
}

export function useOrder(id: string): Order | undefined {
  const orders = useOrders();
  return orders.find((o) => o.id === id);
}

// A pending «Запит на скасування» of an order «В роботі».
export function useCancelRequest(orderId: string): CancelRecord | undefined {
  const s = useOrdersState();
  const rec = s.cancelled[orderId];
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
