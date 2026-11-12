// The contract of the partner company routes of the panel
// (/api/admin/companies/**): the company card, its counterparties with
// their contracts, its employees, notes and the settlements ledger. Shared
// by the routes, their repo (src/server/admin/repos/companies.ts) and the
// screens. Types and plain constants only: no "use client", no server
// import.
//
// Dates are ISO strings; every answer also carries `ok: true` (left out of
// the types below).
//
// A company is a `clients` document. Its buyers are `users` with this
// `clientId` (CustomerRow, src/components/admin/customers/types.ts).

import type { ContractFile, ContractStatus, CounterpartyStatus, EmployeeStatus } from "@/components/platform/profile/data";
import type { CustomerRow, OrderRef } from "../customers/types";

// --- vocabularies ------------------------------------------------------------

// The discount a company made in the panel starts with when the body
// names none: no discount. (`npm run user:create` keeps its own 8.4 demo
// default; the panel's form always sends the value explicitly.)
export const DEFAULT_DISCOUNT_PERCENT = 0;

export const COMPANY_SORTS = ["createdAt", "name"] as const;
export type CompanySort = (typeof COMPANY_SORTS)[number];

export const COMPANY_NAME_MAX = 200;
export const COMPANY_REGION_MAX = 64;
export const COMPANY_CITY_MAX = 100;
export const NOTE_MAX = 2000;
export const CREDIT_LIMITS_MAX = 100;
export const COMPANY_RECENT_ORDERS = 10;

export const COUNTERPARTY_STATUSES: { value: CounterpartyStatus; label: string }[] = [
  { value: "active", label: "Активний" },
  { value: "inactive", label: "Не активний" },
  { value: "review", label: "На розгляді" },
];

export const CONTRACT_STATUSES: { value: ContractStatus; label: string }[] = [
  { value: "active", label: "Діє" },
  { value: "completed", label: "Завершений" },
  { value: "review", label: "На розгляді" },
];

export type PaymentTerms = "prepayment" | "deferred" | "schedule";

export const PAYMENT_TERMS: { value: PaymentTerms; label: string }[] = [
  { value: "prepayment", label: "Передоплата" },
  { value: "deferred", label: "Відстрочка платежу" },
  { value: "schedule", label: "За графіком" },
];

export type LedgerDocType = "opening_balance" | "order" | "invoice" | "payment" | "return";

export const LEDGER_DOC_TYPES: { value: LedgerDocType; label: string }[] = [
  { value: "opening_balance", label: "Початковий залишок" },
  { value: "order", label: "Замовлення" },
  { value: "invoice", label: "Видаткова накладна" },
  { value: "payment", label: "Оплата" },
  { value: "return", label: "Повернення" },
];

// Refusals of these routes and the sentence the screen shows for each
// (pass as `own` to errorMessage). "fields" comes with
// `fields: { <field>: <reason> }`: "edrpou" / "code" "invalid",
// "groupId" / "managerId" / "priceTypeId" "not-found", "groupId" "guests",
// "creditLimits" "duplicate".
export const COMPANY_ERRORS: Record<string, string> = {
  exists: "Такий код облікової системи вже має інший запис.",
  "in-use": "Запис використовується (акаунти, замовлення або взаєморозрахунки), тому його не можна видалити.",
  limit: "Досягнуто ліміту записів для цієї компанії.",
  "not-invited": "Запрошення вже прийняте: повторно надіслати не можна.",
  "not-author": "Видалити нотатку може лише той, хто її написав, або власник.",
  seed: "Це демонстраційна компанія сайту: її не можна видалити.",
};

// The sentence under a field for each reason of a "fields" refusal.
export const COMPANY_FIELD_REASONS: Record<string, string> = {
  invalid: "Код має містити 8 цифр (ЄДРПОУ) або 10 цифр (ІПН)",
  "not-found": "Не знайдено: можливо, запис уже видалили",
  guests: "Групу «Гості» не можна призначити компанії",
  duplicate: "Для одного контрагента може бути лише один ліміт",
};

// --- list ----------------------------------------------------------------------

// One line of GET /api/admin/companies.
export type CompanyRow = {
  id: string;
  name: string;
  edrpou: string;
  city: string;
  region: string;
  discountPercent: number;
  // Accounts (users) of the company.
  usersCount: number;
  // Partner orders of the company (every status).
  ordersCount: number;
  // What the company still owes, whole UAH: the cabinet dashboard's
  // "Поточний баланс" (orders not paid and not cancelled, less what was
  // paid; the overdue remainder of a partly paid overdue order).
  openBalance: number;
  // The overdue part of openBalance, whole UAH (the cabinet's
  // "Прострочена ДЗ"); above 0 the list tints the balance.
  overdue: number;
  // customer_groups._id; null = the default group "registered".
  groupId: string | null;
  // The group's name (the default group's when groupId is null; null when
  // the stored group no longer exists).
  groupName: string | null;
  // staff._id of the manager who looks after the company, and the name.
  managerId: string | null;
  managerName: string | null;
  // false = the partner cabinet is switched off.
  isActive: boolean;
  createdAt: string;
  seed: boolean;
  test: boolean;
};

