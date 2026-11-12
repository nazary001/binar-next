import "server-only";
import { EMPTY_COMPANY, type CompanyData, type PersonData } from "@/components/auth/data";

// The two shared demo accounts and the demo partner company, exactly as the
// browser mock shipped them (src/components/auth/demo.ts before the
// database). Read by src/server/seed/users.ts only; the password is not
// here, it comes from SEED_DEMO_PASSWORD.

export const DEMO_CREATED_AT = "2026-09-24T00:00:00.000Z";

export const DEMO_COMPANY: CompanyData = {
  name: "Демо Партнер",
  edrpou: "12345678",
  region: "Київ",
  city: "Київ",
};

// The company's invitation token (profile page, "Spivrobitnyky"), the
// default of the profile mock.
export const DEMO_INVITE_TOKEN = "a8f3k2";

// The partner's discount from the wholesale list price: the mock's
// fallback partner price was round(list * 0.916).
export const DEMO_DISCOUNT_PERCENT = 8.4;

// Credit limit per counterparty, as the dashboard shows them: the four
// counterparty names of the orders mock (platform/orders/data.ts
// COUNTERPARTIES) paired by position with the dashboard's CREDIT_LIMITS
// (platform/dashboard/data.ts).
export const DEMO_CREDIT_LIMITS: { counterparty: string; limit: number }[] = [
  { counterparty: 'ТОВ "Мережа готелів "Зоряний шлях"', limit: 200000 },
  { counterparty: "Mirotel LTD", limit: 150000 },
  { counterparty: "Готель «Дністер»", limit: 100000 },
  { counterparty: "Rixos Prykarpattya", limit: 50000 },
];

export type DemoAccountSeed = {
  id: "demo-b2b" | "demo-b2c";
  type: "b2b" | "b2c";
  phone: string;
  login: string;
  company: CompanyData;
  person: PersonData;
};

// `company` of the partner is the company document above; its user record
// keeps the empty card (the account DTO reads the company document).
export const DEMO_ACCOUNTS: DemoAccountSeed[] = [
  {
    id: "demo-b2b",
    type: "b2b",
    phone: "0500000001",
    login: "0500000001",
    company: { ...EMPTY_COMPANY },
    person: {
      fullName: "Коваль Олена Петрівна",
      role: "purchasing",
      position: "Керівник відділу закупівель",
      phone: "0500000001",
      email: "partner@example.com",
    },
  },
  {
    id: "demo-b2c",
    type: "b2c",
    phone: "0500000002",
    login: "0500000002",
    company: { ...EMPTY_COMPANY },
    person: {
      fullName: "Шевчук Андрій Іванович",
      role: "",
      position: "",
      phone: "0500000002",
      email: "client@example.com",
    },
  },
];
