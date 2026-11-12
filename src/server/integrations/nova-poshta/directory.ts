import "server-only";
import { createHash } from "node:crypto";
import type {
  NpCity,
  NpStreet,
  NpWarehouse,
  NpWarehouseFilter,
  NpWarehouseKind,
} from "@/components/admin/shipping/types";
import { collection } from "@/server/db/collections";
import { npCall, npNumber, npString } from "./client";
import { NpError } from "./errors";

// The carrier's directory for the pickers: settlements, branches and
// postomats, streets. No key is ever sent (an expired key makes even these
// methods fail, and they work without one).
//
// Answers are cached in `carrier_cache` for 24 hours, already mapped to the
// small DTOs (a raw warehouse row carries three weekly schedules). The key
// is the method plus a hash of the normalised arguments; the TTL index on
// expiresAt removes old rows. The cache is a convenience: when it cannot be
// read or written the carrier is asked directly.

const CACHE_MS = 24 * 60 * 60 * 1000;

export function directoryCacheKey(method: string, args: unknown): string {
  const hash = createHash("sha256").update(JSON.stringify(args)).digest("hex").slice(0, 40);
  return `np:${method}:${hash}`;
}

async function cached<T>(method: string, args: unknown, load: () => Promise<T>): Promise<T> {
  const key = directoryCacheKey(method, args);
  try {
    const hit = await (await collection("carrierCache")).findOne({ _id: key, expiresAt: { $gt: new Date() } });
    if (hit) return hit.data as T;
  } catch (error) {
    console.error("[np] cache read failed:", (error as Error)?.name ?? "error");
  }
  const data = await load();
  try {
    await (await collection("carrierCache")).updateOne(
      { _id: key },
      { $set: { data, expiresAt: new Date(Date.now() + CACHE_MS) } },
      { upsert: true },
    );
  } catch (error) {
    console.error("[np] cache write failed:", (error as Error)?.name ?? "error");
  }
  return data;
}

function normalized(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLowerCase().slice(0, 100);
}

// Refusals that only mean "nothing matches" for a search box: Latin or
// odd characters in a city name, a city ref the carrier does not know.
const NO_MATCH_CODES = new Set(["20000500652", "20000900768"]);

async function orEmpty<T>(load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof NpError && error.kind === "api" && error.codes.some((code) => NO_MATCH_CODES.has(code))) return [];
    throw error;
  }
}

// --- settlements ------------------------------------------------------------------

type SettlementRow = {
  Present?: unknown;
  MainDescription?: unknown;
  Area?: unknown;
  Ref?: unknown;
  DeliveryCity?: unknown;
  Warehouses?: unknown;
  AddressDeliveryAllowed?: unknown;
};

export async function searchCities(query: string, limit = 20): Promise<NpCity[]> {
  const text = normalized(query);
  if (!text) return [];
  const size = Math.min(Math.max(1, Math.floor(limit)), 50);
  return cached("searchSettlements", { text, size }, () =>
    orEmpty(async () => {
      const { data } = await npCall<{ Addresses?: SettlementRow[] }>(
        "AddressGeneral",
        "searchSettlements",
        { CityName: text, Limit: String(size), Page: "1" },
        { key: "none", entity: "directory" },
      );
      const rows = Array.isArray(data[0]?.Addresses) ? data[0].Addresses : [];
      return rows
        .map(
          (row): NpCity => ({
            label: npString(row.Present),
            name: npString(row.MainDescription),
            area: npString(row.Area),
            cityRef: npString(row.DeliveryCity),
            settlementRef: npString(row.Ref),
            warehouses: npNumber(row.Warehouses) ?? 0,
            addressDelivery: row.AddressDeliveryAllowed === true,
          }),
        )
        // A settlement without a delivery city cannot be shipped to.
        .filter((city) => city.cityRef !== "");
    }),
  );
}

// --- warehouses -------------------------------------------------------------------

// getWarehouseTypes (LIVE 2026-11-12). A filter by type is one ref per
// call, so "branch" asks for the postal and the cargo branches and merges
// them; "Parcel Shop" answers the same list as the postal type.
const TYPE_POSTAL = "841339c7-591a-42e2-8233-7a0a00f0ed6f";
const TYPE_CARGO = "9a68df70-0267-42a8-bb5c-37f427e36ee4";
const TYPE_POSTOMAT = "f9316480-5f2d-425d-bc2c-ac7cd29decf0";

type WarehouseRow = {
  Ref?: unknown;
  Description?: unknown;
  ShortAddress?: unknown;
  Number?: unknown;
  CategoryOfWarehouse?: unknown;
  CityRef?: unknown;
  CityDescription?: unknown;
  PlaceMaxWeightAllowed?: unknown;
  TotalMaxWeightAllowed?: unknown;
  MaxDeclaredCost?: unknown;
  ReceivingLimitationsOnDimensions?: unknown;
  WarehouseIndex?: unknown;
  WarehouseStatus?: unknown;
  DenyToSelect?: unknown;
};

