// «Мій асортимент» state: the partner's lines (product + usual
// quantity) and the checked rows, read through useSyncExternalStore.
//
// The lines belong to the server: the session answer (GET /api/session,
// the sign-in answer) carries them as the `assortment` domain, which
// lib/session/bootstrap.ts mirrors per account (lib/session/cache.ts)
// before it commits the account, so the page paints them at once. A
// quantity change or a removal changes the mirror first and then saves the
// whole list with one debounced PUT /api/assortment (flushed on
// `pagehide`); a refused save refreshes the session and the server's
// lines come back. The demo partner's lines are seeded; every other
// partner starts empty (the "Ваш асортимент ще не сформовано" frame
// 4929:65033) until lines are stored for them.
//
// The selection and the "added to the cart" marker are page state and stay
// in this browser: the checked rows per account in localStorage
// (`binar.assortment.selected.v1:<id>`), the marker per tab in
// sessionStorage. The server snapshot is empty: the server renders the
// sign-in prompt anyway. Other tabs follow through the `storage` event.
import { useCallback, useSyncExternalStore } from "react";
import type { Account } from "@/components/auth/data";
import { currentAccount, getSnapshot as getAuthSnapshot } from "@/components/auth/store";
import { api, type ApiResult } from "@/lib/api/client";
import { refreshSession, registerDomainApplier } from "@/lib/session/bootstrap";
import { readDomain, subscribeCache, writeDomain } from "@/lib/session/cache";
import { createDebouncedSave } from "@/lib/session/push";
import type { AssortmentLine } from "./data";

export type AssortmentState = {
  lines: AssortmentLine[];
  selected: string[];
};

// The account the store reads and writes for.
export type AssortmentOwner = { id: string };

export function assortmentOwner(account: Account | null): AssortmentOwner | null {
  return account?.type === "b2b" ? { id: account.id } : null;
}

const EMPTY_LINES: AssortmentLine[] = [];
const EMPTY_SELECTION: string[] = [];
const EMPTY_STATE: AssortmentState = { lines: EMPTY_LINES, selected: EMPTY_SELECTION };

// --- the lines (session mirror) ----------------------------------------

function isLine(l: unknown): l is AssortmentLine {
  return (
    typeof l === "object" &&
    l !== null &&
    typeof (l as AssortmentLine).id === "string" &&
    Number.isInteger((l as AssortmentLine).qty) &&
    (l as AssortmentLine).qty > 0
  );
}

