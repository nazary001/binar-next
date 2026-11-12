import "server-only";
import {
  NP_CITY_LIMIT,
  NP_PLACE_LIMIT,
  placeSearchText,
  type NpPlaceKind,
  type NpPublicCity,
  type NpPublicPlace,
} from "@/components/checkout/novaPoshta";
import { getSettings } from "@/server/admin/settings";
import { rateLimit } from "@/server/auth/rate-limit";
import { listWarehouses, searchCities, type DirectoryOptions } from "./directory";
import { NpError } from "./errors";

// The storefront's side of the carrier directory: what the checkout may
// ask (GET /api/np/cities, GET /api/np/warehouses) and only while the shop
// has switched the search on. The answers are cut down to what a customer
// needs to pick a row: no weight limits, no internal categories, never the
// key (directory calls never carry one, see directory.ts).
//
// Anybody may search, so what that costs is bounded twice: the directory
// keeps at most a fixed number of answers whatever is searched (the cache
// bound of directory.ts), and at most PUBLIC_CARRIER_CALLS searches a
// minute that the cache cannot answer reach the carrier, for every visitor
// together (the per-address limits of the routes do not bound many
// addresses). Past that budget the search answers like a carrier that is
// down (the routes' 502 "np-unavailable"): the form lets the customer
// type the place, and the order goes through.
//
// No next/* import: the audit scripts load this module under plain Node.

export const PUBLIC_CARRIER_CALLS = 120;

// The budget of carrier calls is spent for this minute.
export class DirectoryBusy extends Error {
  constructor() {
    super("The directory budget of this minute is spent");
    this.name = "DirectoryBusy";
  }
}

const PUBLIC: DirectoryOptions = {
  beforeCarrier: async () => {
    const budget = await rateLimit("np-public-carrier", "all", PUBLIC_CARRIER_CALLS, 60);
    if (!budget.ok) throw new DirectoryBusy();
  },
};

// settings.novaPoshta.checkoutSearch. A settings read that fails counts as
// "off": the checkout then keeps its fixed lists, which always work.
export async function checkoutSearchEnabled(): Promise<boolean> {
  try {
    return (await getSettings("novaPoshta")).checkoutSearch === true;
  } catch (error) {
    console.error("[np] checkout search setting unreadable:", (error as Error)?.name ?? "error");
    return false;
  }
}

// The admin pickers ask for 20 cities; asking the same size shares their
// 24-hour cache rows, and the first ten are the carrier's best matches.
const CITY_FETCH = 20;

export async function publicCities(query: string): Promise<NpPublicCity[]> {
  const cities = await searchCities(query, CITY_FETCH, PUBLIC);
  return cities.slice(0, NP_CITY_LIMIT).map((city) => ({
    ref: city.cityRef,
    name: city.name || city.label,
    area: city.area,
    ...(city.label ? { label: city.label } : {}),
  }));
}

export async function publicPlaces(cityRef: string, kind: NpPlaceKind, query: string): Promise<NpPublicPlace[]> {
  const places = await listWarehouses({ cityRef, kind, query: placeSearchText(query), limit: NP_PLACE_LIMIT }, PUBLIC);
  return places.slice(0, NP_PLACE_LIMIT).map((place) => ({
    ref: place.ref,
    name: place.label,
    ...(place.shortAddress ? { address: place.shortAddress } : {}),
    ...(place.number ? { number: place.number } : {}),
  }));
}

// True for a failure of the carrier itself (no answer, a refusal) and for
// a spent budget of carrier calls: the routes answer both as a calm 502,
// never with the carrier's own wording.
export function carrierFailed(error: unknown): boolean {
  return error instanceof NpError || error instanceof DirectoryBusy;
}