// "0" means "no limit" in the carrier's directory.
function limit(value: unknown): number | null {
  const n = npNumber(value);
  return n === null || n <= 0 ? null : n;
}

function dimensions(value: unknown): NpWarehouse["maxDimensions"] {
  if (value === null || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const width = limit(v.Width);
  const height = limit(v.Height);
  const length = limit(v.Length);
  return width && height && length ? { width, height, length } : null;
}

function toWarehouse(row: WarehouseRow): NpWarehouse {
  const category = npString(row.CategoryOfWarehouse);
  const kind: NpWarehouseKind = category === "Postomat" ? "postomat" : "branch";
  return {
    ref: npString(row.Ref),
    label: npString(row.Description),
    number: npString(row.Number),
    kind,
    category,
    shortAddress: npString(row.ShortAddress),
    cityRef: npString(row.CityRef),
    city: npString(row.CityDescription),
    maxWeightPerSeat: limit(row.PlaceMaxWeightAllowed),
    maxWeightTotal: limit(row.TotalMaxWeightAllowed),
    maxDeclaredCost: limit(row.MaxDeclaredCost),
    maxDimensions: dimensions(row.ReceivingLimitationsOnDimensions),
    index: npString(row.WarehouseIndex),
    working: npString(row.WarehouseStatus) === "Working",
  };
}

async function warehousesOfType(cityRef: string, text: string, size: number, typeRef: string | null): Promise<NpWarehouse[]> {
  const props: Record<string, unknown> = { CityRef: cityRef, Limit: String(size), Page: "1", Language: "UA" };
  if (text) props.FindByString = text;
  if (typeRef) props.TypeOfWarehouseRef = typeRef;
  const { data } = await npCall<WarehouseRow>("AddressGeneral", "getWarehouses", props, { key: "none", entity: "directory" });
  return data
    .filter((row) => npString(row.DenyToSelect) !== "1")
    .map(toWarehouse)
    .filter((warehouse) => warehouse.ref !== "");
}

function byNumber(a: NpWarehouse, b: NpWarehouse): number {
  const na = Number(a.number);
  const nb = Number(b.number);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return a.label.localeCompare(b.label, "uk");
}

export type WarehouseQuery = { cityRef: string; query?: string; kind?: NpWarehouseFilter; limit?: number };

export async function listWarehouses(input: WarehouseQuery): Promise<NpWarehouse[]> {
  const text = normalized(input.query ?? "");
  const kind = input.kind ?? "all";
  const size = Math.min(Math.max(1, Math.floor(input.limit ?? 50)), 100);
  const cityRef = input.cityRef.toLowerCase();
  return cached("getWarehouses", { cityRef, text, kind, size }, () =>
    orEmpty(async () => {
      if (kind === "postomat") {
        return (await warehousesOfType(cityRef, text, size, TYPE_POSTOMAT)).filter((w) => w.kind === "postomat");
      }
      if (kind === "branch") {
        const [postal, cargo] = await Promise.all([
          warehousesOfType(cityRef, text, size, TYPE_POSTAL),
          warehousesOfType(cityRef, text, size, TYPE_CARGO),
        ]);
        const seen = new Set<string>();
        return [...postal, ...cargo]
          .filter((w) => w.kind === "branch" && !seen.has(w.ref) && seen.add(w.ref))
          .sort(byNumber)
          .slice(0, size);
      }
      return warehousesOfType(cityRef, text, size, null);
    }),
  );
}

// --- streets ------------------------------------------------------------------------

type StreetRow = { Ref?: unknown; Description?: unknown; StreetsType?: unknown };

// getStreet by the city ref: its Ref is the StreetRef Address.save takes
// (searchSettlementStreets answers settlement street refs, a different
// directory).
export async function searchStreets(cityRef: string, query: string, limit = 20): Promise<NpStreet[]> {
  const text = normalized(query);
  if (!text) return [];
  const size = Math.min(Math.max(1, Math.floor(limit)), 50);
  const city = cityRef.toLowerCase();
  return cached("getStreet", { city, text, size }, () =>
    orEmpty(async () => {
      const { data } = await npCall<StreetRow>(
        "Address",
        "getStreet",
        { CityRef: city, FindByString: text, Limit: String(size), Page: "1" },
        { key: "none", entity: "directory" },
      );
      return data
        .map((row): NpStreet => {
          const name = npString(row.Description);
          const type = npString(row.StreetsType);
          return { ref: npString(row.Ref), label: [type, name].filter(Boolean).join(" "), name, type };
        })
        .filter((street) => street.ref !== "");
    }),
  );
}
