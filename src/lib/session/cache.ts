// The signed-in account's server data, mirrored in the browser.
//
// GET /api/session answers with one value per data domain (orders, profile,
// assortment, prices: lib/session/types.ts). applyBootstrap stores each of
// them here, under localStorage key `binar.srv.<domain>.v1:<accountId>`, and
// the stores read them back synchronously, so a reload paints the cabinet
// at once and the next session answer quietly replaces the copy. The mirror
// is a cache: the server is always right, and a sign-out removes it.
//
// Reads are served from memory (one parse per key); a write in another tab
// arrives through the `storage` event and drops the stale entry. Snapshots
// are referentially stable, which is what useSyncExternalStore needs.
import type { SessionData, SessionDomain } from "./types";

const PREFIX = "binar.srv.";

function keyOf(domain: string, accountId: string): string {
  return `${PREFIX}${domain}.v1:${accountId}`;
}

// key -> parsed value (undefined = nothing stored).
const memory = new Map<string, unknown>();
const listeners = new Set<() => void>();
let watching = false;

function emit() {
  listeners.forEach((listener) => listener());
}

// One window listener for the module: another tab changed the mirror.
function watchStorage() {
  if (watching || typeof window === "undefined") return;
  watching = true;
  window.addEventListener("storage", (event) => {
    if (event.key === null) memory.clear();
    else if (event.key.startsWith(PREFIX)) memory.delete(event.key);
    else return;
    emit();
  });
}

// The stored value of a domain, or undefined when nothing is stored (and
// always undefined on the server).
export function readDomain<K extends SessionDomain>(
  domain: K,
  accountId: string,
): NonNullable<SessionData[K]> | undefined {
  if (typeof window === "undefined") return undefined;
  watchStorage();
  const key = keyOf(domain, accountId);
  if (!memory.has(key)) {
    let value: unknown;
    try {
      const raw = window.localStorage.getItem(key);
      value = raw === null ? undefined : JSON.parse(raw);
    } catch {
      value = undefined;
    }
    memory.set(key, value);
  }
  return memory.get(key) as NonNullable<SessionData[K]> | undefined;
}

export function writeDomain<K extends SessionDomain>(
  domain: K,
  accountId: string,
  value: NonNullable<SessionData[K]>,
): void {
  if (typeof window === "undefined") return;
  watchStorage();
  const key = keyOf(domain, accountId);
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: this tab keeps working from memory.
  }
  emit();
}

// Forgets everything mirrored for an account (sign-out, another account
// signing in on this browser).
export function clearAccountCache(accountId: string): void {
  if (typeof window === "undefined") return;
  const suffix = `.v1:${accountId}`;
  for (const key of [...memory.keys()]) {
    if (key.endsWith(suffix)) memory.delete(key);
  }
  try {
    const stale: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(PREFIX) && key.endsWith(suffix)) stale.push(key);
    }
    stale.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Nothing to remove when storage is unavailable.
  }
  emit();
}

// Fires when any domain changes, in this tab or another one.
export function subscribeCache(listener: () => void): () => void {
  watchStorage();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
