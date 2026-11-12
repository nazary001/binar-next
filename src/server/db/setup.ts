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
      // The staff area's customer list (newest first, by type).
      { key: { createdAt: -1 }, name: "created" },
      { key: { type: 1, createdAt: -1 }, name: "type_created" },
      // Its other sorts: by name and by the last sign-in.
      { key: { "person.fullName": 1 }, name: "fullName" },
      { key: { lastLoginAt: -1 }, name: "lastLogin" },
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
      // The notice of a form submission, found from the lead's page.
      { key: { "payload.leadId": 1 }, name: "lead", partialFilterExpression: { kind: "lead" } },
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
    indexes: [
      // One company per ERP client (the exchange upserts by this id).
      {
        key: { externalId: 1 },
        name: "externalId_unique",
        unique: true,
        partialFilterExpression: { externalId: { $type: "string" } },
      },
      // The staff area's company filters (buyer group, manager).
      { key: { groupId: 1 }, name: "groupId" },
      { key: { managerId: 1 }, name: "managerId" },
    ],
  },
  [COLLECTION.counterparties]: {
    validator: schema(["_id", "clientId", "name", "contracts"], {
      _id: str,
      clientId: str,
      name: str,
      contracts: { bsonType: "array" },
    }),
    indexes: [
      { key: { clientId: 1, sort: 1 }, name: "client_sort" },
      {
        key: { externalId: 1 },
        name: "externalId_unique",
        unique: true,
        partialFilterExpression: { externalId: { $type: "string" } },
      },
      // The exchange finds a contract by its ERP id (settlements, clients).
      { key: { "contracts.externalId": 1 }, name: "contract_externalId" },
    ],
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
      // The ERP exchange finds a product by its GUID or by the article.
      {
        key: { externalId: 1 },
        name: "externalId_unique",
        unique: true,
        partialFilterExpression: { externalId: { $type: "string" } },
      },
      { key: { "details.sku": 1 }, name: "sku" },
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
      // The staff area's order list: every company and channel, newest
      // first, narrowed by channel or status; plus the parcels by waybill.
      { key: { createdAt: -1, _id: -1 }, name: "created" },
      { key: { channel: 1, createdAt: -1, _id: -1 }, name: "channel_created" },
      { key: { status: 1, createdAt: -1, _id: -1 }, name: "status_created" },
      {
        key: { "shipment.ttn": 1 },
        name: "shipment_ttn",
        partialFilterExpression: { "shipment.ttn": { $type: "string" } },
      },
      // The delivery section: parcels newest first, and the ones due for a
      // status refresh.
      {
        key: { "shipment.createdAt": -1, _id: -1 },
        name: "shipment_created",
        partialFilterExpression: { shipment: { $type: "object" } },
      },
      {
        key: { "shipment.carrier": 1, "shipment.checkedAt": 1 },
        name: "shipment_track",
        partialFilterExpression: { "shipment.ttn": { $type: "string" } },
      },
      // Orders of a manager; orders waiting for a cancel decision; the
      // business day the overview groups by; the ERP document of an order.
      { key: { managerId: 1, createdAt: -1 }, name: "manager_created" },
      { key: { "cancel.request": 1 }, name: "cancel_request", partialFilterExpression: { "cancel.request": true } },
      { key: { date: -1, _id: -1 }, name: "date" },
      {
        key: { "erp.externalId": 1 },
        name: "erp_externalId",
        partialFilterExpression: { "erp.externalId": { $type: "string" } },
      },
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
      // The staff area's list of every company's requests.
      { key: { createdAt: -1, _id: -1 }, name: "created" },
      { key: { status: 1, createdAt: -1, _id: -1 }, name: "status_created" },
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
    indexes: [
      { key: { sort: 1 }, name: "sort" },
      // Public posts (the storefront) and drafts (the panel's counters).
      { key: { status: 1, publishedAt: -1 }, name: "status_published" },
    ],
  },
  [COLLECTION.leads]: {
    validator: schema(["_id", "kind", "source", "payload", "createdAt"], {
      _id: str,
      kind: { enum: ["quiz", "star-checklist", "partner-contact"] },
      source: str,
      payload: { bsonType: "object" },
      createdAt: date,
    }),
    indexes: [
      { key: { createdAt: -1 }, name: "created" },
      { key: { status: 1, createdAt: -1 }, name: "status_created" },
      { key: { kind: 1, createdAt: -1 }, name: "kind_created" },
      // The form submissions of an account (its page in the staff area).
      { key: { userId: 1, createdAt: -1 }, name: "user_created" },
    ],
  },

  // --- staff area (admin panel) ---------------------------------------------
  [COLLECTION.staff]: {
    validator: schema(["_id", "email", "name", "passwordHash", "roleId", "isActive", "createdAt", "updatedAt"], {
      _id: str,
      email: { bsonType: "string", minLength: 3 },
      name: str,
      passwordHash: str,
      roleId: str,
      isActive: bool,
      mustChangePassword: bool,
      createdAt: date,
      updatedAt: date,
    }),
    indexes: [
      { key: { email: 1 }, name: "email_unique", unique: true },
      // Members of a role (the counts on the roles page, the role filter).
      { key: { roleId: 1 }, name: "roleId" },
    ],
  },
  [COLLECTION.staffSessions]: {
    validator: schema(["_id", "staffId", "createdAt", "expiresAt"], {
      _id: str,
      staffId: str,
      createdAt: date,
      lastSeenAt: date,
      expiresAt: date,
    }),
    indexes: [
      { key: { expiresAt: 1 }, name: "ttl", expireAfterSeconds: 0 },
      { key: { staffId: 1 }, name: "staffId" },
    ],
  },
  [COLLECTION.staffRoles]: {
    validator: schema(["_id", "name", "permissions"], {
      _id: str,
      name: { bsonType: "string", minLength: 1 },
      permissions: { bsonType: "array", items: str },
    }),
  },
  [COLLECTION.auditLog]: {
    validator: schema(["_id", "at", "actor", "action", "summary"], {
      _id: str,
      at: date,
      actor: { bsonType: "object" },
      action: str,
      summary: str,
    }),
    indexes: [
      { key: { at: -1 }, name: "at" },
      { key: { "entity.type": 1, "entity.id": 1, at: -1 }, name: "entity_at" },
      { key: { "actor.id": 1, at: -1 }, name: "actor_at" },
      { key: { action: 1, at: -1 }, name: "action_at" },
    ],
  },
  [COLLECTION.settings]: {
    validator: schema(["_id", "value", "updatedAt"], { _id: str, value: { bsonType: "object" }, updatedAt: date }),
  },
  [COLLECTION.media]: {
    validator: schema(["_id", "kind", "filename", "contentType", "size", "access", "createdAt"], {
      _id: str,
      kind: { enum: ["image", "file"] },
      filename: str,
      contentType: str,
      size: num,
      access: { enum: ["public", "private"] },
      createdAt: date,
    }),
    indexes: [
      { key: { folder: 1, createdAt: -1 }, name: "folder_created" },
      { key: { createdAt: -1 }, name: "created" },
      { key: { sha256: 1 }, name: "sha256" },
    ],
  },
  [COLLECTION.mediaBlobs]: {},
  [COLLECTION.priceTypes]: {
    validator: schema(["_id", "name"], { _id: str, name: { bsonType: "string", minLength: 1 } }),
    indexes: [
      {
        key: { externalId: 1 },
        name: "externalId_unique",
        unique: true,
        partialFilterExpression: { externalId: { $type: "string" } },
      },
    ],
  },
  [COLLECTION.customerGroups]: {
    validator: schema(["_id", "name"], { _id: str, name: { bsonType: "string", minLength: 1 } }),
  },
  [COLLECTION.ledger]: {
    validator: schema(["_id", "clientId", "externalId", "docType", "docDate", "amount", "impact"], {
      _id: str,
      clientId: str,
      externalId: str,
      docType: { enum: ["opening_balance", "order", "invoice", "payment", "return"] },
      docDate: date,
      amount: num,
      impact: { enum: ["plus", "minus"] },
    }),
    indexes: [
      { key: { externalId: 1 }, name: "externalId_unique", unique: true },
      { key: { clientId: 1, docDate: -1 }, name: "client_date" },
      { key: { orderId: 1 }, name: "orderId" },
    ],
  },
  [COLLECTION.apiKeys]: {
    validator: schema(["_id", "name", "hash", "scopes", "isActive", "createdAt"], {
      _id: str,
      name: str,
      hash: str,
      scopes: { bsonType: "array", items: str },
      isActive: bool,
      createdAt: date,
    }),
    indexes: [{ key: { hash: 1 }, name: "hash_unique", unique: true }],
  },
  [COLLECTION.exchangeLog]: {
    indexes: [
      { key: { expiresAt: 1 }, name: "ttl", expireAfterSeconds: 0 },
      { key: { at: -1 }, name: "at" },
      { key: { system: 1, entity: 1, at: -1 }, name: "system_entity_at" },
    ],
  },
  [COLLECTION.exchangeBatches]: {
    indexes: [{ key: { expiresAt: 1 }, name: "ttl", expireAfterSeconds: 0 }],
  },
  [COLLECTION.exchangeQueue]: {
    validator: schema(["_id", "seq", "kind", "entityId", "state", "createdAt"], {
      _id: str,
      seq: num,
      kind: { enum: ["order", "return"] },
      entityId: str,
      state: { enum: ["pending", "acked", "error"] },
      createdAt: date,
    }),
    indexes: [
      { key: { seq: 1 }, name: "seq_unique", unique: true },
      { key: { state: 1, seq: 1 }, name: "state_seq" },
      { key: { kind: 1, entityId: 1 }, name: "entity_unique", unique: true },
    ],
  },
  [COLLECTION.carrierCache]: {
    indexes: [{ key: { expiresAt: 1 }, name: "ttl", expireAfterSeconds: 0 }],
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
