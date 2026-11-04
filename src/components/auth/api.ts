// The account API the drawer talks to. There is no backend yet, so every
// call is answered from the browser store after a short delay that keeps
// the loading states honest; the CRM integration replaces the bodies
// below one by one (the signatures are what the screens depend on):
//   signIn        -> login (e-mail or phone) + password
//   signUp        -> a retail (B2C) account from the sign-up form
//   sendResetLink -> e-mail / SMS with the password reset link
//   setPassword   -> the new password, authorised by the link's token
// The mock stores passwords as SHA-256 digests in localStorage, sends
// nothing (the reset link is always `/?reset=demo`, see data.ts) and
// signs the shared demo accounts (demo.ts) in on any device.
import {
  COPY,
  DEMO_RESET_TOKEN,
  EMPTY_COMPANY,
  RESET_RESEND_SECONDS,
  hasErrors,
  isEmailLike,
  normalizeLogin,
  validateSetPassword,
  validateSignIn,
  validateSignUp,
  type Account,
  type FieldErrors,
  type SetPasswordFields,
  type SignInFields,
  type SignUpFields,
} from "./data";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, isDemoAccount } from "./demo";
import { currentAccount, getSnapshot, updateState } from "./store";

const LATENCY_MS = 450;

function delay(ms = LATENCY_MS) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// SHA-256 hex of a password (the profile page's password change uses
// the same digest, so a password set there opens the sign-in drawer).
export async function sha256(text: string): Promise<string> {
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

// The device's own accounts first (a demo account keeps its local copy
// once it has signed in here), then the shared demo accounts. A login
// matches the account's login, phone or e-mail.
function findByLogin(login: string): Account | undefined {
  const key = normalizeLogin(login);
  if (!key) return undefined;
  const matches = (a: Account) =>
    a.login === key || a.phone === key || a.person.email.toLowerCase() === key;
  return getSnapshot().accounts.find(matches) ?? DEMO_ACCOUNTS.find(matches);
}

// Patches the stored copy of `account`, or adds it - a demo account
// enters the device's store this way on its first sign-in.
function upsert(accounts: Account[], account: Account, patch: Partial<Account> = {}): Account[] {
  return accounts.some((a) => a.id === account.id)
    ? accounts.map((a) => (a.id === account.id ? { ...a, ...patch } : a))
    : [...accounts, { ...account, ...patch }];
}

// --- sign in (5420:38171) ------------------------------------------------

export type SignInResult =
  | { ok: true; account: Account }
  // "empty": the field errors of «Error :: user didn't enter data»;
  // "invalid": the 436 x 128 alert of «Error :: invalid data».
  | { ok: false; error: "empty"; fields: FieldErrors<SignInFields> }
  | { ok: false; error: "invalid" };

export async function signIn(login: string, password: string): Promise<SignInResult> {
  const fields = validateSignIn({ login, password });
  if (hasErrors(fields)) return { ok: false, error: "empty", fields };
  await delay();
  const account = findByLogin(login);
  if (!account) return { ok: false, error: "invalid" };
  const demo = isDemoAccount(account) && password === DEMO_PASSWORD;
  if (!demo && (await sha256(password)) !== account.passwordHash) {
    return { ok: false, error: "invalid" };
  }
  updateState((prev) => ({ ...prev, accounts: upsert(prev.accounts, account), sessionId: account.id }));
  return { ok: true, account };
}

// --- sign up (5420:38224) ------------------------------------------------

export type SignUpResult =
  | { ok: true; account: Account }
  // "fields": empty / malformed fields or «паролі не збігаються» (the
  // 5th field of 5420:38244); "exists": the 436 x 80 alert of 5420:38234.
  | { ok: false; error: "fields"; fields: FieldErrors<SignUpFields> }
  | { ok: false; error: "exists" };

export async function signUp(input: SignUpFields): Promise<SignUpResult> {
  const fields = validateSignUp(input);
  if (hasErrors(fields)) return { ok: false, error: "fields", fields };
  await delay();
  if (findByLogin(input.login)) return { ok: false, error: "exists" };
  const login = normalizeLogin(input.login);
  const email = isEmailLike(login) ? login : "";
  const phone = email ? "" : login;
  const account: Account = {
    id: newId(),
    type: "b2c",
    phone,
    login,
    passwordHash: await sha256(input.password),
    company: EMPTY_COMPANY,
    person: {
      // «Прізвище Імʼя», the order the profile pages read names in.
      fullName: `${input.lastName.trim()} ${input.firstName.trim()}`,
      role: "",
      position: "",
      phone,
      email,
    },
    createdAt: new Date().toISOString(),
    // The «Вітаємо на платформі» modal is the partner's first login (it
    // asks for a company logo); retail customers never see it.
    welcomed: true,
  };
  updateState((prev) => ({ ...prev, accounts: [...prev.accounts, account], sessionId: account.id }));
  return { ok: true, account };
}

// --- password reset (5420:38196) -----------------------------------------

export type ResetLinkResult =
  | { ok: true; resendAfter: number }
  | { ok: false; error: "empty"; message: string };

// «Відновити пароль». The answer is the same whether or not the login
// exists (no account probing); only a known login gets a pending reset,
// which the mocked link `/?reset=demo` then redeems.
export async function sendResetLink(login: string): Promise<ResetLinkResult> {
  if (!login.trim()) return { ok: false, error: "empty", message: COPY.errors.login };
  await delay();
  const account = findByLogin(login);
  updateState((prev) => ({
    ...prev,
    reset: account ? { token: DEMO_RESET_TOKEN, login: account.login } : null,
  }));
  return { ok: true, resendAfter: RESET_RESEND_SECONDS };
}

export type SetPasswordResult =
  | { ok: true; login: string }
  | { ok: false; error: "fields"; fields: FieldErrors<SetPasswordFields> }
  // No pending reset for this token (expired, used, or never requested):
  // the drawer shows the «Не вдалося обробити запит» alert.
  | { ok: false; error: "token" };

export async function setPassword(
  token: string,
  password: string,
  repeat: string = password,
): Promise<SetPasswordResult> {
  const fields = validateSetPassword({ password, repeat });
  if (hasErrors(fields)) return { ok: false, error: "fields", fields };
  await delay();
  const pending = getSnapshot().reset;
  const account = pending && pending.token === token ? findByLogin(pending.login) : undefined;
  if (!account) return { ok: false, error: "token" };
  const passwordHash = await sha256(password);
  updateState((prev) => ({
    ...prev,
    accounts: upsert(prev.accounts, account, { passwordHash }),
    reset: null,
  }));
  return { ok: true, login: account.person.email || account.login };
}

// --- session -------------------------------------------------------------

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
