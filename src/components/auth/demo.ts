// Two shared test accounts for reviewing the signed-in design on any
// device. The mock store is per-browser localStorage, so these ship with
// the code: api.ts finds them after the device's own accounts and copies
// one into the store on its first sign-in (the session, logo and welcome
// flag then work as for a registered account).
//
//   B2B partner    +38 050 000 0001 / partner@example.com
//                  -> platform shell: B2B catalog, product pages, orders
//   B2C customer   +38 050 000 0002 / client@example.com
//                  -> the public shop, signed in
//   password for both: binar2026
import { EMPTY_COMPANY, type Account } from "./data";

export const DEMO_PASSWORD = "binar2026";

// `passwordHash` stays empty: no digest equals it, so DEMO_PASSWORD is
// what opens these accounts (a password set through "Забули пароль?"
// works too, on that device only).
export const DEMO_ACCOUNTS: Account[] = [
  {
    id: "demo-b2b",
    type: "b2b",
    phone: "0500000001",
    login: "0500000001",
    passwordHash: "",
    company: { name: "Демо Партнер", edrpou: "12345678", region: "Київ", city: "Київ" },
    person: {
      fullName: "Коваль Олена Петрівна",
      role: "purchasing",
      position: "Керівник відділу закупівель",
      phone: "0500000001",
      email: "partner@example.com",
    },
    createdAt: "2026-09-24T00:00:00.000Z",
    welcomed: true,
  },
  {
    id: "demo-b2c",
    type: "b2c",
    phone: "0500000002",
    login: "0500000002",
    passwordHash: "",
    company: EMPTY_COMPANY,
    person: {
      fullName: "Шевчук Андрій Іванович",
      role: "",
      position: "",
      phone: "0500000002",
      email: "client@example.com",
    },
    createdAt: "2026-09-24T00:00:00.000Z",
    welcomed: true,
  },
];

export function isDemoAccount(account: Account): boolean {
  return DEMO_ACCOUNTS.some((d) => d.id === account.id);
}
