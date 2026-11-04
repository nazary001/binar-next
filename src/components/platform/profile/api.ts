// Account-level edits of the profile page: the company and person data
// and the password live on the auth account (src/components/auth), so the
// header chip and the account drawer follow every change. auth/api.ts
// has no profile endpoints yet; this module patches the signed-in account
// through the auth store the same way auth/api.ts does (move these into
// auth/api.ts when the CRM lands - the signatures are what the page uses).
import { sha256 } from "@/components/auth/api";
import { DEMO_PASSWORD, isDemoAccount } from "@/components/auth/demo";
import {
  PASSWORD_MIN,
  type Account,
  type CompanyData,
  type PersonData,
} from "@/components/auth/data";
import { currentAccount, getSnapshot, updateState } from "@/components/auth/store";

const LATENCY_MS = 350;

function delay(ms = LATENCY_MS) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function patchMe(patch: (me: Account) => Partial<Account>) {
  updateState((prev) => {
    const me = currentAccount(prev);
    if (!me) return prev;
    return {
      ...prev,
      accounts: prev.accounts.map((a) => (a.id === me.id ? { ...a, ...patch(a) } : a)),
    };
  });
}

export function saveCompany(patch: Partial<CompanyData>) {
  patchMe((me) => ({ company: { ...me.company, ...patch } }));
}

export function savePerson(patch: Partial<PersonData>) {
  patchMe((me) => ({ person: { ...me.person, ...patch } }));
}

export type PasswordFields = { current: string; next: string; repeat: string };
export type PasswordErrors = Partial<Record<keyof PasswordFields, string>>;

export const PASSWORD_COPY = {
  title: "Змінити пароль",
  current: "Поточний пароль",
  next: "Новий пароль",
  repeat: "Повторіть пароль",
  submit: "Зберегти пароль",
  done: "Пароль змінено",
  errors: {
    current: "Введіть поточний пароль",
    wrong: "Неправильний поточний пароль",
    next: "Введіть новий пароль",
    short: `Пароль має містити щонайменше ${PASSWORD_MIN} символів`,
    repeat: "Повторіть пароль",
    mismatch: "Паролі не збігаються",
  },
} as const;

export function validatePassword(f: PasswordFields): PasswordErrors {
  const e = PASSWORD_COPY.errors;
  return {
    current: f.current ? undefined : e.current,
    next: !f.next ? e.next : f.next.length < PASSWORD_MIN ? e.short : undefined,
    repeat: !f.repeat ? e.repeat : f.repeat !== f.next ? e.mismatch : undefined,
  };
}

export type ChangePasswordResult = { ok: true } | { ok: false; errors: PasswordErrors };

// The current password must open the account (the demo accounts also
// accept the shared DEMO_PASSWORD, as in the sign-in drawer).
export async function changePassword(f: PasswordFields): Promise<ChangePasswordResult> {
  const errors = validatePassword(f);
  if (Object.values(errors).some(Boolean)) return { ok: false, errors };
  await delay();
  const me = currentAccount(getSnapshot());
  if (!me) return { ok: false, errors: { current: PASSWORD_COPY.errors.wrong } };
  const demo = isDemoAccount(me) && f.current === DEMO_PASSWORD;
  if (!demo && (await sha256(f.current)) !== me.passwordHash) {
    return { ok: false, errors: { current: PASSWORD_COPY.errors.wrong } };
  }
  const passwordHash = await sha256(f.next);
  patchMe(() => ({ passwordHash }));
  return { ok: true };
}
