import "server-only";
import { z } from "zod";
import {
  PLAIN_SETTINGS_KEYS,
  SETTINGS_FIELDS,
  type BlogSettings,
  type CatalogSettings,
  type GeneralSettings,
  type PlainSettings,
  type PlainSettingsKey,
  type SettingsChange,
  type SettingsFieldError,
  type SettingsFieldKind,
  type SettingsMeta,
  type ShopSettings,
} from "@/components/admin/settings/types";
import { categoriesSharingCode } from "@/components/admin/catalog/codes";
import { CATALOG_DIRECTIONS } from "@/components/catalog/data";
import { SETTINGS, getSettings, saveSettings, type SettingsOf } from "@/server/admin/settings";
import { TAG, type PublicTag } from "@/server/cache-tags";
import { collection } from "@/server/db/collections";

// The plain settings groups behind /api/admin/settings/**: reading them
// with their save stamps, and the strict check of a save.
//
// The schemas of admin/settings.ts are forgiving on purpose (a stored value
// that no longer fits falls back to its default, an unknown key is
// dropped), which is right for reading but wrong for a form: a typo would
// silently reset a value. So a save is first checked field by field
// against the same schemas with their fallbacks taken off, plus the
// formats the field kinds imply (an e-mail, a phone, money with at most two
// decimals, an existing price type), and refused with the list of bad
// fields instead.

// The browser's types of the groups must stay the shapes the server
// stores; this fails to compile when they drift apart.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;
export type SettingsTypesAgree = Assert<
  Same<SettingsOf<"general">, GeneralSettings> &
    Same<SettingsOf<"shop">, ShopSettings> &
    Same<SettingsOf<"blog">, BlogSettings> &
    Same<SettingsOf<"catalog">, CatalogSettings>
>;

export function isPlainSettingsKey(value: string): value is PlainSettingsKey {
  return (PLAIN_SETTINGS_KEYS as readonly string[]).includes(value);
}

export function groupTitle(key: PlainSettingsKey): string {
  return SETTINGS_FIELDS.find((group) => group.group === key)?.title ?? key;
}

function fieldLabel(key: PlainSettingsKey, field: string): string {
  if (key === "catalog" && field === "categories") return "Категорії";
  return SETTINGS_FIELDS.find((group) => group.group === key)?.fields.find((item) => item.key === field)?.label ?? field;
}

function fieldKind(key: PlainSettingsKey, field: string): SettingsFieldKind | null {
  return SETTINGS_FIELDS.find((group) => group.group === key)?.fields.find((item) => item.key === field)?.kind ?? null;
}

// Which public pages read a group (their caches are dropped after a save).
export function tagsOf(key: PlainSettingsKey): PublicTag[] {
  if (key === "blog") return [TAG.blog];
  if (key === "shop" || key === "catalog") return [TAG.catalog];
  return [];
}

// --- reading -----------------------------------------------------------------------------

export async function readGroup<K extends PlainSettingsKey>(key: K): Promise<PlainSettings[K]> {
  return (await getSettings(key)) as PlainSettings[K];
}

export async function readAllGroups(): Promise<PlainSettings> {
  const [general, shop, blog, catalog] = await Promise.all([
    readGroup("general"),
    readGroup("shop"),
    readGroup("blog"),
    readGroup("catalog"),
  ]);
  return { general, shop, blog, catalog };
}

export async function readMeta(keys: readonly PlainSettingsKey[]): Promise<Record<PlainSettingsKey, SettingsMeta>> {
  const docs = await (await collection("settings"))
    .find({ _id: { $in: [...keys] } }, { projection: { _id: 1, updatedAt: 1, updatedBy: 1 } })
    .toArray();
  const staffIds = [...new Set(docs.map((doc) => doc.updatedBy).filter((id): id is string => typeof id === "string"))];
  const staff = staffIds.length
    ? await (await collection("staff")).find({ _id: { $in: staffIds } }, { projection: { _id: 1, name: 1 } }).toArray()
    : [];
  const names = new Map(staff.map((member) => [member._id, member.name]));
  const meta = {} as Record<PlainSettingsKey, SettingsMeta>;
  for (const key of keys) {
    const doc = docs.find((item) => item._id === key);
    meta[key] = {
      updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
      updatedBy: doc?.updatedBy ? { id: doc.updatedBy, name: names.get(doc.updatedBy) ?? "Видалений співробітник" } : null,
    };
  }
  return meta;
}

