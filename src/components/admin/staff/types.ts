// The contract of the staff, roles and own-account routes of the panel
// (/api/admin/staff, /api/admin/roles, /api/admin/account). Shared by the
// routes, their repos and the screens. Types and plain constants only: no
// "use client", no server import.
//
// Dates are ISO strings: the routes convert them before answering, so
// these types describe exactly what the browser receives.

import type { PERMISSION_GROUPS, StaffMe } from "../lib/permissions";

// --- limits (the routes validate with the same numbers) ---------------------

export const STAFF_NAME_MAX = 200;
export const STAFF_EMAIL_MAX = 254;
export const ROLE_NAME_MAX = 80;
export const ROLE_DESCRIPTION_MAX = 300;
// A session is named in the browser by the first characters of its stored
// hash: enough to tell sessions apart, useless as a cookie.
export const SESSION_ID_LENGTH = 12;
export const STAFF_JOURNAL_LIMIT = 20;
export const ACCOUNT_RECENT_LIMIT = 10;
// A generated password (a new account or a reset) opens the account only
// this long after it was issued. After that the sign-in is refused like
// any wrong password, and the account needs "Скинути пароль" again: an old
// invitation or reset mail read later by someone else opens nothing.
export const GENERATED_PASSWORD_TTL_HOURS = 72;

// --- staff accounts ----------------------------------------------------------

// One line of GET /api/admin/staff.
export type StaffRow = {
  id: string;
  email: string;
  name: string;
  roleId: string;
  // The role's name; the id itself when the role no longer exists.
  roleName: string;
  isActive: boolean;
  // A generated password that was not replaced yet.
  mustChangePassword: boolean;
  // When that generated password stops opening the account
  // (GENERATED_PASSWORD_TTL_HOURS after it was issued); null when the
  // person has their own password, or for a password issued before the
  // panel recorded the time.
  passwordExpiresAt: string | null;
  // That moment had passed when the answer was made: the person cannot
  // sign in until the password is reset again.
  passwordExpired: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  // Live (not expired) sessions.
  sessions: number;
  // An account of the audit scripts.
  test: boolean;
};

// GET /api/admin/staff?q=&role=<roleId>&active=true|false&sort=name|-name|email|createdAt|lastLoginAt&page=&limit=
// -> { ok: true, items: StaffRow[], total, page, limit }. Default sort:
// name; default limit 100 (the whole team on one page).
export type StaffListAnswer = { items: StaffRow[]; total: number; page: number; limit: number };

export const STAFF_SORTS = ["name", "email", "createdAt", "lastLoginAt"] as const;

// GET /api/admin/staff/options (any signed-in member of staff)
// -> { ok: true, items: StaffOption[] }: the ACTIVE staff, by name, for
// "assign to" selects on other screens.
export type StaffOption = { id: string; name: string; roleName: string };
export type StaffOptionsAnswer = { items: StaffOption[] };

// One sign-in of a member of staff (a browser).
export type StaffSessionDto = {
  // The first SESSION_ID_LENGTH characters of the stored hash; the
  // sessionId of the DELETE routes.
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  // "Remember me": a 30-day session instead of a 12-hour one.
  remember: boolean;
  userAgent: string | null;
  ip: string | null;
  // The session of the request that asked.
  current: boolean;
};

// One line of the journal as these screens show it.
export type StaffJournalLine = {
  id: string;
  at: string;
  actor: { id: string; name: string; kind: "staff" | "system" | "integration" | "customer" };
  action: string;
  entity: { type: string; id: string; label: string } | null;
  summary: string;
  ip: string | null;
  // Why a refused sign-in (staff.sign-in-refused) was refused: "password",
  // "blocked", "role", "expired" (a generated password past
  // GENERATED_PASSWORD_TTL_HOURS) or "rate" (too many attempts on the
  // account: sign-in paused for the window); null for every other line.
  reason: string | null;
};

// GET /api/admin/staff/[id] -> { ok: true, ...StaffDetailAnswer }.
// `journal`: the last STAFF_JOURNAL_LIMIT lines the person wrote or that
// name their account, newest first.
export type StaffDetailAnswer = {
  staff: StaffRow;
  sessions: StaffSessionDto[];
  journal: StaffJournalLine[];
};

// "Надіслати доступ на e-mail" (POST /staff and POST /staff/[id]/password
// with notify: true): whether the mail service took the message with the
// password. `mailError` is a code of MAIL_ERROR_LABELS
// (src/components/admin/mail/types.ts) or "http-<status>: <text>". Absent
// when notify was not asked for.
export type StaffAccessMailAnswer = { mailed?: boolean; mailError?: string };

// POST /api/admin/staff
export type StaffCreateBody = { email: string; name: string; roleId: string; notify?: boolean };
// -> 201 { ok: true, staff, password }. `password` is generated and leaves
// the server only this once; the person must replace it on the first
// sign-in. Refusals: 400 "fields" { fields: { email: "invalid" } |
// { roleId: "unknown" } }, 403 "owner-only", 409 "exists" (e-mail taken).
export type StaffCreateAnswer = { staff: StaffRow; password: string } & StaffAccessMailAnswer;

