import "server-only";
import { randomBytes } from "node:crypto";
import { slugify } from "@/components/admin/lib/format";
import { CATALOG_DIRECTIONS } from "@/components/catalog/data";
import { getSettings, type SettingsOf } from "../../../admin/settings";
import { TAG } from "../../../cache-tags";
import { collection, type ProductDoc, type ProductPackage } from "../../../db/collections";
import type { ProductInput } from "../contract";
import { failed, guarded, mapPool, ok, same, type ApplyResult, type Outcome } from "../batch";
import type { BasSettings } from "../handler";
import { indexProducts } from "./lookup";

// PUT /products: the item master of BAS.
//
// A product is found by its GUID, else by its article (details.sku) when
// that product has no GUID yet; the GUID is then attached. An existing
// product keeps what the site owns (title, photos, description, category,
// a promo price): only the accounting fields below are overwritten, and
// only those the item carries. A product BAS sends for the first time is
// created unlisted and unavailable, with the name as the title and a
// placeholder photo, in the category whose ERP group the "catalog"
// settings map (else the storefront's fallback category), so a manager
// finishes it in the panel; with publishNewProducts a product of a mapped
// category is listed at once. deleted: true archives and unlists.

export const PLACEHOLDER_IMAGE = "/figma-export/catalog/product-shampoo.png";

// The storefront's own fallback (catalog/data.ts productHref): the last
// card of hotels.
const FALLBACK = { direction: "hotels", category: "inshi-tovary" };

const CONCURRENCY = 6;

type Category = { directionSlug: string; categorySlug: string; label: string; mapped: boolean };

function categoryOf(groupExternalId: string | null | undefined, catalog: SettingsOf<"catalog">): Category {
  const fallbackLabel =
    CATALOG_DIRECTIONS.find((d) => d.slug === FALLBACK.direction)?.carousel.find((c) => c.slug === FALLBACK.category)
      ?.label ?? "Інші товари для готелів";
  const fallback = {
    directionSlug: FALLBACK.direction,
    categorySlug: FALLBACK.category,
    label: fallbackLabel,
    mapped: false,
  };
  if (!groupExternalId) return fallback;
  for (const [key, value] of Object.entries(catalog.categories)) {
    if (value.externalId !== groupExternalId) continue;
    const [directionSlug, categorySlug] = key.split("/");
    const card = CATALOG_DIRECTIONS.find((d) => d.slug === directionSlug)?.carousel.find(
      (c) => c.slug === categorySlug,
    );
    if (card) return { directionSlug, categorySlug, label: card.label, mapped: true };
  }
  return fallback;
}

const shortId = (prefix: string) => `${prefix}-${randomBytes(4).toString("hex")}`;

// The packages as the site stores them: exactly one default (the one BAS
// marks, else the first); a package keeps its site id when its GUID or
// unit code matches one already stored.
function packagesOf(input: NonNullable<ProductInput["packages"]>, current: ProductPackage[] | undefined): ProductPackage[] {
  const stored = Array.isArray(current) ? current : [];
  const marked = input.findIndex((pkg) => pkg.isDefault === true);
  const defaultIndex = marked >= 0 ? marked : 0;
  return input.map((pkg, index) => {
    // By GUID first; by unit code when one side has no GUID.
    const previous =
      (pkg.externalId ? stored.find((s) => s.externalId === pkg.externalId) : undefined) ??
      stored.find((s) => s.unitCode === pkg.unitCode && (!s.externalId || !pkg.externalId));
    return {
      id: previous?.id ?? shortId("pk"),
      name: pkg.name,
      coefficient: pkg.coefficient,
      unitCode: pkg.unitCode,
      isDefault: index === defaultIndex,
      externalId: pkg.externalId ?? null,
    };
  });
}

// The accounting fields an item carries, as they are stored.
function accountingFields(item: ProductInput, current: ProductDoc | null): Partial<ProductDoc> & Record<string, unknown> {
  const fields: Record<string, unknown> = { externalId: item.externalId, "details.sku": item.sku };
  if (item.barcode !== undefined) fields.barcode = item.barcode;
  if (item.unit) {
    fields.unit = item.unit.name;
    fields.unitCode = item.unit.code;
  }
  if (item.packages) {
    // Unchanged packages keep their ids, so only real changes count.
    fields.packages = packagesOf(item.packages, current?.packages);
  }
  if (item.multiplicity !== undefined) fields.multiplicity = item.multiplicity;
  if (item.manufacturer !== undefined) fields.manufacturer = item.manufacturer;
  if (item.country !== undefined) fields.country = item.country;
  if (item.isCustomizable !== undefined) fields.isCustomizable = item.isCustomizable;
  if (item.minCustomQty !== undefined) fields.minCustomQty = item.minCustomQty;
  if (item.leadTimeDays !== undefined) fields.leadTimeDays = item.leadTimeDays;
  return fields as Partial<ProductDoc> & Record<string, unknown>;
}

