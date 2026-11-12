// The account API the drawer talks to. Every call goes to the server
// (src/app/api/auth/*, src/app/api/account); the signatures and result
// unions are what the screens depend on:
//   signIn        -> login (e-mail or phone) + password
//   signUp        -> a retail (B2C) account from the sign-up form
//   sendResetLink -> e-mail / SMS with the password reset link
//   setPassword   -> the new password, authorised by the link's token
// The field checks run here first, exactly as before, so an empty form
// never needs a round trip. A successful sign-in / sign-up answers with the
// session bootstrap, which is applied (data first, account last) before
// the caller hears "ok". The small account edits (sign-out, welcomed, logo)
// stay synchronous for the caller: the local store changes at once and the
// request follows; when the server refuses an edit, its state wins, and an
// unconfirmed sign-out is sent again on the next boot.
import { cartSavesSettled } from "@/components/cart/store";
import { api, type ApiResult } from "@/lib/api/client";
import { applyBootstrap, dropLocalSession, refreshSession } from "@/lib/session/bootstrap";
import { hasSessionHint, SESSION_HINT_COOKIE } from "@/lib/session/hint";
import { createPushQueue } from "@/lib/session/push";
import type { SessionBootstrap } from "@/lib/session/types";
import {
  COPY,
  DEMO_RESET_TOKEN,
  RESET_RESEND_SECONDS,
  hasErrors,
  normalizeLogin,
  validateSetPassword,
  validateSignIn,
  validateSignUp,
  type Account,
  type CompanyData,
  type FieldErrors,
  type PersonData,
  type SetPasswordFields,
  type SignInFields,
  type SignUpFields,
} from "./data";
import { currentAccount, getSnapshot, updateState } from "./store";

// The field messages of a 400 answer, when it carried any.
function fieldsOf<T>(result: ApiResult<unknown>): FieldErrors<T> | null {
  if (result.ok) return null;
  const fields = result.data.fields;
  return typeof fields === "object" && fields !== null ? (fields as FieldErrors<T>) : null;
}

function isAccountAnswer(data: unknown): data is SessionBootstrap & { account: Account } {
  if (typeof data !== "object" || data === null) return false;
  const b = data as SessionBootstrap;
  return typeof b.account === "object" && b.account !== null && typeof b.data === "object" && b.data !== null;
}

// --- account edits (PATCH /api/account) -----------------------------------

export type AccountPatch = {
  company?: Partial<CompanyData>;
  person?: Partial<PersonData>;
  welcomed?: true;
  logo?: string | null;
};

// One queue for every account edit of this tab (here and the profile
// page), so two quick edits reach the server in the order they were made.
// A refused edit refreshes the session (push.ts); offline keeps the local
// state.
const accountEdits = createPushQueue();

export function pushAccountPatch(patch: AccountPatch) {
  accountEdits.push(() => api("/api/account", { method: "PATCH", body: patch }));
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
  const result = await api<SessionBootstrap>("/api/auth/sign-in", { body: { login, password } });
  if (result.ok && isAccountAnswer(result.data)) {
    // The sign-in ended whatever session this browser still had, so an
    // unconfirmed sign-out has nothing left to do.
    setSignOutPending(false);
    applyBootstrap(result.data);
    return { ok: true, account: result.data.account };
  }
  const serverFields = !result.ok && result.error === "empty" ? fieldsOf<SignInFields>(result) : null;
  if (serverFields) return { ok: false, error: "empty", fields: serverFields };
  // Wrong login or password, too many attempts, offline: the same alert.
  return { ok: false, error: "invalid" };
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
  const result = await api<SessionBootstrap>("/api/auth/sign-up", { body: input });
  if (result.ok && isAccountAnswer(result.data)) {
    setSignOutPending(false);
    applyBootstrap(result.data);
    return { ok: true, account: result.data.account };
  }
  const serverFields = !result.ok && result.error === "fields" ? fieldsOf<SignUpFields>(result) : null;
  if (serverFields) return { ok: false, error: "fields", fields: serverFields };
  // Taken login, too many sign-ups, offline: the "request failed" alert.
  return { ok: false, error: "exists" };
}

// --- password reset (5420:38196) -----------------------------------------

export type ResetLinkResult =
  | { ok: true; resendAfter: number }
  | { ok: false; error: "empty"; message: string };