// GET /api/admin/companies?q=&groupId=<id>|registered&managerId=<id>|none
//   &active=true|false&sort=createdAt|-createdAt|name|-name&page=&limit=
// -> { ok: true, items: CompanyRow[], total, page, limit }. `q` matches the
// name and the EDRPOU. Default sort -createdAt, default limit 20, max 100.
// The name sort follows the Ukrainian alphabet (case ignored).
export type CompaniesPage = { items: CompanyRow[]; total: number; page: number; limit: number };

// --- card ----------------------------------------------------------------------

export type CreditLimit = { counterparty: string; limit: number };

export type StaffNoteDto = { id: string; at: string; by: { id: string; name: string }; text: string };

// A contract of a counterparty: the cabinet's tile plus what the ERP knows
// (null = not known).
export type ContractDto = {
  id: string;
  number: string;
  // "YYYY-MM-DD", the day it was signed.
  date: string;
  status: ContractStatus;
  // The scan's metadata as the cabinet shows it (a contract made in the
  // panel has no scan: name "Договір <number>", size 0, format "").
  file: ContractFile;
  externalId: string | null;
  discountPercent: number | null;
  creditLimit: number | null;
  currentDebt: number | null;
  overdueDebt: number | null;
  oldestDebtDays: number | null;
  paymentTerms: PaymentTerms | null;
  paymentDays: number | null;
  priceTypeId: string | null;
  isActive: boolean | null;
};

// A legal entity of the company that signs contracts and appears on orders.
export type CounterpartyDto = {
  id: string;
  name: string;
  signatory: string;
  // EDRPOU (8 digits) or IPN (10); the seeded demo rows have 9.
  code: string;
  status: CounterpartyStatus;
  externalId: string | null;
  // Partner orders that name this counterparty (by its name): a
  // counterparty with orders cannot be removed.
  ordersCount: number;
  contracts: ContractDto[];
  createdAt: string | null;
  updatedAt: string | null;
  seed: boolean;
};

// A person on the company's own list in the cabinet ("Співробітники"). Not
// an account: an employee cannot sign in.
export type EmployeeDto = {
  id: string;
  status: EmployeeStatus;
  fullName: string;
  position: string;
  phone: string;
  email: string;
  // When the invitation was (re)sent; null for active employees.
  invitedAt: string | null;
  seed: boolean;
};

export type CompanyFigures = {
  // Partner orders (every status) and the sum of those not cancelled, UAH.
  ordersCount: number;
  ordersTotal: number;
  // The cabinet dashboard's tiles, whole UAH: "Поточний баланс",
  // "Прострочена ДЗ", "Кредитний ліміт" (the credit limits added up).
  openBalance: number;
  overdue: number;
  creditLimit: number;
};

// GET /api/admin/companies/<id> -> { ok: true, company: CompanyDetail }.
export type CompanyDetail = {
  id: string;
  name: string;
  edrpou: string;
  region: string;
  city: string;
  discountPercent: number;
  // Per counterparty NAME (matched to the orders' counterparty strings, as
  // the cabinet dashboard does).
  creditLimits: CreditLimit[];
  // The company's invitation link token (binar2000.com/invite/<token>).
  inviteToken: string;
  // Demo data only: the fixed "today" of the company's cabinet.
  demoToday: string | null;
  externalId: string | null;
  groupId: string | null;
  // The group in effect: the default "registered" one when groupId is
  // null; null when the stored group no longer exists.
  group: { id: string; name: string } | null;
  managerId: string | null;
  // null also when the stored member of staff no longer exists.
  manager: { id: string; name: string; email: string } | null;
  isActive: boolean;
  showStock: boolean;
  // null = the shop setting (settings "shop".stockDisplayMax).
  stockDisplayMax: number | null;
  notes: StaffNoteDto[];
  erpSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  seed: boolean;
  test: boolean;
  users: CustomerRow[];
  counterparties: CounterpartyDto[];
  employees: EmployeeDto[];
  figures: CompanyFigures;
  // The newest COMPANY_RECENT_ORDERS partner orders.
  orders: OrderRef[];
};

export type CompanyAnswer = { company: CompanyDetail };

// --- changes -------------------------------------------------------------------

// POST /api/admin/companies [customers.edit] -> 201 { ok: true, company }.
export type CreateCompanyBody = {
  name: string;
  // "" or 8 / 10 digits.
  edrpou?: string;
  region?: string;
  city?: string;
  // 0 <= d < 100, default DEFAULT_DISCOUNT_PERCENT.
  discountPercent?: number;
};