function currentValue(doc: ProductDoc, path: string): unknown {
  if (path === "details.sku") return doc.details?.sku;
  return (doc as unknown as Record<string, unknown>)[path];
}

async function freeProductId(sku: string): Promise<string> {
  const base = slugify(sku, 48) || shortId("erp");
  const products = await collection("products");
  const taken = await products.findOne({ _id: base }, { projection: { _id: 1 } });
  return taken ? `${base}-${randomBytes(2).toString("hex")}` : base;
}

export async function applyProducts(items: ProductInput[], settings: BasSettings): Promise<ApplyResult> {
  const products = await collection("products");
  const index = await indexProducts(
    items.map((item) => item.externalId),
    items.map((item) => item.sku),
  );

  // Read once, only when the batch creates something.
  let catalog: SettingsOf<"catalog"> | null = null;
  // New products go to the end of the listing order. One read of the top
  // sort per batch, shared by the parallel workers (the promise, not its
  // value, is kept, so two workers never read it twice).
  let topSort: Promise<number> | null = null;
  let allocated = 0;
  const allocateSort = async (): Promise<number> => {
    topSort ??= products
      .find({}, { projection: { sort: 1 } })
      .sort({ sort: -1 })
      .limit(1)
      .toArray()
      .then((top) => (typeof top[0]?.sort === "number" ? top[0].sort : -1));
    const base = await topSort;
    allocated += 1;
    return base + allocated;
  };

  const outcomes = await mapPool(items, CONCURRENCY, (item) =>
    guarded("product", async (): Promise<Outcome> => {
      let doc = index.byExternal.get(item.externalId) ?? null;
      if (!doc) {
        const bySku = (index.bySku.get(item.sku) ?? []).filter((p) => p.externalId !== item.externalId);
        if (bySku.length > 1) return failed(`ambiguous-sku: ${bySku.length} products carry this sku`);
        if (bySku.length === 1) {
          if (typeof bySku[0].externalId === "string" && bySku[0].externalId) {
            return failed(`sku-conflict: the sku belongs to product ${bySku[0].externalId}`);
          }
          doc = bySku[0];
        }
      }
      const now = new Date();

      if (!doc) {
        // Nothing to remove for a product the site never had.
        if (item.deleted) return ok("unchanged");
        catalog ??= await getSettings("catalog");
        const category = categoryOf(item.groupExternalId, catalog);
        // details.sku goes inside `details` below.
        const flat = accountingFields(item, null);
        delete flat["details.sku"];
        const created: ProductDoc = {
          _id: await freeProductId(item.sku),
          title: item.name,
          image: PLACEHOLDER_IMAGE,
          volume: "",
          brand: item.brand ?? "",
          subcategory: category.label,
          price: 0,
          available: false,
          sort: await allocateSort(),
          listed: settings.publishNewProducts && category.mapped,
          directionSlug: category.directionSlug,
          categorySlug: category.categorySlug,
          details: {
            sku: item.sku,
            description: "",
            benefits: [],
            characteristics: [],
            payment: [],
            delivery: [],
            scent: { intro: "", top: "", middle: "", base: "" },
            images: [PLACEHOLDER_IMAGE],
            platformImages: [PLACEHOLDER_IMAGE],
            boughtTogether: [],
            seriesIds: [],
            similarIds: [],
          },
          ...flat,
          externalId: item.externalId,
          erpSyncedAt: now,
          createdAt: now,
          updatedAt: now,
        };
        try {
          await products.insertOne(created);
        } catch (error) {
          // The id was taken meanwhile: one more try under a random suffix.
          if ((error as { code?: number }).code !== 11000) throw error;
          const again = await products.findOne({ externalId: item.externalId }, { projection: { _id: 1 } });
          if (again) return failed("conflict: the product was created meanwhile, retry");
          await products.insertOne({ ...created, _id: `${created._id.slice(0, 50)}-${randomBytes(3).toString("hex")}` });
        }
        return ok("created");
      }

      const fields = accountingFields(item, doc);
      const set: Record<string, unknown> = {};
      for (const [path, value] of Object.entries(fields)) {
        if (!same(currentValue(doc, path), value)) set[path] = value;
      }
      if (item.deleted) {
        if (!doc.archivedAt) set.archivedAt = now;
        if (doc.listed !== false) set.listed = false;
      }
      if (Object.keys(set).length === 0) return ok("unchanged");
      const result = await products.updateOne(
        { _id: doc._id },
        { $set: { ...set, erpSyncedAt: now, updatedAt: now }, $unset: { seed: "" } },
      );
      return result.matchedCount ? ok("updated") : failed("conflict: the product was removed meanwhile");
    }),
  );
  return { outcomes, revalidate: [TAG.catalog] };
}
