// The contract of the customer account routes of the panel
// (/api/admin/customers/**). Shared by the routes, their repo
// (src/server/admin/repos/customers.ts) and the screens. Types and plain
// constants only: no "use client", no server import.
//
// Dates are ISO strings: the routes convert them before answering, so these
// types describe exactly what the browser receives. Every answer also
// carries `ok: true` (left out of the types below).
//
// A customer account is a `users` document: "b2c" = a retail customer of
// the shop, "b2b" = a buyer of a partner company (`clients` document). The
// login, the top-level phone and person.email share ONE namespace across
// all accounts (the unique index users.loginKeys): a value that already
// opens another account is refused with 409 "exists".

import type { AccountType, PersonData } from "@/components/auth/data";

// --- vocabularies ------------------------------------------------------------

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "b2b", label: "Партнер (B2B)" },
  { value: "b2c", label: "Роздрібний покупець" },
];

// What a partner's buyer may do in the cabinet. Only the company card and
// the profile lists (counterparties, employees) are limited to the admin
// today; orders, returns and documents are open to both.
export type AccessRole = "b2b_admin" | "b2b_manager";

export const ACCESS_ROLES: { value: AccessRole; label: string; hint: string }[] = [
  {
    value: "b2b_admin",
    label: "Адміністратор компанії",
    hint: "Замовляє, редагує картку компанії, контрагентів і співробітників у кабінеті",
  },
  {
    value: "b2b_manager",
    label: "Менеджер компанії",
    hint: "Замовляє та бачить документи, але не змінює профіль компанії",
  },
];

// The fields the list may be sorted by ("-createdAt" = newest first, the
// default).
export const CUSTOMER_SORTS = ["createdAt", "lastLoginAt", "person.fullName"] as const;
export type CustomerSort = (typeof CUSTOMER_SORTS)[number];

// Limits the routes validate with (the storefront's own numbers).
export const CUSTOMER_PASSWORD_MIN = 8;
export const CUSTOMER_PASSWORD_MAX = 256;
export const CUSTOMER_NAME_MAX = 200;
export const CUSTOMER_POSITION_MAX = 200;
export const CUSTOMER_EMAIL_MAX = 254;
// A session is named in the browser by the first characters of its stored
// hash: enough to tell sessions apart, useless as a cookie.
export const CUSTOMER_SESSION_ID_LENGTH = 12;
export const CUSTOMER_RECENT_ORDERS = 10;

// Refusals of these routes and the sentence the screen shows for each
// (pass as `own` to errorMessage). "fields" comes with
// `fields: { <field>: <reason> }`; see FIELD_REASONS.
export const CUSTOMER_ERRORS: Record<string, string> = {
  exists: "Цей логін, телефон або e-mail уже відкриває інший акаунт.",
  "has-orders": "Акаунт має замовлення або повернення, тому його не можна видалити. Заблокуйте його.",
  seed: "Це демо-акаунт: його не можна видалити.",
};

// The reasons a "fields" refusal names, per field key. Field keys are the
// body paths: "login", "email", "phone", "password", "company",
// "company.clientId", "company.name", "company.edrpou", "role", "clientId",
// "person.email", "person.phone".
export const FIELD_REASONS: Record<string, string> = {
  invalid: "Неправильний формат",
  required: "Обов'язкове поле",
  short: `Щонайменше ${CUSTOMER_PASSWORD_MIN} символів`,
  "not-found": "Не знайдено",
  b2c: "Недоступно для роздрібного покупця",
};

// --- shared pieces -------------------------------------------------------------

export type CompanyRef = { id: string; name: string };

// One order in a short list (the account card, the company card).
export type OrderRef = {
  id: string;
  number: string;
  // "YYYY-MM-DD", the business day of the order.
  date: string;
  // An OrderStatusKey ("new", "inProgress", ...).
  status: string;
  total: number;
  channel: "b2b" | "retail";
};

// --- list ----------------------------------------------------------------------

// One line of GET /api/admin/customers.
export type CustomerRow = {
  id: string;
  type: AccountType;
  // person.fullName.
  name: string;
  login: string;
  // person.email ("" = none).
  email: string;
  // The contact phone (person.phone, else the sign-in phone; "" = none),
  // national digits "0671234567".
  phone: string;
  // The partner company (b2b), null for a retail customer (and for a b2b
  // account whose company no longer exists: then `company` is
  // { id, name: "" }).
  company: CompanyRef | null;
  role: AccessRole | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  // Written by `npm run db:seed` (the demo accounts): a reseed overwrites
  // staff edits.
  seed: boolean;
  // Made by the test-mode route POST /api/dev/session.
  test: boolean;
};

// How many accounts each tab of the list holds, under the same search and
// company as the page asked for (the type and the state filters are left
// out, so every tab shows its own number).
export type CustomerCounts = { all: number; b2b: number; b2c: number; blocked: number };

// GET /api/admin/customers?q=&type=b2b|b2c&active=true|false&clientId=<id>
//   &sort=createdAt|-createdAt|lastLoginAt|-lastLoginAt|person.fullName|-person.fullName
//   &page=&limit=
// -> { ok: true, items: CustomerRow[], total, page, limit, counts }. `q`
// matches the name, the login, the e-mail and the phones (digits of a typed
// phone number too). Default sort: -createdAt; default limit 20, max 100.
// The name sort follows the Ukrainian alphabet (case ignored).
export type CustomersPage = { items: CustomerRow[]; total: number; page: number; limit: number; counts: CustomerCounts };

