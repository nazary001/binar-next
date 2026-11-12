// The cart lines live in a tiny external store backed by localStorage
// and are read through useSyncExternalStore: the server snapshot is an
// empty cart, the client snapshot is what the browser has saved, so the
// first client render hydrates cleanly and the stored lines appear
// right after — no setState-in-effect, and other tabs stay in sync via
// the `storage` event.
//
// Signed-in accounts: the browser's lines stay the working copy (same
// key, same synchronous API, guests are untouched) and the server keeps the
// durable copy (carts[userId], PUT /api/cart). Every change made in THIS
// tab while an account is signed in is saved, debounced and flushed on
// pagehide (lib/session/push.ts); a change that arrives from another tab
// through the `storage` event was saved by that tab. The saved cart comes
// back with every session answer (sign-in, sign-up, boot, a refresh after a
// refusal) through the "cart" applier below, which picks a side with a
// small marker in SYNC_KEY, { accountId, dirty, base }:
//   a) the marker names another account or none - this browser has just
//      signed in to this account: the local lines first (a local quantity
//      wins), then the lines only the server had; saved when that differs
//      from the server's copy;
//   b) the marker names this account and nothing is unsaved: the server's
//      lines replace the local ones (a removal made on another device
//      sticks instead of being resurrected by this stale copy);
//   c) the marker names this account and a change never reached the
//      server (made offline, the tab closed too soon): it is saved.
// `dirty` turns true with every local change of a signed-in account and
// false once the server answered the save. `base` is the saved cart this
// browser last knew (the last session answer or save answer). Every save
// sends it along, and the server applies only the changes this browser made
// on top of the cart as it is stored now (rebaseCartLines in data.ts): a
// tab that stayed open while another device removed a line or changed a
// quantity does not undo that with its next save, with or without a reload.
// Signing out keeps the local lines (as before) and clears the marker; a
// change still waiting for its save is sent on the way out.
import type { Account } from "@/components/auth/data";
import * as authStore from "@/components/auth/store";
import { api } from "@/lib/api/client";
import { registerDomainApplier } from "@/lib/session/bootstrap";
import { createDebouncedSave } from "@/lib/session/push";
import { CART_MAX_LINES, CART_MAX_QTY, CART_STORAGE_KEY, rebaseCartLines, type CartLine } from "./data";

const EMPTY: CartLine[] = [];
let lines: CartLine[] | null = null;
const listeners = new Set<() => void>();
// Bumped on every change of the content of `lines` (a local change, a
// session answer, another tab), never for a write of the same lines, so a
// save answer can tell whether the cart moved on since the request left.
let version = 0;

// Lines of a stored or received value: objects with a string id and a
// positive whole quantity, one line per id (a hand-edited or racing write
// could leave duplicates, which would collide as React keys; their
// quantities add up and the first appearance keeps its place).
function linesOf(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return EMPTY;
  const valid = value.filter(
    (l): l is CartLine =>
      typeof l === "object" &&
      l !== null &&
      typeof (l as CartLine).id === "string" &&
      Number.isInteger((l as CartLine).qty) &&
      (l as CartLine).qty > 0,
  );
  const merged = new Map<string, number>();
  valid.forEach((l) => merged.set(l.id, (merged.get(l.id) ?? 0) + l.qty));
  const result = [...merged].map(([id, qty]) => ({ id, qty }));
  return result.length ? result : EMPTY;
}

function readStorage(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return EMPTY;
    return linesOf(JSON.parse(raw));
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

function sameLines(a: readonly CartLine[], b: readonly CartLine[]): boolean {
  return a.length === b.length && a.every((l, i) => l.id === b[i].id && l.qty === b[i].qty);
}

// Every write of the lines goes through here.
function commit(next: CartLine[]) {
  lines = next.length ? next : EMPTY;
  version++;
  writeStorage(lines);
  emit();
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
    const next = readStorage();
    if (lines !== null && sameLines(lines, next)) return;
    lines = next;
    version++;
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// --- the server copy of a signed-in account ---------------------------------

const SYNC_KEY = "binar-cart-sync-v1";

// `base` is absent in a marker written before it existed (or by a test
// seed): the next save then replaces the stored cart, and its answer sets
// the base.
type SyncMarker = { accountId: string; dirty: boolean; base?: CartLine[] };

// The marker when localStorage cannot be read (blocked storage): this tab
// still saves, and a reload starts over with a merge.
let memoryMarker: SyncMarker | null = null;

function readMarker(): SyncMarker | null {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(SYNC_KEY);
  } catch {
    return memoryMarker;
  }
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { accountId, dirty, base } = parsed as { accountId?: unknown; dirty?: unknown; base?: unknown };
    if (typeof accountId !== "string" || typeof dirty !== "boolean") return null;
    return Array.isArray(base) ? { accountId, dirty, base: linesOf(base) } : { accountId, dirty };
  } catch {
    return null;
  }
}

