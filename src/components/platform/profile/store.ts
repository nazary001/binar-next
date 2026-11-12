// The profile lists (counterparties, employees, the invitation token) of
// the signed-in partner's company. The server owns them: the session
// answer (GET /api/session, the sign-in answer) carries them as the
// `profile` domain, and lib/session/bootstrap.ts mirrors that per account
// (lib/session/cache.ts) BEFORE it commits the account, so the first
// signed-in render already has the rows. This store reads the mirror
// synchronously through useSyncExternalStore: the server snapshot is
// empty, the client snapshot is the mirror, so hydration matches and the
// rows appear right after; other tabs follow through the mirror's
// `storage` event. The actions (actions.ts) change the mirror at once and
// then post each change; the next session answer replaces it.
"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { currentAccount, getSnapshot as getAuthSnapshot, subscribe as subscribeAuth } from "@/components/auth/store";
import { readDomain, subscribeCache, writeDomain } from "@/lib/session/cache";
import {
  CONTRACT_STATUS,
  COUNTERPARTY_STATUS,
  PROFILE_STORAGE_KEY,
  type Contract,
  type Counterparty,
  type Employee,
  type ProfileData,
} from "./data";

type ProfileRecords = Record<string, ProfileData>;

const EMPTY: ProfileRecords = {};
// The base an optimistic change starts from when nothing is mirrored yet
// (the session answer then brings the real lists).
const EMPTY_PROFILE: ProfileData = { counterparties: [], employees: [], inviteToken: "" };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

// The mirror is read leniently, as the browser record was: a row that is
// not what the page draws (a status outside the unions would crash the
// status lookups) is left out.
function isContract(v: unknown): v is Contract {
  return (
    isObject(v) &&
    typeof v.id === "string" &&
    typeof v.number === "string" &&
    typeof v.date === "string" &&
    typeof v.status === "string" &&
    Object.hasOwn(CONTRACT_STATUS, v.status) &&
    isObject(v.file) &&
    typeof v.file.name === "string"
  );
}

function isCounterparty(v: unknown): v is Counterparty {
  return (
    isObject(v) &&
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.signatory === "string" &&
    typeof v.code === "string" &&
    typeof v.status === "string" &&
    Object.hasOwn(COUNTERPARTY_STATUS, v.status) &&
    Array.isArray(v.contracts)
  );
}

function isEmployee(v: unknown): v is Employee {
  return (
    isObject(v) &&
    typeof v.id === "string" &&
    (v.status === "active" || v.status === "invited") &&
    typeof v.email === "string"
  );
}

function readProfile(v: Record<string, unknown>): ProfileData {
  const counterparties = Array.isArray(v.counterparties)
    ? v.counterparties.filter(isCounterparty).map((c) => ({
        ...c,
        contracts: c.contracts.filter(isContract),
      }))
    : [];
  const employees = Array.isArray(v.employees)
    ? v.employees.filter(isEmployee).map((e) => ({
        ...e,
        fullName: typeof e.fullName === "string" ? e.fullName : "",
        position: typeof e.position === "string" ? e.position : "",
        phone: typeof e.phone === "string" ? e.phone : "",
      }))
    : [];
  const inviteToken = typeof v.inviteToken === "string" ? v.inviteToken : "";
  return { counterparties, employees, inviteToken };
}

// Mirrored value -> its checked copy. The mirror hands out the same object
// until it changes, so the copy (the snapshot) is referentially stable too.
const checked = new WeakMap<object, ProfileData>();

// The account's mirrored lists, or null when none are mirrored (and always
// null on the server).
function profileOf(accountId: string): ProfileData | null {
  const raw: unknown = readDomain("profile", accountId);
  if (!isObject(raw)) return null;
  let profile = checked.get(raw);
  if (!profile) {
    profile = readProfile(raw);
    checked.set(raw, profile);
  }
  return profile;
}

let lastRecords: ProfileRecords = EMPTY;

// The signed-in account's lists keyed by its id ({} when none).
export function getSnapshot(): ProfileRecords {
  if (typeof window === "undefined") return EMPTY;
  const account = currentAccount(getAuthSnapshot());
  const profile = account ? profileOf(account.id) : null;
  if (!account || !profile) return EMPTY;
  if (lastRecords[account.id] !== profile) lastRecords = { [account.id]: profile };
  return lastRecords;
}

export function getServerSnapshot(): ProfileRecords {
  return EMPTY;
}

// Fires when the mirror (this tab or another) or the account changes.
export function subscribe(listener: () => void): () => void {
  const offCache = subscribeCache(listener);
  const offAuth = subscribeAuth(listener);
  return () => {
    offCache();
    offAuth();
  };
}

let legacyDropped = false;

// The lists come from the server for every partner (the demo company's
// seeded rows, empty lists and the company's own token for everyone
// else), so there is nothing to create here any more. What is left: the
// browser record of the lists from before the database is removed once.
export function ensureProfile(accountId: string) {
  void accountId;
  if (legacyDropped || typeof window === "undefined") return;
  legacyDropped = true;
  try {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    // Storage unavailable: nothing to remove.
  }
}

// An optimistic change of the account's mirrored lists.
export function updateProfile(accountId: string, updater: (prev: ProfileData) => ProfileData) {
  writeDomain("profile", accountId, updater(profileOf(accountId) ?? EMPTY_PROFILE));
}

const serverProfile = (): ProfileData | null => null;

// The account's lists, or null until the browser has them (server render,
// the hydration pass, an account whose lists the session has not brought
// yet).
export function useProfile(accountId: string | null | undefined): ProfileData | null {
  const id = accountId ?? null;
  const getProfile = useCallback(() => (id === null ? null : profileOf(id)), [id]);
  const profile = useSyncExternalStore(subscribeCache, getProfile, serverProfile);
  useEffect(() => {
    if (id) ensureProfile(id);
  }, [id]);
  return profile;
}
