// The account API the drawer talks to. There is no backend yet, so every
// call is answered from the browser store after a short delay that keeps
// the loading states honest; the CRM integration replaces the bodies
// below one by one (the signatures are what the screens depend on):
//   lookupPhone   -> is this CRM contact already registered on the site?
//   sendCode      -> SMS with a 4-digit code, valid CODE_TTL_SECONDS
//   verifyCode    -> the code the person typed
//   register      -> create the site account for a verified phone
//   signIn        -> login + password
//   resetPassword -> new password after a verified code
// The mock accepts ANY complete 4-digit code (nothing is sent), stores
// passwords as SHA-256 digests and keeps everything in localStorage.
import {
  CODE_LENGTH,
  CODE_TTL_SECONDS,
  phoneDigits,
  type Account,
  type CompanyData,
  type PersonData,
} from "./data";
import { currentAccount, getSnapshot, updateState } from "./store";

const LATENCY_MS = 450;

function delay(ms = LATENCY_MS) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function sha256(text: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Insecure contexts (plain http on a LAN) have no SubtleCrypto; a
  // plain marker keeps the mock working there.
  return `plain:${text}`;
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `acc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function findByLogin(login: string): Account | undefined {
  const key = phoneDigits(login) || login.trim().toLowerCase();
  return getSnapshot().accounts.find(
    (a) => a.login === key || a.phone === key || a.person.email.toLowerCase() === key,
  );
}

export type PhoneLookup = "registered" | "new";

export async function lookupPhone(phone: string): Promise<PhoneLookup> {
  await delay();
  return findByLogin(phone) ? "registered" : "new";
}

export async function findAccount(login: string): Promise<boolean> {
  await delay();
  return Boolean(findByLogin(login));
}

export async function sendCode(_phone: string): Promise<{ ttl: number }> {
  void _phone;
  await delay();
  return { ttl: CODE_TTL_SECONDS };
}

export async function verifyCode(_phone: string, code: string): Promise<boolean> {
  void _phone;
  await delay();
  return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code);
}

export async function register(input: {
  phone: string;
  password: string;
  company: CompanyData;
  person: PersonData;
}): Promise<Account> {
  await delay();
  const phone = phoneDigits(input.phone);
  const account: Account = {
    id: newId(),
    phone,
    login: phone,
    passwordHash: await sha256(input.password),
    company: input.company,
    person: input.person,
    createdAt: new Date().toISOString(),
    welcomed: false,
  };
  updateState((prev) => ({
    accounts: [...prev.accounts.filter((a) => a.phone !== phone), account],
    sessionId: account.id,
  }));
  return account;
}

export async function signIn(login: string, password: string): Promise<Account | null> {
  await delay();
  const account = findByLogin(login);
  if (!account) return null;
  const hash = await sha256(password);
  if (hash !== account.passwordHash) return null;
  updateState((prev) => ({ ...prev, sessionId: account.id }));
  return account;
}

export async function resetPassword(login: string, password: string): Promise<Account | null> {
  await delay();
  const account = findByLogin(login);
  if (!account) return null;
  const passwordHash = await sha256(password);
  updateState((prev) => ({
    accounts: prev.accounts.map((a) => (a.id === account.id ? { ...a, passwordHash } : a)),
    sessionId: account.id,
  }));
  return { ...account, passwordHash };
}

export function signOut() {
  updateState((prev) => ({ ...prev, sessionId: null }));
}

export function markWelcomed() {
  updateState((prev) => {
    const me = currentAccount(prev);
    if (!me) return prev;
    return {
      ...prev,
      accounts: prev.accounts.map((a) => (a.id === me.id ? { ...a, welcomed: true } : a)),
    };
  });
}

export function saveLogo(dataUrl: string) {
  updateState((prev) => {
    const me = currentAccount(prev);
    if (!me) return prev;
    return {
      ...prev,
      accounts: prev.accounts.map((a) => (a.id === me.id ? { ...a, logo: dataUrl } : a)),
    };
  });
}
