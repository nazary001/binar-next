"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { Product } from "./data";
import {
  listingProducts,
  partnerPriceMap,
  primeProducts,
  subscribePartnerPrices,
  type PartnerPrices,
  type ProductRegistry,
} from "./registry";

// The registry of this render (registry.ts). On the server each request
// renders its own <CatalogRegistry>, so a request never reads another
// request's catalog snapshot.
const RegistryContext = createContext<ProductRegistry | null>(null);

// Primes the browser's product registry (registry.ts) with the public
// products the root layout read on the server, during render, before any
// child renders - so findProduct() already answers at hydration and the
// listing pool (useListingProducts) in the server pass too. Renders no
// element of its own (a context provider only).
export function CatalogRegistry({
  listing,
  extras,
  children,
}: {
  listing: Product[];
  extras: Product[];
  children: ReactNode;
}) {
  const registry = primeProducts(listing, extras);
  return <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>;
}

// Every listing product, in listing order: the registry of this render
// (the request's own on the server, the page's in the browser).
export function useListingProducts(): Product[] {
  return useContext(RegistryContext)?.listing ?? listingProducts();
}

const NO_PRICES = (): PartnerPrices | null => null;

// The signed-in partner's price map (registry.ts partnerPriceMap), as a
// subscription: a component that shows or sums partner prices passes it to
// b2bPrices / its pricing helper and keeps it in its memo deps, so the
// server's map replaces a stale mirrored one on screen as soon as the
// boot's GET /api/session lands. null on the server and during hydration
// (the server renders no partner price).
export function usePartnerPrices(): PartnerPrices | null {
  return useSyncExternalStore(subscribePartnerPrices, partnerPriceMap, NO_PRICES);
}
