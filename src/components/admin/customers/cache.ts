"use client";

import { invalidate, setQueryData } from "../lib/query";
import type { CustomerDetail } from "./types";

// What a change of an account refreshes: the card itself (with the answer
// the API sent back, so no second request), every accounts list, the
// company pages that list their people, and the journal blocks.

export function customerKey(id: string): string {
  return `/customers/${encodeURIComponent(id)}`;
}

export function applyCustomer(customer: CustomerDetail): void {
  setQueryData(customerKey(customer.id), { ok: true, customer });
  refreshAround();
}

// After a change whose answer does not carry the account (a password, a
// sign-out): the card loads again.
export function reloadCustomer(id: string): void {
  invalidate(customerKey(id));
  refreshAround();
}

export function refreshAround(): void {
  invalidate("/customers?");
  invalidate("/companies");
  invalidate("/audit");
}