// PATCH /api/admin/staff/[id] (at least one field)
export type StaffPatchBody = { name?: string; roleId?: string; isActive?: boolean };
// -> { ok: true, staff }. Blocking ends every session of the person.
// Refusals: 400 "fields" { fields: { roleId: "unknown" } }, 403
// "owner-only", 409 "self", 409 "last-owner".
export type StaffPatchAnswer = { staff: StaffRow };

// POST /api/admin/staff/[id]/password { notify? } -> { ok: true, password }
// (every session ended, the person must replace the password). 409 "self":
// the own password is changed through POST /api/admin/auth/password.
export type StaffPasswordBody = { notify?: boolean };
export type StaffPasswordAnswer = { password: string } & StaffAccessMailAnswer;

// POST /api/admin/staff/[id]/sign-out -> { ok: true, ended } (for one's own
// account the current session is spared).
// POST /api/admin/account/sessions/sign-out-others -> { ok: true, ended }.
export type SignOutAnswer = { ended: number };

// DELETE /api/admin/staff/[id] -> { ok: true }; 409 "self", 409 "last-owner".
// DELETE /api/admin/staff/[id]/sessions/[sessionId] -> { ok: true }; 409 "current".

// --- roles -------------------------------------------------------------------

export type RoleRow = {
  id: string;
  name: string;
  description: string;
  // For the owner role: every permission, whatever its document says.
  permissions: string[];
  // A built-in role: may be edited (except the owner), never deleted.
  system: boolean;
  // The owner role: neither edited nor deleted.
  locked: boolean;
  // Members of staff with the role (blocked ones included).
  members: number;
};

// GET /api/admin/roles -> { ok: true, items, groups }: built-in roles first
// (in their fixed order), then the others by name; `groups` is the
// catalogue of permissions for the matrix.
export type RolesAnswer = { items: RoleRow[]; groups: typeof PERMISSION_GROUPS };

// POST /api/admin/roles -> 201 { ok: true, role }. The id is made from the
// name (transliterated, unique). Unknown permission keys are dropped.
// Refusals: 409 "exists" (a role with that name).
export type RoleCreateBody = { name: string; description?: string; permissions: string[] };

// PATCH /api/admin/roles/[id] (at least one field) -> { ok: true, role }.
// Refusals: 409 "locked" (the owner role), 409 "exists" (the name).
export type RolePatchBody = { name?: string; description?: string; permissions?: string[] };
export type RoleAnswer = { role: RoleRow };

// DELETE /api/admin/roles/[id] -> { ok: true }. Refusals: 409 "locked"
// (built-in roles), 409 "in-use" { members } (somebody has the role).

// --- the signed-in person ----------------------------------------------------

export type AccountMe = StaffMe & { lastLoginAt: string | null; createdAt: string };

// GET /api/admin/account (also before the first password change)
// -> { ok: true, me, sessions, sessionsTotal, recent }: `recent` is the
// last ACCOUNT_RECENT_LIMIT sign-ins and refused sign-in attempts;
// `sessions` stops at the 100 most recently used (plus this one), and
// `sessionsTotal` counts every live session.
export type AccountAnswer = { me: AccountMe; sessions: StaffSessionDto[]; sessionsTotal: number; recent: StaffJournalLine[] };

// PATCH /api/admin/account -> { ok: true, me }.
export type AccountPatchBody = { name: string };
export type AccountPatchAnswer = { me: AccountMe };

// DELETE /api/admin/account/sessions/[sessionId] -> { ok: true };
// 409 "current" for the session of the request itself (that one ends with
// POST /api/admin/auth/sign-out).

// Wording of the refusals these routes add to the common ones; pass it as
// `own` to errorMessage().
export const STAFF_ERROR_MESSAGES: Record<string, string> = {
  self: "Цю дію не можна виконати над власним обліковим записом.",
  "last-owner": "Це останній активний власник: панель не може лишитися без власника.",
  "owner-only": "Керувати власниками і надавати роль власника може лише власник.",
  locked: "Цю роль не можна змінити або видалити.",
  "in-use": "Роль має співробітників. Спершу призначте їм іншу роль.",
  current: "Це поточна сесія. Щоб завершити її, вийдіть з панелі.",
};

// --- limits of a non-owner (components/admin/staff/rules.ts) ----------------

// 403 "forbidden" answers of these routes carry { reason } when the refusal
// comes from the limits of a non-owner who holds staff.manage:
// - "own-role": PATCH / DELETE /api/admin/roles/[id] on the role the actor
//   holds;
// - "beyond-own": POST /api/admin/roles, PATCH / DELETE /api/admin/roles/[id]
//   with permissions the actor does not hold (before or after the change);
//   POST /api/admin/staff and PATCH /api/admin/staff/[id] giving such a role;
//   any change to an account whose role has more than the actor (PATCH,
//   DELETE, /password, /sign-out, /sessions/[sessionId]); such an account is
//   still read with GET /api/admin/staff/[id].
export type { StaffRefusalReason } from "./rules";

export const STAFF_REFUSAL_MESSAGES: Record<"own-role" | "beyond-own", string> = {
  "own-role": "Свою роль змінити чи видалити не можна: це робить власник або інший співробітник, який керує командою.",
  "beyond-own": "Тут є права, яких немає у вашої ролі. Це може зробити лише власник.",
};
