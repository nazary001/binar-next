import "server-only";
import type { Document } from "mongodb";
import { getDb } from "../db/client";
import { COLLECTION, type CollectionDocs, type CollectionKey } from "../db/collections";

// Shared pieces of the seeders (src/server/seed/<name>.ts).
//
// A seeder restores ITS part of the demo data to a pristine state. It may
// overwrite or delete documents flagged `seed: true`, and anything that
// belongs to the demo company or the two demo accounts (so a reseed also
// undoes what the audit scripts did: cancelled orders, new returns, edited
// profile rows). It must never touch another company's or another user's
// documents.

export const DEMO_CLIENT_ID = "client-demo";
export const DEMO_B2B_ID = "demo-b2b";
export const DEMO_B2C_ID = "demo-b2c";

// The date the demo cabinet data was built around (orders/data.ts ANCHOR).
export const DEMO_TODAY = "2026-05-24";

export type SeedContext = {
  // Password of the two demo accounts (env SEED_DEMO_PASSWORD).
  demoPassword: string;
  log: (line: string) => void;
};

export type Seeder = (ctx: SeedContext) => Promise<string>;

export function seedContextFromEnv(log: (line: string) => void = console.log): SeedContext {
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (!demoPassword) {
    throw new Error("SEED_DEMO_PASSWORD is not set (the password of the demo accounts, see .env.example).");
  }
  return { demoPassword, log };
}

// Makes the documents of `key` inside `scope` exactly `docs`:
// upserts every given document (flagged `seed: true`) and deletes the other
// documents of the scope. The default scope is "everything the seed wrote
// before" ({ seed: true }); pass e.g. { clientId: DEMO_CLIENT_ID } to also
// remove documents created at runtime for the demo company.
export async function replaceSeedDocs<K extends CollectionKey>(
  key: K,
  docs: CollectionDocs[K][],
  scope: Document = { seed: true },
): Promise<string> {
  const target = (await getDb()).collection<Document & { _id: string }>(COLLECTION[key]);
  const ids = docs.map((doc) => doc._id);
  const removed = await target.deleteMany({ ...scope, _id: { $nin: ids } });
  if (docs.length > 0) {
    await target.bulkWrite(
      docs.map((doc) => ({
        replaceOne: { filter: { _id: doc._id }, replacement: { ...doc, seed: true }, upsert: true },
      })),
      { ordered: false },
    );
  }
  return `${COLLECTION[key]}: ${docs.length} written, ${removed.deletedCount} removed`;
}
