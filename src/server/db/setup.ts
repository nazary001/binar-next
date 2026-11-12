import "server-only";
import type { Db, Document, IndexDescription } from "mongodb";
import { COLLECTION } from "./collections";

// Collections, validators and indexes of the `binar` database. Idempotent:
// `npm run db:setup` (and the seed, which calls it first) can run any
// number of times. Validators need the admin connection (collMod is not in
// readWrite), which is why the scripts prefer MONGODB_ADMIN_URI.
//
// The validators only pin the invariants a wrong write would break for
// everyone (ids are strings, required keys exist, enums). Field-level rules
// live in the zod schemas of the route handlers.

type Spec = {
  validator?: Document;
  indexes?: IndexDescription[];
};

const str = { bsonType: "string" } as const;
const date = { bsonType: "date" } as const;
const bool = { bsonType: "bool" } as const;
const num = { bsonType: ["int", "long", "double", "decimal"] } as const;

function schema(required: string[], properties: Document): Document {
  return { $jsonSchema: { bsonType: "object", required, properties } };
}

const SPECS: Record<string, Spec> = {
  [COLLECTION.users]: {
    validator: schema(
      ["_id", "type", "login", "loginKeys", "passwordHash", "person", "company", "isActive", "welcomed", "createdAt", "updatedAt"],
      {
        _id: str,
        type: { enum: ["b2b", "b2c"] },
        login: { bsonType: "string", minLength: 1 },
        phone: str,
        loginKeys: { bsonType: "array", minItems: 1, items: { bsonType: "string", minLength: 1 } },
        passwordHash: str,
        person: { bsonType: "object" },
        company: { bsonType: "object" },
        clientId: { bsonType: ["string", "null"] },
        role: { enum: ["b2b_admin", "b2b_manager", null] },
        isActive: bool,
        welcomed: bool,
        logo: { bsonType: ["string", "null"] },
        createdAt: date,
        updatedAt: date,
      },
    ),
    indexes: [
      { key: { loginKeys: 1 }, name: "loginKeys_unique", unique: true },
      { key: { clientId: 1 }, name: "clientId" },
    ],
  },
  [COLLECTION.sessions]: {
    validator: schema(["_id", "userId", "createdAt", "expiresAt"], {
      _id: str,
      userId: str,
      createdAt: date,
      lastSeenAt: date,
      expiresAt: date,
    }),
    indexes: [
      { key: { expiresAt: 1 }, name: "ttl", expireAfterSeconds: 0 },
      { key: { userId: 1 }, name: "userId" },
    ],
  },
  [COLLECTION.passwordResets]: {
    validator: schema(["_id", "userId", "login", "createdAt", "expiresAt"], {
      _id: str,
      userId: str,
      login: str,
      createdAt: date,
      expiresAt: date,
    }),
    indexes: [
      { key: { expiresAt: 1 }, name: "ttl", expireAfterSeconds: 0 },
      { key: { userId: 1 }, name: "userId" },
      // At most one unused link per account: a newer request replaces the
      // older one, and parallel requests cannot leave several live tokens.
      {
        key: { userId: 1 },
        name: "userId_live_unique",
        unique: true,
        partialFilterExpression: { usedAt: { $type: "null" } },
      },
    ],
  },
  [COLLECTION.rateLimits]: {
    indexes: [{ key: { expiresAt: 1 }, name: "ttl", expireAfterSeconds: 0 }],
  },
  [COLLECTION.outbox]: {
    indexes: [
      { key: { sentAt: 1, createdAt: 1 }, name: "pending" },
      // Only messages that carry `expiresAt` (password-reset notices) expire.
      { key: { expiresAt: 1 }, name: "ttl", expireAfterSeconds: 0 },
    ],
  },
  [COLLECTION.clients]: {
    validator: schema(["_id", "name", "inviteToken", "discountPercent", "creditLimits", "createdAt", "updatedAt"], {
      _id: str,
      name: str,
      edrpou: str,
      region: str,
      city: str,
      inviteToken: str,
      // A discount from the list price: 0 up to (not including) 100.
      discountPercent: { ...num, minimum: 0, maximum: 100, exclusiveMaximum: true },
      creditLimits: { bsonType: "array" },
      demoToday: { bsonType: ["string", "null"] },
    }),
  },
  [COLLECTION.counterparties]: {
    validator: schema(["_id", "clientId", "name", "contracts"], {
      _id: str,
      clientId: str,
      name: str,
      contracts: { bsonType: "array" },
    }),
    indexes: [{ key: { clientId: 1, sort: 1 }, name: "client_sort" }],
  },
  [COLLECTION.employees]: {
    validator: schema(["_id", "clientId", "status"], {
      _id: str,
      clientId: str,
      status: { enum: ["active", "invited"] },
      invitedAtFloating: bool,
    }),
    indexes: [{ key: { clientId: 1, sort: 1 }, name: "client_sort" }],
  },
  [COLLECTION.products]: {
    validator: schema(
      ["_id", "sort", "listed", "title", "image", "subcategory", "directionSlug", "categorySlug", "price", "available", "details"],
      {
        _id: str,
        sort: num,
        listed: bool,
        title: { bsonType: "string", minLength: 1 },
        image: str,
        subcategory: str,
        directionSlug: str,
        categorySlug: str,
        price: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
        available: bool,
        details: { bsonType: "object" },
      },
    ),
    indexes: [
      { key: { listed: 1, sort: 1 }, name: "listing" },
      { key: { directionSlug: 1, categorySlug: 1, sort: 1 }, name: "category" },
    ],
  },
  [COLLECTION.carts]: {
    validator: schema(["_id", "lines", "updatedAt"], { _id: str, lines: { bsonType: "array" }, updatedAt: date }),
  },
  [COLLECTION.assortments]: {
    validator: schema(["_id", "lines", "updatedAt"], { _id: str, lines: { bsonType: "array" }, updatedAt: date }),
  },
  [COLLECTION.orders]: {
    validator: schema(["_id", "channel", "number", "date", "total", "status", "items", "createdAt", "updatedAt"], {
      _id: str,
      channel: { enum: ["b2b", "retail"] },
      clientId: { bsonType: ["string", "null"] },
      userId: { bsonType: ["string", "null"] },
      number: str,
      date: str,
      total: num,
      status: str,
      items: { bsonType: "array" },
    }),
    indexes: [
      { key: { clientId: 1, date: -1, _id: -1 }, name: "client_date" },
      { key: { userId: 1, createdAt: -1 }, name: "user_created" },
    ],
  },
  [COLLECTION.returns]: {
    validator: schema(["_id", "clientId", "orderId", "date", "status", "lines"], {
      _id: str,
      clientId: str,
      orderId: str,
      date: str,
      status: str,
      lines: { bsonType: "array" },
    }),
    indexes: [
      { key: { clientId: 1, date: -1, _id: -1 }, name: "client_date" },
      { key: { orderId: 1 }, name: "orderId" },
      // The cabinet's list order (repos/orders.ts RETURN_SORT).
      { key: { clientId: 1, createdAt: -1, _id: -1 }, name: "client_created" },
    ],
  },
  [COLLECTION.counters]: {},
  [COLLECTION.materialCategories]: {
    indexes: [{ key: { sort: 1 }, name: "sort" }],
  },
  [COLLECTION.materialFiles]: {
    validator: schema(["_id", "category", "name", "type"], {
      _id: str,
      category: str,
      name: str,
      type: str,
      // Optional (package C): where a stored file lives; url files have none.
      storagePath: str,
    }),
    indexes: [{ key: { category: 1, sort: 1 }, name: "category_sort" }],
  },
  [COLLECTION.blogPosts]: {
    validator: schema(["_id", "title", "sort"], { _id: str, title: str, sort: num }),
    indexes: [{ key: { sort: 1 }, name: "sort" }],
  },
  [COLLECTION.leads]: {
    validator: schema(["_id", "kind", "source", "payload", "createdAt"], {
      _id: str,
      kind: { enum: ["quiz", "star-checklist", "partner-contact"] },
      source: str,
      payload: { bsonType: "object" },
      createdAt: date,
    }),
    indexes: [{ key: { createdAt: -1 }, name: "created" }],
  },
};

export type SetupReport = { collection: string; created: boolean; validator: string; indexes: number }[];

export async function ensureSchema(db: Db): Promise<SetupReport> {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  const report: SetupReport = [];

  for (const [name, spec] of Object.entries(SPECS)) {
    const created = !existing.has(name);
    let validator = "none";
    if (created) {
      await db.createCollection(
        name,
        spec.validator ? { validator: spec.validator, validationLevel: "strict", validationAction: "error" } : {},
      );
      if (spec.validator) validator = "created";
    } else if (spec.validator) {
      try {
        await db.command({
          collMod: name,
          validator: spec.validator,
          validationLevel: "strict",
          validationAction: "error",
        });
        validator = "updated";
      } catch (error) {
        // The runtime user (readWrite) may not run collMod; the validator
        // set earlier with the admin connection stays in force.
        validator = `kept (${(error as { codeName?: string }).codeName ?? "collMod refused"})`;
      }
    }
    if (spec.indexes?.length) await db.collection(name).createIndexes(spec.indexes);
    report.push({ collection: name, created, validator, indexes: spec.indexes?.length ?? 0 });
  }
  return report;
}