function writeMarker(next: SyncMarker | null) {
  memoryMarker = next;
  try {
    if (next) window.localStorage.setItem(SYNC_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(SYNC_KEY);
  } catch {
    // Storage unavailable: the marker lives in memory for this tab.
  }
}

function signedInAccount(): Account | null {
  return authStore.currentAccount(authStore.getSnapshot());
}

// What PUT /api/cart accepts (server/validate.ts zLine): a plain business
// id and a whole quantity up to CART_MAX_QTY. A line no product can have
// is left out instead of failing the whole save; the server drops lines of
// unknown products and caps the cart at CART_MAX_LINES lines.
const SAVABLE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

function payloadOf(current: readonly CartLine[]): CartLine[] {
  return current
    .filter((l) => SAVABLE_ID.test(l.id))
    .slice(0, CART_MAX_LINES)
    .map((l) => ({ id: l.id, qty: Math.min(l.qty, CART_MAX_QTY) }));
}

// The body of a save: the lines, and the saved cart they were changed from
// when this browser knows it (see `base` above).
function bodyOf(current: readonly CartLine[], base: readonly CartLine[] | undefined) {
  return base ? { lines: payloadOf(current), base: payloadOf(base) } : { lines: payloadOf(current) };
}

// The last save the server confirmed in this tab. A session answer may have
// been read on the server before that save landed (the boot's GET
// /api/session racing a quick first change); for a few seconds such an
// answer is not allowed to take the confirmed lines back (rule b).
const SAVE_SETTLE_MS = 10_000;
let lastSaved: { accountId: string; lines: CartLine[]; sentAt: number } | null = null;

const SKIPPED = { ok: true, status: 204, data: null } as const;

// True from a scheduled save until it starts (the debounce is running): what
// a sign-out sends on the way out instead of dropping it.
let savePending = false;

// Every PUT /api/cart of this tab that has not been answered yet (a
// debounced save, the one a sign-out sends): what cartSavesSettled() waits
// for. api() never rejects.
let unanswered: Promise<void> = Promise.resolve();

function putCart(body: ReturnType<typeof bodyOf>, keepalive: boolean) {
  const request = api<{ lines?: unknown }>("/api/cart", { method: "PUT", body, keepalive });
  unanswered = Promise.all([unanswered, request]).then(() => undefined);
  return request;
}

// Resolves once every cart save this tab has sent so far is answered (at
// once when none is out). A sign-out that waits for it before it posts
// POST /api/auth/sign-out lets a save that is still out, or the one the
// sign-out itself sends (flushOnSignOut), reach the server while the
// session still exists there; sent side by side, the sign-out can be
// processed first and the save is refused.
export function cartSavesSettled(): Promise<void> {
  return unanswered;
}

const saver = createDebouncedSave(async (keepalive) => {
  savePending = false;
  const account = signedInAccount();
  const marker = readMarker();
  if (!account || marker?.accountId !== account.id) return SKIPPED;
  const sent = getSnapshot();
  const sentVersion = version;
  const sentAt = Date.now();
  const result = await putCart(bodyOf(sent, marker.base), keepalive);
  // An answer counts only while the same account is still signed in
  // (a sign-out in between cleared the marker).
  if (signedInAccount()?.id !== account.id || readMarker()?.accountId !== account.id) return result;
  if (result.ok) {
    const stored = Array.isArray(result.data?.lines) ? linesOf(result.data.lines) : payloadOf(sent);
    lastSaved = { accountId: account.id, lines: stored, sentAt };
    if (version === sentVersion) {
      // The server keeps known products only and kept what other devices
      // changed meanwhile; nothing changed here since the request left, so
      // its copy becomes the local one too.
      if (!sameLines(stored, sent)) commit(stored);
      writeMarker({ accountId: account.id, dirty: false, base: stored });
    } else {
      // The cart moved on while the request was out: the changes made since
      // then go on top of what the server stored, and the save those
      // changes scheduled sends them with this answer as the base.
      const current = getSnapshot();
      const rebased = rebaseCartLines(sent, current, stored);
      if (!sameLines(rebased, current)) commit(rebased);
      writeMarker({ accountId: account.id, dirty: true, base: stored });
    }
  } else if (result.status !== 0) {
    // Refused: push.ts now refreshes the session, and the server's cart
    // must win that round (rule b), or a refused save would repeat forever.
    writeMarker({ accountId: account.id, dirty: false, base: readMarker()?.base });
  }
  return result;
});

function scheduleSave() {
  savePending = true;
  saver.schedule();
}

// A change made in this tab: saved when an account is signed in and this
// browser already settled with its saved cart. Before that (the marker
// names another account or none) the next session answer merges it in.
function noteLocalChange() {
  if (typeof window === "undefined") return;
  const account = signedInAccount();
  if (!account) return;
  const marker = readMarker();
  if (marker?.accountId !== account.id) return;
  if (!marker.dirty) writeMarker({ ...marker, dirty: true });
  scheduleSave();
}

// Rule a: the local lines first (a local quantity wins), then the lines
// only the server had, in the server's order.
function mergeLines(local: readonly CartLine[], server: readonly CartLine[]): CartLine[] {
  const ids = new Set(local.map((l) => l.id));
  return [...local, ...server.filter((l) => !ids.has(l.id))];
}

// The "cart" domain of a session answer. It runs before the account is
// committed to the auth store (lib/session/bootstrap.ts), so the account
// comes as an argument. It only writes this store; React re-renders through
// the existing subscription.
function applyServerCart(value: CartLine[], account: Account) {
  if (typeof window === "undefined") return;
  const server = linesOf(value);
  const local = getSnapshot();
  const marker = readMarker();

  if (marker?.accountId !== account.id) {
    const merged = mergeLines(local, server);
    if (!sameLines(merged, local)) commit(merged);
    const settled = sameLines(merged, server);
    writeMarker({ accountId: account.id, dirty: !settled, base: server });
    if (!settled) scheduleSave();
    return;
  }

  if (marker.dirty) {
    // The save sends the marker's base, so the server keeps what other
    // devices changed since this browser last heard from it.
    if (sameLines(local, server)) writeMarker({ accountId: account.id, dirty: false, base: server });
    else scheduleSave();
    return;
  }

  if (!sameLines(local, server)) {
    const confirmedJustNow =
      lastSaved !== null &&
      lastSaved.accountId === account.id &&
      Date.now() - lastSaved.sentAt < SAVE_SETTLE_MS &&
      sameLines(local, lastSaved.lines);
    if (confirmedJustNow) return;
    commit(server);
  }
  if (!marker.base || !sameLines(marker.base, server)) {
    writeMarker({ accountId: account.id, dirty: false, base: server });
  }
}

registerDomainApplier("cart", applyServerCart);

// Signing out with a change still waiting in the debounce: it is sent right
// away for the account that was signed in (auth/api.ts drops the local
// session before it posts the sign-out, so this request leaves first), with
// keepalive, instead of being dropped; other devices of the account then
// see it. Its answer changes nothing here (this browser is signed out by
// then); cartSavesSettled() resolves with it.
function flushOnSignOut(accountId: string | null) {
  const pending = savePending;
  savePending = false;
  saver.cancel();
  if (!pending || accountId === null) return;
  const marker = readMarker();
  if (marker?.accountId !== accountId) return;
  void putCart(bodyOf(getSnapshot(), marker.base), true);
}

// Sign-out (here or in another tab) and a session that ended: the local
// lines stay, the marker goes, a pending save is sent (flushOnSignOut). A
// page that loads with no account signed in clears a marker left behind
// (an expired session), so the next sign-in merges instead of replacing.
if (typeof window !== "undefined") {
  let seenAccountId = signedInAccount()?.id ?? null;
  if (seenAccountId === null && readMarker() !== null) writeMarker(null);
  authStore.subscribe(() => {
    const id = signedInAccount()?.id ?? null;
    if (id === seenAccountId) return;
    const previous = seenAccountId;
    seenAccountId = id;
    if (id !== null) return;
    flushOnSignOut(previous);
    lastSaved = null;
    writeMarker(null);
  });
}

// --- changes ------------------------------------------------------------------

// An updater that changes nothing (restoreLine of a line that is already
// in, a second remove of a row that is leaving) writes nothing, bumps no
// version and schedules no save.
export function updateLines(updater: (prev: CartLine[]) => CartLine[]) {
  const prev = getSnapshot();
  const next = updater(prev);
  if (sameLines(prev, next)) return;
  commit(next);
  noteLocalChange();
}

// Bulk add (the «Мій асортимент» selection bar): merges several lines
// into the cart in one write — quantities add up for products already
// in the cart. The caller opens the drawer through useCart().openCart.
export function addMany(add: CartLine[]) {
  const valid = add.filter((l) => Number.isInteger(l.qty) && l.qty > 0);
  if (valid.length === 0) return;
  updateLines((prev) => {
    const next = prev.map((l) => ({ ...l }));
    valid.forEach(({ id, qty }) => {
      const existing = next.find((l) => l.id === id);
      if (existing) existing.qty += qty;
      else next.push({ id, qty });
    });
    return next;
  });
}
