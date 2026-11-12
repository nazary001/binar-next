// The session bootstrap: what the server tells a browser about "who is
// signed in and what is theirs". Shared by the server (GET /api/session,
// the sign-in / sign-up answers) and the client (lib/session/bootstrap.ts).
// Types only - this module must stay free of runtime imports.
import type { Account } from "@/components/auth/data";
import type { CartLine } from "@/components/cart/data";
import type { AssortmentLine } from "@/components/platform/assortment/data";
import type { CancelRecord, Order, ReturnRequest } from "@/components/platform/orders/data";
import type { ProfileData } from "@/components/platform/profile/data";

// The cabinet's orders area for one partner company, as it stands on the
// server: cancellations, new returns and withdrawals are already applied
// (an instantly cancelled order has status "cancelled", a withdrawn
// return status "cancelled").
export type OrdersPayload = {
  // "YYYY-MM-DD": the day the cabinet treats as today (the return window,
  // "last 30 days", due dates). The demo company gets the fixed date its
  // seeded orders were built around; real companies get the Kyiv date.
  today: string;
  // The company's orders, newest first (date, then number).
  orders: Order[];
  // Its return requests, newest first (the latest request on top).
  returns: ReturnRequest[];
  // Pending cancel requests ("Запит на скасування") by order id.
  cancelRequests: Record<string, CancelRecord>;
  // Credit limit per counterparty name (dashboard KPIs).
  creditLimits: { counterparty: string; limit: number }[];
  // Server clock (ms) when the payload was read: every change stored
  // before it is included. The mutation answers carry the moment they were
  // stored (`at`), so the orders store keeps its own newer changes when a
  // slow session answer brings an older payload (orders/store.ts).
  asOf?: number;
};

// One key per data domain. A key is absent when the domain does not apply
// to the account (a retail customer has no orders payload).
export type SessionData = {
  // Every signed-in account: the cart saved on the server.
  cart?: CartLine[];
  // B2B: product id -> this partner's price.
  prices?: Record<string, number>;
  orders?: OrdersPayload;
  profile?: ProfileData;
  assortment?: AssortmentLine[];
};

export type SessionDomain = keyof SessionData;

export type SessionBootstrap = {
  // The signed-in account (passwordHash is always ""), or null.
  account: Account | null;
  data: SessionData;
};
