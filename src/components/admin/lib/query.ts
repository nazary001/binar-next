"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { adminApi, type ApiFailure } from "./api";

// Reading data in the admin panel.
//
//   const orders = useAdminQuery<OrdersPage>(`/orders?${params}`);
//   if (orders.loading && !orders.data) return <TableSkeleton />;
//   if (orders.error) return <ErrorState failure={orders.error} onRetry={orders.reload} />;
//   ...orders.data.items
//
// - The key is the API path (without "/api/admin"); null means "do not
//   load yet".
// - Answers are kept in a small in-memory store shared by every component,
//   so two components asking for the same path make one request, and a
//   screen you come back to paints at once and refreshes in the background.
// - While a new key loads, `data` keeps the answer of the previous key
//   (`stale` is true then), so a table does not blink when the page or a
//   filter changes.
// - After a change, call `invalidate("/orders")`: every cached path that
//   starts with it is fetched again by the components showing it.
//
// Built on useSyncExternalStore: no state is set inside an effect.
//
// Why this store cannot cause React's development warning "Can't perform a
// React state update on a component that hasn't mounted yet" (two builders
// saw it on list pages; checked in wave 3). React gives that warning only
// for an update scheduled on a fiber that rendered but was never committed
// (or whose ancestor was not). The only updates this file can cause are:
// - setKept, called during the component's own render: a render-phase
//   update of the rendering component, which React applies in place and
//   never routes through the "not mounted" check;
// - useSyncExternalStore's own re-render, through the listener it hands to
//   `subscribeTo`. React subscribes in a passive effect, i.e. only after
//   the fiber is committed, and unsubscribes before it is removed; `emit`
//   reaches only those listeners. A request that resolves between a render
//   and its commit finds no listener of that fiber yet, and React re-reads
//   the snapshot right after subscribing, so the answer is not lost.
// - setBusy of useAdminAction, called from `run`, which screens call in
//   event handlers.
// Requests start only from effects (ensure) and handlers (reload,
// invalidate), never during render. The shell's own updates are of the
// same two kinds (render-phase setSeenPath / setMenuOpen on itself, and
// handlers). audit/admin/checks/kit-mount-warning.mjs loads every list
// page repeatedly to catch the warning with its component stack.

type Entry = {
  status: "idle" | "loading" | "success" | "error";
  data: unknown;
  error: ApiFailure | null;
  // When the answer arrived (ms); 0 = never.
  at: number;
  // A request is in flight (also true for a background refresh).
  fetching: boolean;
};

const IDLE: Entry = { status: "idle", data: undefined, error: null, at: 0, fetching: false };

const entries = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();
const inflight = new Map<string, Promise<void>>();

// A cached answer older than this is refreshed when a component mounts.
const FRESH_MS = 15_000;
// Entries nobody shows are dropped once the store grows past this.
const MAX_ENTRIES = 200;

function emit(key: string): void {
  const set = listeners.get(key);
  if (set) for (const listener of [...set]) listener();
}

function setEntry(key: string, entry: Entry): void {
  entries.set(key, entry);
  emit(key);
}

function prune(): void {
  if (entries.size <= MAX_ENTRIES) return;
  for (const key of entries.keys()) {
    if (entries.size <= MAX_ENTRIES) break;
    if (!listeners.get(key)?.size && !inflight.has(key)) entries.delete(key);
  }
}

function load(key: string): Promise<void> {
  const running = inflight.get(key);
  if (running) return running;
  const previous = entries.get(key) ?? IDLE;
  setEntry(key, { ...previous, status: previous.status === "idle" ? "loading" : previous.status, fetching: true });
  const request = adminApi(key).then((result) => {
    inflight.delete(key);
    if (result.ok) {
      setEntry(key, { status: "success", data: result.data, error: null, at: Date.now(), fetching: false });
    } else {
      const last = entries.get(key) ?? IDLE;
      // A failed refresh keeps the data that is on screen.
      setEntry(key, { ...last, status: "error", error: result, fetching: false });
    }
    prune();
  });
  inflight.set(key, request);
  return request;
}

function ensure(key: string): void {
  const entry = entries.get(key);
  if (!entry || entry.status === "idle" || Date.now() - entry.at > FRESH_MS) void load(key);
}

function subscribeTo(key: string | null) {
  return (listener: () => void) => {
    if (key === null) return () => {};
    let set = listeners.get(key);
    if (!set) {
      set = new Set();
      listeners.set(key, set);
    }
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) listeners.delete(key);
    };
  };
}

// Fetches again every cached path that starts with `prefix` and is on
// screen; drops the ones that are not.
export function invalidate(prefix: string): void {
  for (const key of [...entries.keys()]) {
    if (!key.startsWith(prefix)) continue;
    if (listeners.get(key)?.size) void load(key);
    else if (!inflight.has(key)) entries.delete(key);
  }
}

// Puts an answer into the store (after a mutation that returned the new
// record), so the screens showing that path update without a request.
export function setQueryData<T>(key: string, data: T): void {
  setEntry(key, { status: "success", data, error: null, at: Date.now(), fetching: false });
}

export function clearQueries(): void {
  entries.clear();
}

export type AdminQuery<T> = {
  data: T | undefined;
  error: ApiFailure | null;
  // No answer for this key yet and a request is running.
  loading: boolean;
  // A request is running (first load or a refresh).
  fetching: boolean;
  // `data` belongs to the previous key; the new one is still loading.
  stale: boolean;
  reload: () => void;
};

export function useAdminQuery<T = unknown>(key: string | null): AdminQuery<T> {
  const subscribe = useCallback((listener: () => void) => subscribeTo(key)(listener), [key]);
  const entry = useSyncExternalStore(
    subscribe,
    () => (key === null ? IDLE : (entries.get(key) ?? IDLE)),
    () => IDLE,
  );

  useEffect(() => {
    if (key !== null) ensure(key);
  }, [key]);

  // The last answer of any key this hook has shown (render-phase state, the
  // pattern the storefront uses for route-dependent state).
  const [kept, setKept] = useState<unknown>(undefined);
  if (entry.status === "success" && entry.data !== kept) setKept(entry.data);

  const reload = useCallback(() => {
    if (key !== null) void load(key);
  }, [key]);

  const hasOwn = entry.status === "success" || (entry.status === "error" && entry.data !== undefined);
  const data = (hasOwn ? entry.data : kept) as T | undefined;
  return {
    data,
    error: entry.status === "error" ? entry.error : null,
    loading: key !== null && !hasOwn && entry.status !== "error",
    fetching: entry.fetching,
    stale: !hasOwn && kept !== undefined && key !== null,
    reload,
  };
}

// Runs a mutation with a busy flag:
//   const save = useAdminAction(async (values: Values) => adminApi(`/orders/${id}`, { method: "PATCH", body: values }));
//   <Button loading={save.busy} onClick={() => save.run(values)} />
export function useAdminAction<A extends unknown[], R>(action: (...args: A) => Promise<R>) {
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (...args: A): Promise<R> => {
      setBusy(true);
      try {
        return await action(...args);
      } finally {
        setBusy(false);
      }
    },
    [action],
  );
  return { busy, run };
}
