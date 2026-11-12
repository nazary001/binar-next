// Client side of the session bootstrap (lib/session/types.ts).
//
// applyBootstrap(b) makes the browser agree with what the server said:
// 1. every data domain goes into the per-account mirror (cache.ts), or
//    through the applier its store registered;
// 2. only then the account is committed to the auth store.
// The order matters: the commit is what re-renders the site as signed in,
// and by then the cabinet's data is already readable, so nothing flashes
// empty. A signed-out answer drops the local session and that account's
// mirror.
//
// refreshSession() asks GET /api/session and applies the answer. It is
// called on boot when the hint cookie is present, when a tab becomes
// visible again after a while, and after the server refused a mutation
// (the server's state then replaces the optimistic one).
//
// The answer's `config` (the shop rules, the same for every visitor) goes
// to lib/session/config.ts first, signed in or not.
import * as authStore from "@/components/auth/store";
import type { Account } from "@/components/auth/data";
import { api } from "@/lib/api/client";
import { clearAccountCache, writeDomain } from "./cache";
import { applyShopConfig, shopConfigConfirmed } from "./config";
import type { SessionBootstrap, SessionData, SessionDomain } from "./types";

type Applier = (value: unknown, account: Account) => void;
const appliers = new Map<SessionDomain, Applier>();

// A store whose domain needs more than "replace the mirror" registers its
// own applier at module load (the cart merges the browser's lines with the
// saved ones).
export function registerDomainApplier<K extends SessionDomain>(
  domain: K,
  applier: (value: NonNullable<SessionData[K]>, account: Account) => void,
): void {
  appliers.set(domain, applier as Applier);
}

let lastAppliedAt = 0;

// Milliseconds since the server last confirmed the session (Infinity before
// the first answer).
export function sessionAgeMs(): number {
  return lastAppliedAt === 0 ? Infinity : Date.now() - lastAppliedAt;
}

function currentAccount(): Account | null {
  return authStore.currentAccount(authStore.getSnapshot());
}

// Signs this browser out locally: no account, no mirror. The pending
// password reset (if any) survives, as it did before.
export function dropLocalSession(): void {
  const previous = currentAccount();
  if (!previous && authStore.getSnapshot().accounts.length === 0) return;
  authStore.updateState((prev) => ({ ...prev, accounts: [], sessionId: null }));
  if (previous) clearAccountCache(previous.id);
}

export function applyBootstrap(bootstrap: SessionBootstrap): void {
  lastAppliedAt = Date.now();
  if (bootstrap.config !== undefined) applyShopConfig(bootstrap.config);
  const account = bootstrap.account;
  if (!account) {
    dropLocalSession();
    return;
  }
  const previous = currentAccount();
  if (previous && previous.id !== account.id) clearAccountCache(previous.id);

  for (const domain of Object.keys(bootstrap.data) as SessionDomain[]) {
    const value = bootstrap.data[domain];
    if (value === undefined) continue;
    const applier = appliers.get(domain);
    if (applier) applier(value, account);
    else writeDomain(domain, account.id, value);
  }

  authStore.updateState((prev) => ({ ...prev, accounts: [account], sessionId: account.id }));
}

export type RefreshOutcome = "signed-in" | "signed-out" | "unreachable";

let inflight: Promise<RefreshOutcome> | null = null;

// One request at a time: callers that arrive while it runs share the answer.
export function refreshSession(): Promise<RefreshOutcome> {
  inflight ??= (async (): Promise<RefreshOutcome> => {
    const result = await api<SessionBootstrap>("/api/session");
    // Offline or a server error: keep what the browser has, try later.
    if (!result.ok) return "unreachable";
    applyBootstrap(result.data);
    return result.data.account ? "signed-in" : "signed-out";
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

let configAsked = false;

// A visitor without a session never asks GET /api/session on its own (no
// hint cookie: AuthProvider skips the boot request on purpose, so
// anonymous page views cost no request). The readers of the shop rules
// (the cart when it opens) call this instead: at most one request per page
// load, none while a session request is on its way or once an answer
// brought the rules (every signed-in boot does). Only the rules are taken
// from this answer: a sign-in finishing meanwhile must not be undone by a
// "signed out" answer that was read before it.
export function ensureShopConfig(): void {
  if (configAsked || inflight || shopConfigConfirmed()) return;
  configAsked = true;
  void api<SessionBootstrap>("/api/session").then((result) => {
    if (result.ok && result.data.config !== undefined) applyShopConfig(result.data.config);
  });
}
