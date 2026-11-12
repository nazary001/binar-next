// The shop rules the browser applies itself (lib/session/types.ts
// ShopConfig): the free-delivery limit of the cart meter and the return
// window of the cabinet, as staff set them in the panel.
//
// They travel with every session answer; applyBootstrap hands them over
// here. Until an answer arrives the readers get the values the code always
// had (FREE_DELIVERY_THRESHOLD, RETURN_WINDOW_DAYS), and the server render
// always does, so hydration matches and the default case paints exactly
// as before. The last answer is kept in localStorage (a per-browser
// convenience: a reload starts from it instead of the defaults; the next
// answer always wins).
import { useSyncExternalStore } from "react";
import { FREE_DELIVERY_THRESHOLD } from "@/components/cart/data";
import { RETURN_WINDOW_DAYS } from "@/components/platform/orders/data";
import type { ShopConfig } from "./types";

const STORAGE_KEY = "binar.config.v1";

export const DEFAULT_SHOP_CONFIG: ShopConfig = Object.freeze({
  freeDeliveryLimit: FREE_DELIVERY_THRESHOLD,
  returnWindowDays: RETURN_WINDOW_DAYS,
});

const usable = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

// A value of another shape (a later deploy, a hand edit) counts as nothing.
function toConfig(value: unknown): ShopConfig | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (!usable(record.freeDeliveryLimit) || !usable(record.returnWindowDays)) return null;
  return { freeDeliveryLimit: record.freeDeliveryLimit, returnWindowDays: Math.floor(record.returnWindowDays) };
}

// null = not read yet (the first read takes the stored copy).
let current: ShopConfig | null = null;
// A server answer reached this page.
let confirmed = false;
const listeners = new Set<() => void>();

function read(): ShopConfig {
  if (current) return current;
  let value: ShopConfig = DEFAULT_SHOP_CONFIG;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      value = (raw === null ? null : toConfig(JSON.parse(raw))) ?? DEFAULT_SHOP_CONFIG;
    } catch {
      value = DEFAULT_SHOP_CONFIG;
    }
  }
  current = value;
  return value;
}

// Called by applyBootstrap with the answer's `config` (signed in or not).
export function applyShopConfig(value: unknown): void {
  const next = toConfig(value);
  if (!next) return;
  confirmed = true;
  const prev = read();
  if (prev.freeDeliveryLimit === next.freeDeliveryLimit && prev.returnWindowDays === next.returnWindowDays) return;
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: this page keeps the value in memory.
  }
  listeners.forEach((listener) => listener());
}

// True once a session answer brought the config during this page's life.
export function shopConfigConfirmed(): boolean {
  return confirmed;
}

// The current values for plain functions (outside React).
export function currentShopConfig(): ShopConfig {
  return read();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const serverSnapshot = (): ShopConfig => DEFAULT_SHOP_CONFIG;

export function useShopConfig(): ShopConfig {
  return useSyncExternalStore(subscribe, read, serverSnapshot);
}
