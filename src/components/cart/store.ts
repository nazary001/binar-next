// The cart lines live in a tiny external store backed by localStorage
// and are read through useSyncExternalStore: the server snapshot is an
// empty cart, the client snapshot is what the browser has saved, so the
// first client render hydrates cleanly and the stored lines appear
// right after — no setState-in-effect, and other tabs stay in sync via
// the `storage` event.
import { CART_STORAGE_KEY, type CartLine } from "./data";

const EMPTY: CartLine[] = [];
let lines: CartLine[] | null = null;
const listeners = new Set<() => void>();

function readStorage(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const valid = parsed.filter(
      (l): l is CartLine =>
        typeof l === "object" &&
        l !== null &&
        typeof (l as CartLine).id === "string" &&
        Number.isInteger((l as CartLine).qty) &&
        (l as CartLine).qty > 0,
    );
    // One line per product id (a hand-edited or racing write could
    // leave duplicates, which would collide as React keys).
    const merged = new Map<string, number>();
    valid.forEach((l) => merged.set(l.id, (merged.get(l.id) ?? 0) + l.qty));
    const lines = [...merged].map(([id, qty]) => ({ id, qty }));
    return lines.length ? lines : EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeStorage(next: CartLine[]) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage may be unavailable (private mode); the cart still works
    // for the session.
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function getSnapshot(): CartLine[] {
  if (lines === null) lines = readStorage();
  return lines;
}

export function getServerSnapshot(): CartLine[] {
  return EMPTY;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== CART_STORAGE_KEY) return;
    lines = readStorage();
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function updateLines(updater: (prev: CartLine[]) => CartLine[]) {
  const next = updater(getSnapshot());
  lines = next.length ? next : EMPTY;
  writeStorage(lines);
  emit();
}