// One line per product (a duplicated id would collide as a React key).
function cleanLines(raw: unknown): AssortmentLine[] {
  if (!Array.isArray(raw)) return EMPTY_LINES;
  const seen = new Set<string>();
  const clean = raw.filter((l): l is AssortmentLine => {
    if (!isLine(l) || seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });
  return clean.length === raw.length ? (raw as AssortmentLine[]) : clean;
}

const checkedLines = new WeakMap<object, AssortmentLine[]>();

function linesOf(ownerId: string): AssortmentLine[] {
  const raw: unknown = readDomain("assortment", ownerId);
  if (typeof raw !== "object" || raw === null) return EMPTY_LINES;
  let lines = checkedLines.get(raw);
  if (!lines) {
    lines = cleanLines(raw);
    checkedLines.set(raw, lines);
  }
  return lines;
}

// --- saving -------------------------------------------------------------

// The owner whose lines changed and are not confirmed by the server yet,
// and a counter of changes (a save confirms only what it carried).
let unsaved: string | null = null;
let changes = 0;

const save = createDebouncedSave(async (keepalive): Promise<ApiResult<unknown>> => {
  const ownerId = unsaved;
  const carried = changes;
  // Signed out or another account meanwhile: those lines are not sent with
  // somebody else's session.
  const account = currentAccount(getAuthSnapshot());
  if (!ownerId || account?.id !== ownerId) {
    unsaved = null;
    return { ok: true, status: 204, data: null };
  }
  const result = await api("/api/assortment", {
    method: "PUT",
    body: { lines: linesOf(ownerId) },
    keepalive,
  });
  if (result.status === 0) retryWhenBack();
  else if (changes === carried) unsaved = null;
  return result;
});

// A save that never reached the server (offline: status 0) keeps the
// change unsaved, so a session answer does not replace the lines the page
// shows, and goes out again as soon as the browser is back (online again,
// or the tab shown again).
let retryArmed = false;

function retryWhenBack() {
  if (retryArmed || typeof window === "undefined") return;
  retryArmed = true;
  const retry = () => {
    if (document.visibilityState === "hidden") return;
    retryArmed = false;
    window.removeEventListener("online", retry);
    document.removeEventListener("visibilitychange", retry);
    if (unsaved) save.schedule();
  };
  window.addEventListener("online", retry);
  document.addEventListener("visibilitychange", retry);
}

// The owners whose lines changed since the last session answer this store
// applied. An answer that arrives after a change may still have been read
// by the server before the save was stored (a slow boot or visibility
// refresh; refreshSession also hands a caller the request already on its
// way); writing it would bring a removed line back, and the next save
// would store it again. Such an answer is not written: the store asks
// again once the save is answered, and that request reads it. (One more
// GET /api/session after a change, never a wrong list.)
const touched = new Set<string>();

// While a change is not saved yet, a session answer may still hold the
// older lines; the mirror keeps the browser's until the save is answered
// (a refused save refreshes the session, and then the server's win).
registerDomainApplier("assortment", (lines, account) => {
  const id = account.id;
  if (readDomain("assortment", id) === undefined) {
    touched.delete(id);
    writeDomain("assortment", id, lines);
    return;
  }
  if (unsaved === id) return;
  if (touched.delete(id)) {
    // After the current refresh has settled, so this one starts anew.
    setTimeout(() => void refreshSession(), 0);
    return;
  }
  writeDomain("assortment", id, lines);
});

function changeLines(owner: AssortmentOwner, updater: (prev: AssortmentLine[]) => AssortmentLine[]) {
  writeDomain("assortment", owner.id, updater(linesOf(owner.id)));
  unsaved = owner.id;
  touched.add(owner.id);
  changes++;
  save.schedule();
}

// --- the selection (this browser) ---------------------------------------

const SELECTED_PREFIX = "binar.assortment.selected.v1";
const selectionListeners = new Set<() => void>();
const selectionCache = new Map<string, string[]>();

function selectedKey(ownerId: string): string {
  return `${SELECTED_PREFIX}:${ownerId}`;
}

// The pre-database records (`binar.assortment.v1` and
// `binar.assortment.v1:<id>`, lines and selection together) are no longer
// read; the first read of the page removes them, keeping an account's
// checked rows when it has no selection of its own yet.
const LEGACY_PREFIX = "binar.assortment.v1";
let legacyDropped = false;

function dropLegacy() {
  if (legacyDropped || typeof window === "undefined") return;
  legacyDropped = true;
  try {
    const legacy: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (key === LEGACY_PREFIX || key.startsWith(`${LEGACY_PREFIX}:`))) legacy.push(key);
    }
    for (const key of legacy) {
      const ownerId = key.startsWith(`${LEGACY_PREFIX}:`) ? key.slice(LEGACY_PREFIX.length + 1) : "";
      if (ownerId && window.localStorage.getItem(selectedKey(ownerId)) === null) {
        try {
          const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "null");
          const selected = (parsed as { selected?: unknown } | null)?.selected;
          if (Array.isArray(selected)) {
            const ids = selected.filter((id): id is string => typeof id === "string");
            if (ids.length) window.localStorage.setItem(selectedKey(ownerId), JSON.stringify([...new Set(ids)]));
          }
        } catch {
          // An unreadable record carries no selection.
        }
      }
      window.localStorage.removeItem(key);
    }
  } catch {
    // Storage unavailable: nothing to remove.
  }
}

function readSelection(ownerId: string): string[] {
  let selected = selectionCache.get(ownerId);
  if (selected) return selected;
  selected = EMPTY_SELECTION;
  try {
    const raw = window.localStorage.getItem(selectedKey(ownerId));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      const ids = [...new Set(parsed.filter((id): id is string => typeof id === "string"))];
      if (ids.length) selected = ids;
    }
  } catch {
    selected = EMPTY_SELECTION;
  }
  selectionCache.set(ownerId, selected);
  return selected;
}

function writeSelection(ownerId: string, ids: string[]) {
  const next = ids.length ? ids : EMPTY_SELECTION;
  selectionCache.set(ownerId, next);
  try {
    if (next.length) window.localStorage.setItem(selectedKey(ownerId), JSON.stringify(next));
    else window.localStorage.removeItem(selectedKey(ownerId));
  } catch {
    // Storage may be unavailable (private mode); the page still works
    // for the session.
  }
  selectionListeners.forEach((l) => l());
}

