import "server-only";
import { z } from "zod";
import { collection } from "../db/collections";

// Settings of the site that staff edit in the panel. One document of the
// `settings` collection per group; the shape, the limits and the defaults
// of every group are the zod schemas below.
//
//   const shop = await getSettings("shop");          // defaults filled in
//   await saveSettings("shop", { ...shop, freeDeliveryLimit: 6000 }, staffId);
//
// A stored value that no longer fits its schema (an older version of the
// code wrote it) falls back to the defaults field by field, never throws.
// Secrets are NOT kept in clear here: the integrations store them sealed
// (admin/secrets.ts) in the `...Sealed` fields and show only a hint.
// No next/* import: the scripts read settings too.

const text = (max: number, fallback = "") => z.string().trim().max(max).catch(fallback).default(fallback);
const flag = (fallback: boolean) => z.boolean().catch(fallback).default(fallback);
const amount = (fallback: number, max = 100_000_000) => z.number().min(0).max(max).catch(fallback).default(fallback);
const count = (fallback: number, max = 100_000) =>
  z.number().int().min(0).max(max).catch(fallback).default(fallback);
const sealed = z.string().max(2000).nullable().catch(null).default(null);

export const SETTINGS = {
  // Who the company is: shown in notices and used as the reply address.
  general: z.object({
    companyName: text(200, "Binar 2000"),
    phone: text(64),
    email: text(254),
    address: text(300),
    workHours: text(200),
    // The manager a partner is told to contact (dashboard card, notices).
    managerName: text(200),
    managerPhone: text(64),
    managerEmail: text(254),
    // Where "a form was sent" notices go.
    leadsInbox: text(254, "info@binar-2000.com"),
    // Where "a new order came in" notices go (several addresses allowed).
    ordersInbox: z.array(z.string().trim().max(254)).max(10).catch([]).default([]),
  }),

  // Rules of the shop the requirement documents ask to keep editable.
  shop: z.object({
    // FREE_DELIVERY_LIMIT, UAH: the cart meter and the delivery notice.
    freeDeliveryLimit: amount(5000),
    // The "traffic light": more than this many units = "in stock",
    // fewer = "limited", zero = "on order".
    stockThreshold: count(50),
    // Real stock shown to a partner is capped at this figure (">1 000").
    stockDisplayMax: count(1000, 10_000_000),
    // Days a partner has to pay a new order (the due date of the order).
    paymentTermDays: count(60, 3650),
    // Days after an order during which a return may be requested.
    returnWindowDays: count(14, 3650),
    // Logistic buffer added to an expected arrival (lead time), days.
    leadTimeBufferDays: count(2, 365),
    // Which price type guests see and which one partners' prices start
    // from is NOT a setting: it is the `role` of the price type itself
    // (price_types.role, edited on the price types page), so the exchange
    // and the shop can never disagree about it.
  }),

  blog: z.object({
    // Chips of the blog list, in order (without the "all" chip).
    categories: z
      .array(z.string().trim().min(1).max(60))
      .max(20)
      .catch([])
      .default(["Готелі", "Клінінг", "Гігієна та косметика", "Стандарти якості", "Закупівлі"]),
    defaultAuthor: text(120, "Команда Binar 2000"),
  }),

  // What the panel keeps next to the catalog taxonomy (which itself lives
  // in code, src/components/catalog/data.ts).
  catalog: z.object({
    // Per category, keyed "<direction>/<category>": the product group of
    // the ERP it corresponds to, and its own "traffic light" threshold
    // (null = the shop setting).
    categories: z
      .record(
        z.string().max(120),
        z.object({
          externalId: z.string().trim().max(64).nullable().catch(null).default(null),
          stockThreshold: z.number().int().min(0).max(100_000).nullable().catch(null).default(null),
          note: text(300),
        }),
      )
      .catch({})
      .default({}),
    // Brands, makers and countries the product editor offers besides the
    // ones products already use.
    brands: z.array(z.string().trim().min(1).max(80)).max(300).catch([]).default([]),
    manufacturers: z.array(z.string().trim().min(1).max(120)).max(300).catch([]).default([]),
    countries: z.array(z.string().trim().min(1).max(80)).max(300).catch([]).default([]),
  }),

  novaPoshta: z.object({
    enabled: flag(false),
    apiKeySealed: sealed,
    apiKeyHint: text(16),
    // Who sends the parcels: references of the carrier's own directory.
    sender: z
      .object({
        counterpartyRef: text(64),
        counterpartyName: text(200),
        contactRef: text(64),
        contactName: text(200),
        phone: text(32),
        cityRef: text(64),
        cityName: text(200),
        warehouseRef: text(64),
        warehouseName: text(300),
      })
      .catch({
        counterpartyRef: "",
        counterpartyName: "",
        contactRef: "",
        contactName: "",
        phone: "",
        cityRef: "",
        cityName: "",
        warehouseRef: "",
        warehouseName: "",
      })
      .default({
        counterpartyRef: "",
        counterpartyName: "",
        contactRef: "",
        contactName: "",
        phone: "",
        cityRef: "",
        cityName: "",
        warehouseRef: "",
        warehouseName: "",
      }),
    // Pre-filled values of a new waybill.
    defaultWeight: z.number().min(0.1).max(1000).catch(1).default(1),
    defaultSeats: z.number().int().min(1).max(100).catch(1).default(1),
    defaultDescription: text(120, "Готельна продукція"),
    defaultPayer: z.enum(["Sender", "Recipient"]).catch("Recipient").default("Recipient"),
    defaultPaymentMethod: z.enum(["Cash", "NonCash"]).catch("Cash").default("Cash"),
    // Size of a typical parcel in cm, pre-filled when a waybill needs one
    // (a postomat does); null = not set.
    defaultDimensions: z
      .object({
        width: z.number().min(1).max(300),
        length: z.number().min(1).max(300),
        height: z.number().min(1).max(300),
      })
      .nullable()
      .catch(null)
      .default(null),
    // The checkout searches the carrier's real cities and branches.
    checkoutSearch: flag(false),
    // Parcels on the way are re-checked when their order is opened.
    autoTrack: flag(true),
  }),

  // The exchange with the accounting system (BAS).
  bas: z.object({
    enabled: flag(false),
    // "pull": the ERP reads the queue of new orders on its schedule.
    // "push": the site also posts every new order to `pushUrl`.
    mode: z.enum(["pull", "push"]).catch("pull").default("pull"),
    pushUrl: text(500),
    pushLogin: text(120),
    pushPasswordSealed: sealed,
    pushPasswordHint: text(16),
    // Which data the ERP is allowed to overwrite on the site.
    acceptProducts: flag(true),
    acceptPrices: flag(true),
    acceptStock: flag(true),
    acceptClients: flag(true),
    acceptLedger: flag(true),
    acceptOrderStatuses: flag(true),
    acceptDocuments: flag(true),
    // A product the ERP sends for the first time appears in the shop
    // right away (false = it waits, unlisted, for a manager).
    publishNewProducts: flag(false),
    // Stock decides `available` on the storefront.
    stockDrivesAvailability: flag(false),
    // Which orders go into the queue for the ERP.
    exportRetailOrders: flag(true),
    exportPartnerOrders: flag(true),
  }),

  mail: z.object({
    provider: z.enum(["none", "resend", "webhook"]).catch("none").default("none"),
    apiKeySealed: sealed,
    apiKeyHint: text(16),
    // "Binar 2000 <no-reply@binar-2000.com>"
    from: text(254),
    replyTo: text(254),
    webhookUrl: text(500),
    notifyNewOrder: flag(true),
    notifyNewLead: flag(true),
    confirmOrderToCustomer: flag(true),
  }),
} as const;

