// Account-level edits of the profile page: the company and person data
// and the password live on the account (src/components/auth), so the
// header chip and the account drawer follow every change. saveCompany /
// savePerson stay synchronous for the page (its auto-save fields are keyed
// by the saved value): the local account changes at once, then
// PATCH /api/account follows through the shared queue of auth/api.ts; a
// refused edit refreshes the session and the server's values come back.
// changePassword asks the server, which owns the password.
import { pushAccountPatch } from "@/components/auth/api";
import type { Account, CompanyData, PersonData } from "@/components/auth/data";
import { currentAccount, updateState } from "@/components/auth/store";
import { api } from "@/lib/api/client";
import { refreshSession } from "@/lib/session/bootstrap";
import { PASSWORD_COPY, validatePassword, type PasswordErrors, type PasswordFields } from "./password";

export { PASSWORD_COPY, validatePassword, type PasswordErrors, type PasswordFields } from "./password";

// Patches the signed-in account in the local store; false when nobody is
// signed in (then nothing is sent either).
function patchMe(patch: (me: Account) => Partial<Account>): boolean {
  let patched = false;
  updateState((prev) => {
    const me = currentAccount(prev);
    if (!me) return prev;
    patched = true;
    return {
      ...prev,
      accounts: prev.accounts.map((a) => (a.id === me.id ? { ...a, ...patch(a) } : a)),
    };
  });
  return patched;
}

export function saveCompany(patch: Partial<CompanyData>) {
  if (patchMe((me) => ({ company: { ...me.company, ...patch } }))) pushAccountPatch({ company: patch });
}

export function savePerson(patch: Partial<PersonData>) {
  if (patchMe((me) => ({ person: { ...me.person, ...patch } }))) pushAccountPatch({ person: patch });
}

export type ChangePasswordResult = { ok: true } | { ok: false; errors: PasswordErrors };

// The server checks the current password and the same field rules; a
// change signs the account out everywhere else.
export async function changePassword(f: PasswordFields): Promise<ChangePasswordResult> {
  const errors = validatePassword(f);
  if (Object.values(errors).some(Boolean)) return { ok: false, errors };
  const result = await api("/api/account/password", { body: f });
  if (result.ok) return { ok: true };
  const fields = result.error === "fields" ? result.data.fields : null;
  if (typeof fields === "object" && fields !== null) return { ok: false, errors: fields as PasswordErrors };
  // The session ended (expired, signed out elsewhere): the server's state
  // wins, so the page leaves the signed-in view instead of insisting on a
  // wrong password.
  if (result.status === 401) void refreshSession();
  // Wrong current password, too many tries, signed out, offline: the
  // modal's one message.
  return { ok: false, errors: { current: PASSWORD_COPY.errors.wrong } };
}