// --- the strict check ----------------------------------------------------------------------

export type FieldErrors = Record<string, SettingsFieldError>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// The schema of a field without its `.default()` and `.catch()` wrappers.
function strictOf(schema: z.ZodType): z.ZodType {
  let current = schema;
  for (;;) {
    if (current instanceof z.ZodDefault || current instanceof z.ZodCatch) current = current.unwrap() as z.ZodType;
    else return current;
  }
}

type Issue = z.ZodError["issues"][number];

function reasonOf(issue: Issue): SettingsFieldError {
  const origin = "origin" in issue ? String(issue.origin) : "";
  const sized = origin === "string" || origin === "array";
  switch (issue.code) {
    case "invalid_type":
      return "type";
    case "too_big":
      return sized ? "too-long" : "too-big";
    case "too_small":
      return sized ? "too-short" : "too-small";
    case "invalid_format":
      return "format";
    case "invalid_value":
      return "value";
    default:
      return "invalid";
  }
}

// Walks a value along its schema: objects refuse keys they do not have,
// records check every key and value, anything else is parsed by the
// schema with its fallbacks removed.
function checkValue(schema: z.ZodType, value: unknown, path: string, errors: FieldErrors): void {
  const strict = strictOf(schema);
  if (strict instanceof z.ZodObject) {
    if (!isPlainObject(value)) {
      errors[path] = "type";
      return;
    }
    const shape = strict.shape as Record<string, z.ZodType>;
    for (const [key, item] of Object.entries(value)) {
      const at = path ? `${path}.${key}` : key;
      if (!Object.hasOwn(shape, key)) errors[at] = "unknown";
      else checkValue(shape[key], item, at, errors);
    }
    return;
  }
  if (strict instanceof z.ZodRecord) {
    if (!isPlainObject(value)) {
      errors[path] = "type";
      return;
    }
    for (const [key, item] of Object.entries(value)) {
      const at = `${path}.${key}`;
      if (!(strict.keyType as z.ZodType).safeParse(key).success) errors[at] = "key";
      else checkValue(strict.valueType as z.ZodType, item, at, errors);
    }
    return;
  }
  const parsed = strict.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const at = [path, ...issue.path.map(String)].filter(Boolean).join(".");
    errors[at] = reasonOf(issue);
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Digits with the usual separators and an optional leading "+"; at least
// five digits.
const PHONE = /^\+?[0-9()\- ]+$/;
// The keys of the per-category map: "<direction>/<category>" of a card of
// the catalog taxonomy (the rule of the categories screen too).
const CATEGORY_KEYS = new Set(
  CATALOG_DIRECTIONS.flatMap((direction) => direction.carousel.map((card) => `${direction.slug}/${card.slug}`)),
);
const PRICE_TYPE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

function isMoney(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
}

// The formats a field kind implies, for values that passed the schema.
async function checkKind(
  key: PlainSettingsKey,
  field: string,
  value: unknown,
  errors: FieldErrors,
): Promise<void> {
  if (key === "catalog" && field === "categories" && isPlainObject(value)) {
    for (const category of Object.keys(value)) {
      if (!CATEGORY_KEYS.has(category)) errors[`categories.${category}`] = "key";
    }
    // One accounting group code on one category only, as the categories
    // screen and PUT /api/admin/taxonomy/meta require. The body's map
    // replaces the stored one whole, so the body alone is checked.
    const shared = categoriesSharingCode(value as Record<string, { externalId?: string | null }>);
    for (const category of Object.keys(shared)) errors[`categories.${category}.externalId`] = "duplicate";
    return;
  }
  const kind = fieldKind(key, field);
  if (kind === "email" && typeof value === "string" && value.trim() !== "" && !EMAIL.test(value.trim())) {
    errors[field] = "format";
  }
  if (kind === "emails" && Array.isArray(value)) {
    value.forEach((item, index) => {
      if (typeof item !== "string" || !EMAIL.test(item.trim())) errors[`${field}.${index}`] = "format";
    });
  }
  if (kind === "phone" && typeof value === "string" && value.trim() !== "") {
    const digits = value.replace(/[^0-9]/g, "").length;
    if (!PHONE.test(value.trim()) || digits < 5) errors[field] = "format";
  }
  if (kind === "money" && typeof value === "number" && !isMoney(value)) errors[field] = "format";
  if (kind === "priceType" && typeof value === "string") {
    const exists = PRICE_TYPE_ID.test(value) && (await (await collection("priceTypes")).countDocuments({ _id: value }, { limit: 1 })) > 0;
    if (!exists) errors[field] = "unknown-price-type";
  }
}

// Every problem of a body sent for group `key` (empty = acceptable).
export async function checkGroupBody(key: PlainSettingsKey, body: Record<string, unknown>): Promise<FieldErrors> {
  const errors: FieldErrors = {};
  checkValue(SETTINGS[key], body, "", errors);
  const shape = SETTINGS[key].shape as Record<string, z.ZodType>;
  for (const [field, value] of Object.entries(body)) {
    // Unknown fields and values the schema refused are reported already.
    if (!Object.hasOwn(shape, field)) continue;
    if (Object.keys(errors).some((at) => at === field || at.startsWith(`${field}.`))) continue;
    await checkKind(key, field, value, errors);
  }
  return errors;
}

// --- saving --------------------------------------------------------------------------------

const MAX_JOURNAL_VALUE = 2000;

function journalValue(value: unknown): unknown {
  return JSON.stringify(value ?? null).length > MAX_JOURNAL_VALUE ? "(завелике значення)" : value;
}

// The sentence form of a value in the journal line.
export function showValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "порожньо";
  if (Array.isArray(value)) return value.length ? `«${value.join(", ").slice(0, 80)}»` : "порожньо";
  if (typeof value === "string") return `«${value.slice(0, 80)}»`;
  if (typeof value === "object") return "змінено";
  return String(value);
}

