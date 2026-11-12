import "server-only";
import { createHash } from "node:crypto";
import { MongoServerError } from "mongodb";
import {
  EMPTY_COMPANY,
  isEmailLike,
  normalizeLogin,
  type Account,
  type CompanyData,
  type PersonData,
  type SignUpFields,
} from "@/components/auth/data";
import { hashPassword } from "../auth/password";
import { collection, type ClientDoc, type PasswordResetDoc, type UserDoc } from "../db/collections";
import { newAccountId } from "../ids";
import { enqueueMessage } from "../outbox";
import { patchClient } from "./clients";

// Accounts: lookups by login, sign-up, password changes, profile patches.
// Every function takes values that already went through a zod schema, so
// nothing below puts a raw request value into a filter.

// The account as the UI knows it. `passwordHash` is always "": the field
// only survives because the client type and the pre-paint gate script check
// that it is a string. A partner's company is the company document.
export function toAccount(user: UserDoc, client: ClientDoc | null): Account {
  const company =
    user.type === "b2b" && client
      ? { name: client.name, edrpou: client.edrpou, region: client.region, city: client.city }
      : user.company;
  return {
    id: user._id,
    type: user.type,
    phone: user.phone,
    login: user.login,
    passwordHash: "",
    company,
    person: user.person,
    createdAt: user.createdAt.toISOString(),
    welcomed: user.welcomed,
    ...(user.logo ? { logo: user.logo } : {}),
  };
}

export async function accountOf(user: UserDoc): Promise<Account> {
  if (!user.clientId) return toAccount(user, null);
  const clients = await collection("clients");
  return toAccount(user, await clients.findOne({ _id: user.clientId }));
}

// --- login keys --------------------------------------------------------

// Every identifier the account signs in with, stored the way
// normalizeLogin stores a typed login: the login itself, the top-level
// phone and the person's e-mail (person.phone is contact data only, as in
// the browser mock). Distinct and non-empty; the unique multikey index on
// `loginKeys` keeps them unique across all accounts.
export function loginKeysOf(user: Pick<UserDoc, "login" | "phone" | "person">): string[] {
  const keys = [user.login, user.phone, user.person.email.toLowerCase()].map((value) => normalizeLogin(value));
  return [...new Set(keys.filter(Boolean))];
}