export type SettingsKey = keyof typeof SETTINGS;
export type SettingsOf<K extends SettingsKey> = z.infer<(typeof SETTINGS)[K]>;

export const SETTINGS_KEYS = Object.keys(SETTINGS) as SettingsKey[];

export function isSettingsKey(value: string): value is SettingsKey {
  return (SETTINGS_KEYS as string[]).includes(value);
}

function parse<K extends SettingsKey>(key: K, value: unknown): SettingsOf<K> {
  return SETTINGS[key].parse(value ?? {}) as SettingsOf<K>;
}

// The settings of a group with every missing or broken field replaced by
// its default.
export async function getSettings<K extends SettingsKey>(key: K): Promise<SettingsOf<K>> {
  const doc = await (await collection("settings")).findOne({ _id: key });
  return parse(key, doc?.value);
}

// Stores a whole group. The value passes through the schema first, so only
// known, bounded fields are ever written.
export async function saveSettings<K extends SettingsKey>(
  key: K,
  value: SettingsOf<K>,
  staffId: string | null,
): Promise<SettingsOf<K>> {
  const clean = parse(key, value);
  await (await collection("settings")).updateOne(
    { _id: key },
    { $set: { value: clean as Record<string, unknown>, updatedAt: new Date(), updatedBy: staffId } },
    { upsert: true },
  );
  return clean;
}

// Merges a partial change into a group and stores it.
export async function patchSettings<K extends SettingsKey>(
  key: K,
  patch: Partial<SettingsOf<K>>,
  staffId: string | null,
): Promise<SettingsOf<K>> {
  const current = await getSettings(key);
  return saveSettings(key, { ...current, ...patch }, staffId);
}
