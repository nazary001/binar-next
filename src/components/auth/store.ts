// Registered accounts and the current session live in a tiny external
// store backed by localStorage (the same shape as the cart store): the
// server snapshot is «signed out», the client snapshot is what the
// browser has saved, so hydration matches and the header pill switches
// to the account right after; other tabs follow via the `storage` event.
// This is the browser-side stand-in for the CRM: api.ts is the only
// module that writes here, so a real backend replaces api.ts alone.
import { AUTH_STORAGE_KEY, EMPTY_STATE, type Account, type AuthState } from "./data";

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

function readStorage(): AuthState {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return EMPTY_STATE;
    const { accounts, sessionId } = parsed as Partial<AuthState>;
    const valid = Array.isArray(accounts) ? accounts.filter(isAccount) : [];
    const session =
      typeof sessionId === "string" && valid.some((a) => a.id === sessionId) ? sessionId : null;
    return valid.length || session ? { accounts: valid, sessionId: session } : EMPTY_STATE;
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
  state = next.accounts.length || next.sessionId ? next : EMPTY_STATE;
  writeStorage(state);
  emit();
}

export function currentAccount(s: AuthState): Account | null {
  return s.sessionId ? (s.accounts.find((a) => a.id === s.sessionId) ?? null) : null;
}