export function describeChanges(key: PlainSettingsKey, changes: SettingsChange[]): string {
  return changes
    .map((change) =>
      typeof change.to === "object" && change.to !== null && !Array.isArray(change.to)
        ? `${fieldLabel(key, change.field)}: змінено`
        : `${fieldLabel(key, change.field)} ${showValue(change.from)} -> ${showValue(change.to)}`,
    )
    .join("; ");
}

// Merges the checked body into the stored group (fields left out keep
// their value), stores it when something changed, and tells what did.
export async function saveGroup<K extends PlainSettingsKey>(
  key: K,
  body: Record<string, unknown>,
  staffId: string,
): Promise<{ settings: PlainSettings[K]; changes: SettingsChange[] }> {
  const current = (await readGroup(key)) as Record<string, unknown>;
  const next = SETTINGS[key].parse({ ...current, ...body }) as Record<string, unknown>;
  const changes = Object.keys(next)
    .filter((field) => JSON.stringify(current[field]) !== JSON.stringify(next[field]))
    .map((field) => ({ field, from: journalValue(current[field]), to: journalValue(next[field]) }));
  if (changes.length === 0) return { settings: current as PlainSettings[K], changes };
  const saved = await saveSettings(key, next as SettingsOf<K>, staffId);
  return { settings: saved as PlainSettings[K], changes };
}
