// The signed-in account lives in a tiny external store backed by
// localStorage (the same shape as the cart store): the server snapshot is
// "signed out", the client snapshot is what the browser has saved, so
// hydration matches and the header pill switches to the account right
// after; other tabs follow via the `storage` event.
// The server owns the session (httpOnly cookie); this store is only its
// mirror for an instant first paint: lib/session/bootstrap.ts commits what
// GET /api/session (or a sign-in) answered, auth/api.ts and
// platform/profile/api.ts apply optimistic edits. The mirror counts only
// while the readable hint cookie `binar_auth=1` exists: without it the
// browser has no session, whatever localStorage still holds.
import { hasSessionHint } from "@/lib/session/hint";
import {
  AUTH_STORAGE_KEY,
  EMPTY_STATE,
  type Account,
  type AuthState,
  type PendingReset,
} from "./data";

let state: AuthState | null = null;
const listeners = new Set<() => void>();

function isAccount(value: unknown): value is Account {
  if (typeof value !== "object" || value === null) return false;
  const a = value as Account;
  return (
    typeof a.id === "string" &&
    typeof a.phone === "string" &&
    typeof a.login === "string" &&
    typeof a.passwordHash === "string" &&
    typeof a.company === "object" &&
    a.company !== null &&
    typeof a.person === "object" &&
    a.person !== null
  );
}

// «Відновити пароль» leaves one of these until the link is used.
function isPendingReset(value: unknown): value is PendingReset {
  if (typeof value !== "object" || value === null) return false;
  const r = value as PendingReset;
  return typeof r.token === "string" && typeof r.login === "string";
}

// Accounts saved before the B2B / B2C split came from the company
// registration, so they are partners.
function withType(a: Account): Account {
  return a.type === "b2b" || a.type === "b2c" ? a : { ...a, type: "b2b" };
}

function readStorage(): AuthState {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY_STATE;
    const { accounts, sessionId, reset } = parsed as Partial<AuthState>;
    const valid = Array.isArray(accounts) ? accounts.filter(isAccount).map(withType) : [];
    // No hint cookie = signed out (the session expired or ended in another
    // browser). The stale records stay listed so the boot effect can clear
    // them; the pending reset survives as before.
    const session =
      hasSessionHint() && typeof sessionId === "string" && valid.some((a) => a.id === sessionId)
        ? sessionId
        : null;
    const pending = isPendingReset(reset) ? reset : null;
    return valid.length || session || pending
      ? { accounts: valid, sessionId: session, reset: pending }
      : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

function writeStorage(next: AuthState) {
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage may be unavailable or full (a large logo in private mode);
    // the session still works until the tab closes.
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function getSnapshot(): AuthState {
  if (state === null) state = readStorage();
  return state;
}

export function getServerSnapshot(): AuthState {
  return EMPTY_STATE;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== AUTH_STORAGE_KEY) return;
    state = readStorage();
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function updateState(updater: (prev: AuthState) => AuthState) {
  const next = updater(getSnapshot());
  state = next.accounts.length || next.sessionId || next.reset ? next : EMPTY_STATE;
  writeStorage(state);
  emit();
}

export function currentAccount(s: AuthState): Account | null {
  return s.sessionId ? (s.accounts.find((a) => a.id === s.sessionId) ?? null) : null;
}
