import "server-only";
import { collection, type PriceTypeDoc } from "../../../db/collections";
import { newId } from "../../../ids";
import type { PriceTypeInput } from "../contract";
import { failed, guarded, ok, same, type ApplyResult, type Outcome } from "../batch";

// PUT /price-types: the price types of BAS, upserted by externalId. What a
// price type is used for on the site (its role: base, individual) is
// decided in the panel; BAS never sets it.

export async function applyPriceTypes(items: PriceTypeInput[]): Promise<ApplyResult> {
  const types = await collection("priceTypes");
  const existing = await types.find({ externalId: { $in: items.map((item) => item.externalId) } }).toArray();
  const byExternal = new Map(existing.map((doc) => [doc.externalId, doc]));
  const outcomes: Outcome[] = [];
  for (const item of items) {
    outcomes.push(
      await guarded("price type", async () => {
        const doc = byExternal.get(item.externalId);
        const fields = {
          name: item.name,
          currency: item.currency ?? doc?.currency ?? "UAH",
          vatIncluded: item.vatIncluded ?? doc?.vatIncluded ?? true,
        };
        const now = new Date();
        if (!doc) {
          const created: PriceTypeDoc = {
            _id: newId("pt"),
            externalId: item.externalId,
            role: null,
            createdAt: now,
            updatedAt: now,
            ...fields,
          };
          await types.insertOne(created);
          return ok("created");
        }
        if (same(fields, { name: doc.name, currency: doc.currency, vatIncluded: doc.vatIncluded })) return ok("unchanged");
        const result = await types.updateOne({ _id: doc._id }, { $set: { ...fields, updatedAt: now } });
        return result.matchedCount ? ok("updated") : failed("conflict: the price type was removed meanwhile");
      }),
    );
  }
  return { outcomes };
}