// PATCH /api/admin/companies/<id> [customers.edit] -> { ok: true, company }.
// groupId: an existing group (not "guests") or null; managerId: an active
// member of staff or null; externalId: unique ("" or null clears it; 409
// "exists"); regenerateInvite: a new invitation token (the old link stops
// meaning anything).
export type PatchCompanyBody = {
  name?: string;
  edrpou?: string;
  region?: string;
  city?: string;
  discountPercent?: number;
  creditLimits?: CreditLimit[];
  groupId?: string | null;
  managerId?: string | null;
  isActive?: boolean;
  showStock?: boolean;
  stockDisplayMax?: number | null;
  externalId?: string | null;
  regenerateInvite?: true;
};

// DELETE /api/admin/companies/<id> -> { ok: true, id }; 409 "in-use" with
// { users, orders, returns, ledger } counts when anything refers to it.
// Its counterparties and employees go with it.
export type DeleteCompanyAnswer = { id: string };

// POST /api/admin/companies/<id>/notes { text } -> 201 { ok: true, note }
// DELETE /api/admin/companies/<id>/notes/<noteId> -> { ok: true, id }: the
// author removes a note, and so does an owner (403 "not-author" for anybody
// else, the rule of the orders, the returns and the leads).
export type AddNoteBody = { text: string };
export type NoteAnswer = { note: StaffNoteDto };

// POST /api/admin/companies/<id>/counterparties -> 201 { ok: true, counterparty }
// PATCH /api/admin/companies/<id>/counterparties/<cpId> -> { ok: true, counterparty }
// DELETE ... -> { ok: true, id }; 409 "in-use" when orders name it or the
// ledger refers to it. The code is validated only when it changes.
export type CreateCounterpartyBody = {
  name: string;
  code: string;
  signatory?: string;
  status?: CounterpartyStatus;
  externalId?: string | null;
};
export type PatchCounterpartyBody = Partial<CreateCounterpartyBody>;
export type CounterpartyAnswer = { counterparty: CounterpartyDto };

// POST /api/admin/companies/<id>/counterparties/<cpId>/contracts -> 201 { ok: true, contract }
// PATCH .../contracts/<contractId> -> { ok: true, contract }
// DELETE .../contracts/<contractId> -> { ok: true, id }; 409 "in-use" when
// the ledger refers to it. A null ERP field clears it.
export type ContractErpBody = {
  externalId?: string | null;
  discountPercent?: number | null;
  creditLimit?: number | null;
  currentDebt?: number | null;
  overdueDebt?: number | null;
  oldestDebtDays?: number | null;
  paymentTerms?: PaymentTerms | null;
  paymentDays?: number | null;
  priceTypeId?: string | null;
  isActive?: boolean | null;
};
export type CreateContractBody = ContractErpBody & {
  number: string;
  date: string;
  // Default "active".
  status?: ContractStatus;
  file?: ContractFile;
};
export type PatchContractBody = Partial<CreateContractBody>;
export type ContractAnswer = { contract: ContractDto };

// DELETE /api/admin/companies/<id>/employees/<empId> -> { ok: true, id }
// POST /api/admin/companies/<id>/employees/<empId>/resend -> { ok: true, employee }
// (409 "not-invited" for an active employee; within 15 minutes of the last
// invitation nothing new is queued and the stored row is answered).
export type EmployeeAnswer = { employee: EmployeeDto };

// --- ledger ------------------------------------------------------------------

// One movement of the settlements, as the accounting exchange wrote it.
export type LedgerEntryDto = {
  id: string;
  externalId: string;
  docType: LedgerDocType;
  docNumber: string;
  docDate: string;
  amount: number;
  impact: "plus" | "minus";
  // +amount when the debt grows, -amount when it shrinks.
  signed: number;
  counterpartyId: string | null;
  counterpartyName: string | null;
  contractId: string | null;
  contractNumber: string | null;
  orderId: string | null;
  // Running balance after this movement: of its contract (of the
  // movements without a contract when contractId is null), and of the
  // whole company. Computed over every movement, whatever the filters.
  balance: number;
  companyBalance: number;
  createdAt: string | null;
};

export type LedgerContractFigure = {
  contractId: string | null;
  contractNumber: string | null;
  counterpartyId: string | null;
  counterpartyName: string | null;
  balance: number;
  entries: number;
  lastDocDate: string | null;
};

// GET /api/admin/companies/<id>/ledger?docType=&counterpartyId=&contractId=|none&page=&limit=
// -> { ok: true, items: LedgerEntryDto[], total, page, limit, figures }.
// Newest first (docDate, then id). Default limit 50, max 200.
export type LedgerPage = {
  items: LedgerEntryDto[];
  total: number;
  page: number;
  limit: number;
  figures: { balance: number; entries: number; byContract: LedgerContractFigure[] };
};