// --- snapshots ----------------------------------------------------------

// The state of an owner: its mirrored lines and the checked rows that are
// among them. The same object until one of the two changes.
const states = new Map<string, { lines: AssortmentLine[]; selected: string[]; state: AssortmentState }>();

function snapshot(ownerId: string): AssortmentState {
  dropLegacy();
  const lines = linesOf(ownerId);
  const selected = readSelection(ownerId);
  const last = states.get(ownerId);
  if (last && last.lines === lines && last.selected === selected) return last.state;
  let state: AssortmentState;
  if (lines.length === 0 && selected.length === 0) state = EMPTY_STATE;
  else {
    const present = new Set(lines.map((l) => l.id));
    const kept = selected.filter((id) => present.has(id));
    state = { lines, selected: kept.length === selected.length ? selected : kept };
  }
  states.set(ownerId, { lines, selected, state });
  return state;
}

function getServerSnapshot(): AssortmentState {
  return EMPTY_STATE;
}

function subscribe(listener: () => void): () => void {
  const offCache = subscribeCache(listener);
  selectionListeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && !e.key.startsWith(`${SELECTED_PREFIX}:`)) return;
    selectionCache.clear();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    offCache();
    selectionListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// The signed-in partner's assortment (empty for visitors and B2C
// customers, who get the sign-in prompt instead).
export function useAssortmentState(owner: AssortmentOwner | null): AssortmentState {
  const id = owner?.id ?? null;
  const getSnapshot = useCallback(() => (id === null ? EMPTY_STATE : snapshot(id)), [id]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setLineQty(owner: AssortmentOwner, id: string, qty: number) {
  const next = Math.max(1, Math.round(qty));
  changeLines(owner, (lines) => lines.map((l) => (l.id === id ? { ...l, qty: next } : l)));
}

export function setSelected(owner: AssortmentOwner, ids: string[]) {
  writeSelection(owner.id, [...new Set(ids)]);
}

// The «added to the cart» marker: the selection key (ids + quantities)
// the last bulk «Додати у кошик» sent to the cart. Kept in sessionStorage
// for the tab session (mobile pass, assortment spec 2.9), so a reload does
// not re-arm a silent second add of the same selection. Server snapshot:
// null (nothing added).
const ADDED_PREFIX = "binar.assortment.added.v1";
const addedListeners = new Set<() => void>();
const addedCache = new Map<string, string | null>();

function addedStorageKey(ownerId: string): string {
  return `${ADDED_PREFIX}:${ownerId}`;
}

function readAddedKey(ownerId: string): string | null {
  if (addedCache.has(ownerId)) return addedCache.get(ownerId) ?? null;
  let value: string | null = null;
  try {
    value = window.sessionStorage.getItem(addedStorageKey(ownerId));
  } catch {
    value = null;
  }
  addedCache.set(ownerId, value);
  return value;
}

export function writeAddedKey(ownerId: string, key: string | null) {
  addedCache.set(ownerId, key);
  try {
    if (key === null) window.sessionStorage.removeItem(addedStorageKey(ownerId));
    else window.sessionStorage.setItem(addedStorageKey(ownerId), key);
  } catch {
    // Session storage may be unavailable; the marker lives in memory.
  }
  addedListeners.forEach((l) => l());
}

function subscribeAdded(listener: () => void): () => void {
  addedListeners.add(listener);
  return () => {
    addedListeners.delete(listener);
  };
}

export function useAddedKey(ownerId: string | null): string | null {
  const getSnapshot = useCallback(() => (ownerId === null ? null : readAddedKey(ownerId)), [ownerId]);
  return useSyncExternalStore(subscribeAdded, getSnapshot, () => null);
}

// Removes lines from the assortment (row «×» and the bulk trash of the
// selection bar); they leave the selection too.
export function removeLines(owner: AssortmentOwner, ids: string[]) {
  const drop = new Set(ids);
  changeLines(owner, (lines) => lines.filter((l) => !drop.has(l.id)));
  const selected = readSelection(owner.id);
  if (selected.some((id) => drop.has(id))) writeSelection(owner.id, selected.filter((id) => !drop.has(id)));
}
