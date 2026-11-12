"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { DRAFT_KEY, EMPTY_VALUES, REF_KEYS, type CheckoutValues } from "./data";
import { NP_REF } from "./novaPoshta";

// Session draft of the checkout form (checkout spec 2.13, CO-25): the typed
// values survive a reload or a PDP round trip in the same tab. Initial
// values = EMPTY_VALUES < the session draft (the account prefill of the spec
// is deferred, DECISIONS O-6). Stored per account ("guest" when signed
// out) in sessionStorage, written on every change, removed once the order
// is placed. Every storage access is wrapped: a private window or blocked
// site data simply means no draft.

function read(key: string): CheckoutValues {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return EMPTY_VALUES;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY_VALUES;
    // Only known keys of the right type are taken over, so an old or
    // hand-edited draft can never break the form.
    const src = parsed as Record<string, unknown>;
    const next: Record<string, unknown> = { ...EMPTY_VALUES };
    for (const k of Object.keys(EMPTY_VALUES) as (keyof CheckoutValues)[]) {
      if (typeof src[k] === typeof EMPTY_VALUES[k]) next[k] = src[k];
    }
    // The carrier references of rows picked from Nova Poshta's lists
    // (optional keys, not in EMPTY_VALUES): taken over only in their own
    // shape.
    for (const k of REF_KEYS) {
      const ref = src[k];
      if (typeof ref === "string" && NP_REF.test(ref)) next[k] = ref;
    }
    return next as CheckoutValues;
  } catch {
    return EMPTY_VALUES;
  }
}

function isEmpty(v: CheckoutValues): boolean {
  return (Object.keys(EMPTY_VALUES) as (keyof CheckoutValues)[]).every((k) => v[k] === EMPTY_VALUES[k]);
}

export function useCheckoutDraft(): {
  load: () => CheckoutValues;
  save: (values: CheckoutValues) => void;
  clear: () => void;
} {
  const { user } = useAuth();
  const key = `${DRAFT_KEY}:${user?.id ?? "guest"}`;
  return useMemo(
    () => ({
      load: () => read(key),
      save: (values: CheckoutValues) => {
        try {
          if (isEmpty(values)) window.sessionStorage.removeItem(key);
          else window.sessionStorage.setItem(key, JSON.stringify(values));
        } catch {
          // no storage: no draft
        }
      },
      clear: () => {
        try {
          window.sessionStorage.removeItem(key);
        } catch {
          // no storage: nothing to clear
        }
      },
    }),
    [key],
  );
}
