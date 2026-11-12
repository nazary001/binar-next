// The product registry of the browser: every public product, primed once
// per page load by <CatalogRegistry> (rendered by the root layout with the
// products the server read from the database), so client code keeps
// looking products up synchronously - the cart, the checkout, the
// assortment and the catalog listing never wait or flash.
//
// No "use client": a plain module (catalog/data.ts imports it, and server
// code imports catalog/data.ts). The React side - the context that carries
// the registry through a render and the hooks - lives in
// CatalogRegistry.tsx.
//
// The module-level copy is written in the browser only: one visitor, one
// catalog per page load. On the server concurrent requests render at the
// same time (and around a catalog revalidation they carry different
// snapshots), so the server never writes it: render-time reads go through
// the request's own context (useListingProducts in CatalogRegistry.tsx),
// and the plain lookups below answer empty there. Reading before the
// registry is primed returns empty results, never throws.
import { currentAccount, getSnapshot, subscribe as subscribeAuth } from "@/components/auth/store";
import { readDomain, subscribeCache } from "@/lib/session/cache";
import type { Product } from "./data";

export type ProductRegistry = {
  listing: Product[];
  extras: Product[];
  all: Product[];
  byId: Map<string, Product>;
};

let registry: ProductRegistry = { listing: [], extras: [], all: [], byId: new Map() };

// listing = the products of the catalog listing, in listing order
// ("za populiarnistiu"); extras = products that only have a page. Called
// on every render of <CatalogRegistry>, which provides the result to its
// subtree; in the browser the same arrays again are a no-op.
export function primeProducts(listing: Product[], extras: Product[]): ProductRegistry {
  if (registry.listing === listing && registry.extras === extras) return registry;
  const all = [...listing, ...extras];
  const next: ProductRegistry = { listing, extras, all, byId: new Map(all.map((p) => [p.id, p])) };
  if (typeof window !== "undefined") registry = next;
  return next;
}

export function findProduct(id: string): Product | undefined {
  return registry.byId.get(id);
}

// Listing products first, then the page-only ones (the order of the old
// ALL_PRODUCTS).
export function allProducts(): Product[] {
  return registry.all;
}

// Components that render the listing use useListingProducts() instead
// (CatalogRegistry.tsx): it also answers on the server.
export function listingProducts(): Product[] {
  return registry.listing;
}

// --- partner prices ---------------------------------------------------------

// Product id -> the signed-in partner's own price: the `prices` domain of
// the session bootstrap, mirrored per account by lib/session/cache.ts.
export type PartnerPrices = Readonly<Record<string, number>>;

// The signed-in account's price map as mirrored right now, or null (a
// guest, a retail customer, the server, nothing mirrored). Referentially
// stable until the mirror or the account changes, so it doubles as the
// snapshot of usePartnerPrices().
export function partnerPriceMap(): PartnerPrices | null {
  if (typeof window === "undefined") return null;
  const account = currentAccount(getSnapshot());
  if (!account) return null;
  return readDomain("prices", account.id) ?? null;
}

// Fires when the map may have changed: a session answer re-mirrored it
// (the boot's GET /api/session replaces a stale copy), another tab wrote
// it, or the account changed.
export function subscribePartnerPrices(listener: () => void): () => void {
  const offCache = subscribeCache(listener);
  const offAuth = subscribeAuth(listener);
  return () => {
    offCache();
    offAuth();
  };
}

// The partner's own price of a product, from `prices` (a component passes
// usePartnerPrices(), so it re-renders when the map changes; omitted = the
// mirror as it is now). undefined = no map, or no entry for the product.
export function partnerPriceOf(
  id: string,
  prices: PartnerPrices | null = partnerPriceMap(),
): number | undefined {
  const value = prices?.[id];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
