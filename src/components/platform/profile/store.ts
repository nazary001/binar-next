// The profile lists (counterparties, employees, the invitation token)
// in a tiny external store backed by localStorage, read through
// useSyncExternalStore exactly like the cart and auth stores: the server
// snapshot is empty, the client snapshot is what the browser saved, so
// hydration matches and the rows appear right after; other tabs follow
// through the `storage` event. One record per account id, so a second
// partner signing in on the same browser gets lists of their own.
"use client";

import { useEffect, useSyncExternalStore } from "react";
import { DEMO_ACCOUNTS } from "@/components/auth/demo";
import {
  PROFILE_STORAGE_KEY,
  emptyProfile,
  seedProfile,
  type Contract,
  type Counterparty,
  type Employee,
  type ProfileData,
} from "./data";

type ProfileRecords = Record<string, ProfileData>;

const EMPTY: ProfileRecords = {};
let records: ProfileRecords | null = null;
const listeners = new Set<() => void>();

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isContract(v: unknown): v is Contract {
  return (
    isObject(v) &&
    typeof v.id === "string" &&
    typeof v.number === "string" &&
    typeof v.date === "string" &&
    typeof v.status === "string" &&
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

function readProfile(v: unknown): ProfileData | null {
  if (!isObject(v)) return null;
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
  const inviteToken = typeof v.inviteToken === "string" && v.inviteToken ? v.inviteToken : "a8f3k2";
  return { counterparties, employees, inviteToken };
}

function readStorage(): ProfileRecords {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed)) return EMPTY;
    const out: ProfileRecords = {};
    for (const [id, value] of Object.entries(parsed)) {
      const p = readProfile(value);
      if (p) out[id] = p;
    }
    return out;
  } catch {
    return EMPTY;
  }
}

function writeStorage(next: ProfileRecords) {
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage may be unavailable (private mode); the edits still hold
    // until the tab closes.
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function getSnapshot(): ProfileRecords {
  if (records === null) records = readStorage();
  return records;
}

export function getServerSnapshot(): ProfileRecords {
  return EMPTY;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== PROFILE_STORAGE_KEY) return;
    records = readStorage();
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// The starting lists of an account that has no record yet: the Figma
// rows for the shared demo partner, empty lists (the Empty frames) for
// everyone else.
function initialFor(accountId: string): ProfileData {
  return DEMO_ACCOUNTS.some((a) => a.id === accountId && a.type === "b2b")
    ? seedProfile()
    : emptyProfile();
}

// Writes the starting record once, so the seed's invitation time and a
// new account's token stay put across reloads.
export function ensureProfile(accountId: string) {
  const current = getSnapshot();
  if (current[accountId]) return;
  records = { ...current, [accountId]: initialFor(accountId) };
  writeStorage(records);
  emit();
}

export function updateProfile(accountId: string, updater: (prev: ProfileData) => ProfileData) {
  const current = getSnapshot();
  const prev = current[accountId] ?? initialFor(accountId);
  records = { ...current, [accountId]: updater(prev) };
  writeStorage(records);
  emit();
}

// The account's lists, or null until the browser store is read (server
// render and the hydration pass) and while the record is being created.
export function useProfile(accountId: string | null | undefined): ProfileData | null {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    if (accountId) ensureProfile(accountId);
  }, [accountId]);
  if (!accountId) return null;
  return all[accountId] ?? null;
}
