// «Мій асортимент» state: the partner's lines (product + usual
// quantity) and the checked rows, kept in localStorage and read through
// useSyncExternalStore — the same pattern as the cart store
// (cart/store.ts). One record per account (`binar.assortment.v1:<id>`,
// like the per-account profile lists), so a second partner signing in on
// the same browser never sees the first one's removals, quantities or
// selection. Until the CRM forms the list from the order history, the
// demo partner starts from the placeholder assortment and every other
// B2B account starts empty (the «Ваш асортимент ще не сформовано» frame
// 4929:65033), the same ownership rule as OrdersView. The server
// snapshot is empty: the server renders the sign-in prompt anyway (the
// session lives in localStorage). The `storage` event syncs tabs.
import { useCallback, useSyncExternalStore } from "react";
import type { Account } from "@/components/auth/data";
import { isDemoAccount } from "@/components/auth/demo";
import { DEFAULT_LINES, type AssortmentLine } from "./data";

export const ASSORTMENT_STORAGE_PREFIX = "binar.assortment.v1";

export function assortmentStorageKey(accountId: string): string {
  return `${ASSORTMENT_STORAGE_PREFIX}:${accountId}`;
}

// Before the per-account records the whole browser shared this one key,
// and only the demo partner had an assortment to edit: the demo account
// still reads it (once, until its first edit moves it to its own key) so
// earlier edits and the audit kit's seeded states keep working.
const LEGACY_KEY = ASSORTMENT_STORAGE_PREFIX;

export type AssortmentState = {
  lines: AssortmentLine[];
  selected: string[];
};

// The account the store reads and writes for: its id and whether it owns
// the placeholder assortment.
export type AssortmentOwner = { id: string; demo: boolean };

export function assortmentOwner(account: Account | null): AssortmentOwner | null {
  return account?.type === "b2b" ? { id: account.id, demo: isDemoAccount(account) } : null;
}

const DEMO_STATE: AssortmentState = { lines: DEFAULT_LINES, selected: [] };
const EMPTY_STATE: AssortmentState = { lines: [], selected: [] };

const initial = (owner: AssortmentOwner) => (owner.demo ? DEMO_STATE : EMPTY_STATE);

// Snapshots per account id; cleared when another tab writes.
const cache = new Map<string, AssortmentState>();
const listeners = new Set<() => void>();

function isLine(l: unknown): l is AssortmentLine {
  return (
    typeof l === "object" &&
    l !== null &&
    typeof (l as AssortmentLine).id === "string" &&
    Number.isInteger((l as AssortmentLine).qty) &&
    (l as AssortmentLine).qty > 0
  );
}

function parse(raw: string): AssortmentState | null {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null) return null;
  const { lines, selected } = parsed as Partial<AssortmentState>;
  if (!Array.isArray(lines)) return null;
  // One line per product (a hand edit could duplicate ids, which would
  // collide as React keys).
  const seen = new Set<string>();
  const clean = lines.filter((l): l is AssortmentLine => {
    if (!isLine(l) || seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });
  const sel = Array.isArray(selected)
    ? selected.filter((id): id is string => typeof id === "string" && seen.has(id))
    : [];
  return { lines: clean, selected: [...new Set(sel)] };
}

function readStorage(owner: AssortmentOwner): AssortmentState {
  try {
    const raw =
      window.localStorage.getItem(assortmentStorageKey(owner.id)) ??
      (owner.demo ? window.localStorage.getItem(LEGACY_KEY) : null);
    return (raw && parse(raw)) || initial(owner);
  } catch {
    return initial(owner);
  }
}

function writeStorage(owner: AssortmentOwner, next: AssortmentState) {
  try {
    window.localStorage.setItem(assortmentStorageKey(owner.id), JSON.stringify(next));
    if (owner.demo) window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Storage may be unavailable (private mode); the page still works
    // for the session.
  }
}

function snapshot(owner: AssortmentOwner): AssortmentState {
  let s = cache.get(owner.id);
  if (!s) {
    s = readStorage(owner);
    cache.set(owner.id, s);
  }
  return s;
}

function getServerSnapshot(): AssortmentState {
  return EMPTY_STATE;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== LEGACY_KEY && !e.key.startsWith(`${ASSORTMENT_STORAGE_PREFIX}:`)) return;
    cache.clear();
    listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function update(owner: AssortmentOwner, updater: (prev: AssortmentState) => AssortmentState) {
  const next = updater(snapshot(owner));
  cache.set(owner.id, next);
  writeStorage(owner, next);
  listeners.forEach((l) => l());
}

// The signed-in partner's assortment (empty for visitors and B2C
// customers, who get the sign-in prompt instead).
export function useAssortmentState(owner: AssortmentOwner | null): AssortmentState {
  const id = owner?.id ?? null;
  const demo = owner?.demo ?? false;
  const getSnapshot = useCallback(() => (id === null ? EMPTY_STATE : snapshot({ id, demo })), [id, demo]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setLineQty(owner: AssortmentOwner, id: string, qty: number) {
  const next = Math.max(1, Math.round(qty));
  update(owner, (s) => ({
    ...s,
    lines: s.lines.map((l) => (l.id === id ? { ...l, qty: next } : l)),
  }));
}

export function setSelected(owner: AssortmentOwner, ids: string[]) {
  update(owner, (s) => ({ ...s, selected: [...new Set(ids)] }));
}

// Removes lines from the assortment (row «×» and the bulk trash of the
// selection bar); they leave the selection too.
export function removeLines(owner: AssortmentOwner, ids: string[]) {
  const drop = new Set(ids);
  update(owner, (s) => ({
    lines: s.lines.filter((l) => !drop.has(l.id)),
    selected: s.selected.filter((id) => !drop.has(id)),
  }));
}