// MongoDB answers a unique index violation with code 11000.
export function isDuplicateKey(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

// The account a typed login opens (any of its login keys), or null. The
// caller decides what an inactive account means.
export async function findUserByLogin(rawLogin: string): Promise<UserDoc | null> {
  const key = normalizeLogin(rawLogin);
  if (!key) return null;
  const users = await collection("users");
  return users.findOne({ loginKeys: key });
}

export async function findUser(userId: string): Promise<UserDoc | null> {
  const users = await collection("users");
  return users.findOne({ _id: userId });
}

// True when one of `keys` already opens some account.
export async function loginTaken(keys: string[]): Promise<boolean> {
  const users = await collection("users");
  return (await users.countDocuments({ loginKeys: { $in: keys } }, { limit: 1 })) > 0;
}

// Inserts a complete user document; "exists" when a login key is taken
// (also when two sign-ups race for the same e-mail).
export async function insertUser(doc: UserDoc): Promise<UserDoc | "exists"> {
  const users = await collection("users");
  try {
    await users.insertOne(doc);
    return doc;
  } catch (error) {
    if (isDuplicateKey(error)) return "exists";
    throw error;
  }
}

// --- sign-up -----------------------------------------------------------

// A retail customer from the site's sign-up form, exactly the record the
// browser mock created (auth/api.ts signUp before the database): the login
// is the normalized e-mail or phone, the name reads "Prizvyshche Imia".
// `fields` must have passed validateSignUp.
export async function createCustomer(fields: SignUpFields): Promise<UserDoc | "exists"> {
  const login = normalizeLogin(fields.login);
  const email = isEmailLike(login) ? login : "";
  const phone = email ? "" : login;
  const person: PersonData = {
    fullName: `${fields.lastName.trim()} ${fields.firstName.trim()}`,
    role: "",
    position: "",
    phone,
    email,
  };
  const keys = loginKeysOf({ login, phone, person });
  // Cheap refusal before the hash is computed; the unique index still
  // decides a race.
  if (await loginTaken(keys)) return "exists";

  const now = new Date();
  return insertUser({
    _id: newAccountId(),
    type: "b2c",
    login,
    phone,
    loginKeys: keys,
    passwordHash: await hashPassword(fields.password),
    person,
    company: { ...EMPTY_COMPANY },
    clientId: null,
    role: null,
    isActive: true,
    // The welcome modal is the partner's first login; retail customers
    // never see it.
    welcomed: true,
    logo: null,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

// --- passwords and sign-in bookkeeping -----------------------------------

// Stores a new password (hashed with the current parameters). Every unused
// reset link of the account dies with the old password, so a link asked for
// before the change cannot overwrite the new one.
export async function setPassword(userId: string, password: string): Promise<void> {
  const users = await collection("users");
  const passwordHash = await hashPassword(password);
  await users.updateOne({ _id: userId }, { $set: { passwordHash, updatedAt: new Date() } });
  await dropLiveResets(userId);
}

// A successful sign-in: lastLoginAt, plus the re-hashed password when the
// stored hash was made with weaker parameters.
export async function recordSignIn(userId: string, rehashed: string | null): Promise<void> {
  const users = await collection("users");
  const now = new Date();
  await users.updateOne(
    { _id: userId },
    { $set: rehashed ? { lastLoginAt: now, passwordHash: rehashed, updatedAt: now } : { lastLoginAt: now } },
  );
}

// --- password reset ----------------------------------------------------

// A reset link lives an hour and opens once.
const RESET_TTL_MS = 60 * 60 * 1000;

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Removes every unused reset link of `userId` and the queued notices that
// announced them.
async function dropLiveResets(userId: string): Promise<void> {
  const resets = await collection("passwordResets");
  await resets.deleteMany({ userId, usedAt: null });
  const outbox = await collection("outbox");
  await outbox.deleteMany({ kind: "password-reset", "payload.userId": userId, sentAt: null });
}

// Stores a reset for `user` under the SHA-256 of `token` and answers when
// the link expires.
//
// The token itself is stored nowhere: the reset row keeps only its hash, so
// a database dump or a read-only connection opens no account. The caller
// (the reset request route) mails the link from the token right away
// through sendNow (src/server/mail/deliver.ts), whose stored copy names the
// account only and expires with the link.
//
// One live link per account (partial unique index `userId_live_unique` on
// unused rows): older unused links are removed first, and when a parallel
// request inserted its row in between, the insert is retried after removing
// that one, so the newest request wins and no second token stays live.
export async function createPasswordReset(user: UserDoc, token: string): Promise<{ expiresAt: Date }> {
  const resets = await collection("passwordResets");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + RESET_TTL_MS);
  for (let attempt = 1; ; attempt++) {
    await dropLiveResets(user._id);
    try {
      await resets.insertOne({ _id: tokenHash(token), userId: user._id, login: user.login, createdAt: now, expiresAt, usedAt: null });
      break;
    } catch (error) {
      if (!isDuplicateKey(error) || attempt >= 5) throw error;
    }
  }
  return { expiresAt };
}

// Marks the reset of `token` used and returns it, or null when the token is
// unknown, used or expired. One atomic update: of two parallel requests with
// the same token only one gets the row. A redeemed link also ends every other
// unused link of the account and its pending notice.
export async function redeemPasswordReset(token: string): Promise<PasswordResetDoc | null> {
  const resets = await collection("passwordResets");
  const now = new Date();
  const reset = await resets.findOneAndUpdate(
    { _id: tokenHash(token), usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
    { returnDocument: "after" },
  );
  if (reset) await dropLiveResets(reset.userId);
  return reset;
}

// --- profile patches ---------------------------------------------------

export type AccountPatch = {
  company?: Partial<CompanyData>;
  person?: Partial<PersonData>;
  welcomed?: true;
  logo?: string | null;
};

// The new (lower-cased) e-mail when `patch` changes a sign-in identifier of
// `user`, else null. Test accounts (POST /api/dev/session) keep their
// placeholder key: they share the demo accounts' e-mails and cannot sign in
// with a password, so their e-mail is contact data only.
export function emailChangeOf(user: UserDoc, patch: AccountPatch): string | null {
  const email = patch.person?.email?.toLowerCase();
  if (email === undefined || user.test || email === user.person.email.toLowerCase()) return null;
  return email;
}

// The company card of a partner may be edited by the company's admin only.
export function mayEditCompany(user: UserDoc): boolean {
  return user.type === "b2b" && Boolean(user.clientId) && user.role === "b2b_admin";
}

// Tells the previous address (or, without one, the phone) that the account's
// e-mail changed, so a hijacked session cannot quietly move the account to
// an address of its own. Queued like every message (nothing is sent yet).
export async function noteEmailChange(user: UserDoc, email: string): Promise<void> {
  const previous = user.person.email.toLowerCase();
  await enqueueMessage("email-changed", previous || user.phone || user.login, {
    login: user.login,
    userId: user._id,
    from: previous,
    to: email,
  });
}

// Applies a validated PATCH /api/account body. The company of a partner
// lives in its company document (written for the company's admin only); a
// retail customer's `company` is ignored. An e-mail change recomputes the
// login keys; "exists" when the new e-mail already opens another account
// (nothing is written then).
export async function patchAccount(user: UserDoc, patch: AccountPatch): Promise<UserDoc | "exists"> {
  const users = await collection("users");
  const now = new Date();
  const set: Record<string, unknown> = {};

  if (patch.person) {
    for (const [field, value] of Object.entries(patch.person) as [keyof PersonData, string | undefined][]) {
      if (value === undefined) continue;
      set[`person.${field}`] = field === "email" ? value.toLowerCase() : value;
    }
    const email = emailChangeOf(user, patch);
    if (email !== null) {
      set.loginKeys = loginKeysOf({ login: user.login, phone: user.phone, person: { ...user.person, email } });
    }
  }
  if (patch.welcomed) set.welcomed = true;
  if (patch.logo !== undefined) set.logo = patch.logo;

  let next: UserDoc | null = user;
  if (Object.keys(set).length > 0) {
    set.updatedAt = now;
    try {
      next = await users.findOneAndUpdate({ _id: user._id }, { $set: set }, { returnDocument: "after" });
    } catch (error) {
      if (isDuplicateKey(error)) return "exists";
      throw error;
    }
  }
  if (!next) throw new Error("account vanished during an update");

  if (patch.company && next.clientId && mayEditCompany(next)) {
    await patchClient(next.clientId, patch.company);
  }
  return next;
}