// --- card ----------------------------------------------------------------------

// A live sign-in of the account (one browser).
export type CustomerSession = {
  // The first CUSTOMER_SESSION_ID_LENGTH characters of the stored hash;
  // the sessionId of DELETE .../sessions/<sessionId>.
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  userAgent: string | null;
};

// The company of a partner account, as the account card shows it.
export type CustomerCompany = {
  id: string;
  name: string;
  edrpou: string;
  region: string;
  city: string;
  discountPercent: number;
  isActive: boolean;
};

// GET /api/admin/customers/<id> -> { ok: true, customer: CustomerDetail }.
// Never carries the password hash.
export type CustomerDetail = CustomerRow & {
  // Every identifier that signs in to this account (normalized).
  loginKeys: string[];
  person: PersonData;
  // The cabinet's "Вітаємо на платформі" modal was shown (false = it shows
  // at the next sign-in).
  welcomed: boolean;
  // The company logo the partner uploaded (a data: URL), or null.
  logo: string | null;
  updatedAt: string;
  company: CustomerCompany | null;
  // Live sessions, the most recently used first.
  sessions: CustomerSession[];
  // The newest CUSTOMER_RECENT_ORDERS orders placed by this account, and
  // how many there are in all.
  orders: OrderRef[];
  ordersCount: number;
  // Lines in the stored cart and in the partner's assortment list.
  cartLines: number;
  assortmentLines: number;
  // Ids of the form submissions (leads) sent while signed in, newest first.
  leads: string[];
  // The newest CUSTOMER_RECENT_LEADS of them, with what the card shows.
  leadRefs: CustomerLeadRef[];
};

export const CUSTOMER_RECENT_LEADS = 10;

// One form submission in the account card's short list.
export type CustomerLeadRef = {
  id: string;
  kind: "quiz" | "star-checklist" | "partner-contact";
  status: "new" | "in_progress" | "done" | "spam";
  createdAt: string;
};

export type CustomerAnswer = { customer: CustomerDetail };

// --- changes -------------------------------------------------------------------

// POST /api/admin/customers [customers.edit]
// -> 201 { ok: true, customer: CustomerDetail, password?: string }.
// `password` is in the answer ONLY when the server generated it (the body
// had none): show it once, it is stored nowhere in plain text.
// Rules: `login` is a valid e-mail or a Ukrainian mobile number; a b2b
// account needs `company` (an existing one by id, or a new one created
// with it and removed again when the account cannot be created); a b2c
// account takes neither `company` nor `role`. `role` defaults to
// "b2b_admin". `position` is kept for b2b accounts only. With an e-mail
// login, `phone` becomes a sign-in identifier too.
// Errors: 400 "bad-request" (shape), 400 "fields", 409 "exists".
export type NewCompanyInput = {
  name: string;
  edrpou?: string;
  region?: string;
  city?: string;
  // 0 <= d < 100; default DEFAULT_DISCOUNT_PERCENT
  // (src/components/admin/companies/types.ts).
  discountPercent?: number;
};

export type CreateCustomerBody = {
  type: AccountType;
  login: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  password?: string;
  company?: { clientId: string } | NewCompanyInput;
  role?: AccessRole;
};

export type CreateCustomerAnswer = { customer: CustomerDetail; password?: string };

// PATCH /api/admin/customers/<id> [customers.edit] -> { ok: true, customer }.
// - isActive: false blocks the account and ends every session at once.
// - role, clientId: b2b accounts only (400 "fields" otherwise); clientId
//   moves the buyer to another existing company.
// - person.email: "" or an e-mail; a new one becomes a sign-in identifier
//   (409 "exists" when it opens another account) and the previous address
//   is told about the change (outbox "email-changed").
// - person.phone: "" or a Ukrainian number (contact only, not a login).
// - welcomed: false shows the welcome modal again at the next sign-in.
export type PatchCustomerBody = {
  isActive?: boolean;
  role?: AccessRole;
  clientId?: string;
  person?: { fullName?: string; position?: string; phone?: string; email?: string };
  welcomed?: boolean;
};

// POST /api/admin/customers/<id>/password [customers.edit] { password? }
// -> { ok: true, password?: string } (present only when generated). Ends
// every session of the account and every unused reset link.
export type SetCustomerPasswordBody = { password?: string };
export type SetCustomerPasswordAnswer = { password?: string };

// POST /api/admin/customers/<id>/sign-out [customers.edit] -> { ok: true, ended }
// DELETE /api/admin/customers/<id>/sessions/<sessionId> [customers.edit] -> { ok: true, ended }
export type SignOutAnswer = { ended: number };

// DELETE /api/admin/customers/<id> [customers.edit] -> { ok: true, id }.
// 409 "has-orders" (offer blocking instead), 409 "seed" (demo accounts).
// Removes the account with its sessions, cart, assortment, password
// resets and unsent notices; orders and form submissions stay.
export type DeleteCustomerAnswer = { id: string };