// «Відновити пароль». The answer is the same whether or not the login
// exists (no account probing). In test mode (BINAR_TEST_MODE=1 under next
// dev) the server also returns the link's token for a known login; it
// becomes the pending reset, which the dev link `/?reset=demo` then
// redeems. Anywhere else no token ever arrives, so nothing is kept.
export async function sendResetLink(login: string): Promise<ResetLinkResult> {
  if (!login.trim()) return { ok: false, error: "empty", message: COPY.errors.login };
  const result = await api<{ ok: true; resendAfter?: unknown; devToken?: unknown }>("/api/auth/reset/request", {
    body: { login },
  });
  if (result.ok) {
    const devToken = typeof result.data?.devToken === "string" ? result.data.devToken : "";
    updateState((prev) => ({
      ...prev,
      reset: devToken ? { token: devToken, login: normalizeLogin(login) } : null,
    }));
    const resendAfter = result.data?.resendAfter;
    return { ok: true, resendAfter: typeof resendAfter === "number" ? resendAfter : RESET_RESEND_SECONDS };
  }
  if (result.error === "empty") {
    const message = typeof result.data.message === "string" ? result.data.message : COPY.errors.login;
    return { ok: false, error: "empty", message };
  }
  // Too many requests or offline: the screen has no failure state, and
  // "link sent" is what every login gets.
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
  // `/?reset=demo` stands for the token this browser was handed outside
  // production; a real link carries its own token.
  const pending = getSnapshot().reset;
  const sent = token === DEMO_RESET_TOKEN && pending ? pending.token : token;
  const result = await api<{ ok: true; login?: unknown }>("/api/auth/reset/confirm", {
    body: { token: sent, password, repeat },
  });
  if (result.ok && typeof result.data?.login === "string") {
    updateState((prev) => ({ ...prev, reset: null }));
    // The reset ended every session of the account; if this browser held
    // one, let the server say so.
    if (hasSessionHint()) void refreshSession();
    return { ok: true, login: result.data.login };
  }
  const serverFields = !result.ok && result.error === "fields" ? fieldsOf<SetPasswordFields>(result) : null;
  if (serverFields) return { ok: false, error: "fields", fields: serverFields };
  return { ok: false, error: "token" };
}

// --- session -------------------------------------------------------------

// A sign-out the server has not confirmed yet (offline, a failed request).
// The httpOnly session cookie can only be removed by the server, so until
// it answers the browser keeps a note: the readable hint cookie is dropped
// right away (without it the browser counts as signed out, and the boot
// skips the session request), and the boot effect sends the sign-out again.
// A user who signed out on a shared computer is not signed back in by the
// cookie that was left behind.
const SIGN_OUT_PENDING_KEY = "binar.auth.signout.v1";

function setSignOutPending(pending: boolean) {
  try {
    if (pending) window.localStorage.setItem(SIGN_OUT_PENDING_KEY, "1");
    else window.localStorage.removeItem(SIGN_OUT_PENDING_KEY);
  } catch {
    // Storage unavailable: the hint cookie below still signs the tab out.
  }
}

function isSignOutPending(): boolean {
  try {
    return window.localStorage.getItem(SIGN_OUT_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

function dropSessionHint() {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_HINT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
}

function sendSignOut() {
  // keepalive: the request survives a navigation right after the click.
  void api("/api/auth/sign-out", { method: "POST", keepalive: true }).then((result) => {
    if (result.ok) setSignOutPending(false);
  });
}

export function signOut() {
  setSignOutPending(true);
  dropLocalSession();
  dropSessionHint();
  // A cart change made just before the click is still on its way (the cart
  // store flushes it when the account goes away). The session must outlive
  // that request, or the server refuses the save: wait until the cart's
  // requests are answered, 1.5 s at most. A sign-in made in the meantime
  // clears the pending flag, and then nothing is sent: it must not end the
  // new session.
  const settled = new Promise<void>((resolve) => setTimeout(resolve, 0)).then(cartSavesSettled);
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 1500));
  void Promise.race([settled, timeout]).then(() => {
    if (isSignOutPending()) sendSignOut();
  });
}

// Boot / tab focus: sends an unconfirmed sign-out again. True when one was
// pending (the hint is gone again too, so the caller sees a signed-out
// browser).
export function retryPendingSignOut(): boolean {
  if (!isSignOutPending()) return false;
  dropSessionHint();
  sendSignOut();
  return true;
}

export function markWelcomed() {
  let changed = false;
  updateState((prev) => {
    const me = currentAccount(prev);
    if (!me) return prev;
    changed = !me.welcomed;
    return {
      ...prev,
      accounts: prev.accounts.map((a) => (a.id === me.id ? { ...a, welcomed: true } : a)),
    };
  });
  if (changed) pushAccountPatch({ welcomed: true });
}

export function saveLogo(dataUrl: string) {
  let changed = false;
  updateState((prev) => {
    const me = currentAccount(prev);
    if (!me) return prev;
    changed = true;
    return {
      ...prev,
      accounts: prev.accounts.map((a) => (a.id === me.id ? { ...a, logo: dataUrl } : a)),
    };
  });
  if (changed) pushAccountPatch({ logo: dataUrl });
}
