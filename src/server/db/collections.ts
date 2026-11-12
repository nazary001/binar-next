import "server-only";
import type { Collection } from "mongodb";
import type { AccountType, CompanyData, PersonData } from "@/components/auth/data";
import type { BlogPost } from "@/components/blog/data";
import type { CartLine } from "@/components/cart/data";
import type { Product } from "@/components/catalog/data";
import type { CheckoutValues } from "@/components/checkout/data";
import type { MaterialCategory, MaterialFile } from "@/components/materials/data";
import type { AssortmentLine } from "@/components/platform/assortment/data";
import type { CancelRecord, Order, OrderDocumentCore, ReturnRequest } from "@/components/platform/orders/data";
import type { Contract, Counterparty, Employee } from "@/components/platform/profile/data";
import type { SpecRow } from "@/components/product/data";
import { getDb } from "./client";

// The document shapes of the `binar` database (design:
// docs/superpowers/specs/2026-11-11-mongodb-integration-design.md, 4).
//
// Conventions:
// - `_id` is always a string and is the business id the UI already uses
//   ("shampoo-1", "48291064", "demo-b2b"). No ObjectId anywhere.
// - Money is a number of UAH with at most 2 decimals (the UI's own unit).
// - `seed: true` marks documents written by `npm run db:seed`; the seed
//   upserts those and never touches a document without the flag.
// - Dates that the UI shows as "YYYY-MM-DD" strings stay strings; technical
//   timestamps (createdAt, expiresAt) are BSON dates.

type Stamps = { createdAt: Date; updatedAt: Date };
type Seeded = { seed?: true };

// --- accounts ---------------------------------------------------------------

export type UserRole = "b2b_admin" | "b2b_manager";

export type UserDoc = Stamps &
  Seeded & {
    _id: string;
    type: AccountType;
    // What the person signs in with: national phone digits or the lower-cased
    // e-mail (auth/data.ts normalizeLogin).
    login: string;
    // The sign-up phone ("" when the account was created with an e-mail).
    phone: string;
    // Every normalized identifier this account can sign in with (login,
    // phone, person.email). Unique across the collection (multikey index).
    loginKeys: string[];
    // scrypt$<log2 N>$<r>$<p>$<salt>$<hash>, see auth/password.ts.
    passwordHash: string;
    person: PersonData;
    // B2C: stays EMPTY_COMPANY. B2B: unused, the company is the client doc.
    company: CompanyData;
    // B2B only: the partner company (holding) this buyer belongs to.
    clientId: string | null;
    role: UserRole | null;
    isActive: boolean;
    // The "Vitaiemo na platformi" modal shows once, after the first login.
    welcomed: boolean;
    // Downscaled logo as a data URL (the UI stores a 288 px square).
    logo: string | null;
    lastLoginAt: Date | null;
    // Created through POST /api/dev/session (test mode only).
    test?: true;
  };

export type SessionDoc = {
  _id: string; // sha256 (hex) of the cookie token
  userId: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date; // TTL index
  userAgent: string | null;
};

export type PasswordResetDoc = {
  _id: string; // sha256 (hex) of the token in the link
  userId: string;
  login: string;
  createdAt: Date;
  expiresAt: Date; // TTL index
  usedAt: Date | null;
};

export type RateLimitDoc = {
  _id: string; // "<scope>:<key>"
  count: number;
  expiresAt: Date; // TTL index
};

// Messages a mailer / SMS gateway will deliver once one is connected.
// A message that must not outlive what it announces carries `expiresAt`
// (TTL index): a password-reset notice expires with its reset link. No
// message ever holds a live secret (a reset token, a session token).
export type OutboxDoc = {
  _id: string;
  kind: "password-reset" | "email-changed" | "employee-invite" | "lead";
  to: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  sentAt: Date | null;
  expiresAt?: Date;
};

// --- partner companies ------------------------------------------------------

export type ClientDoc = Stamps &
  Seeded & {
    _id: string;
    name: string;
    edrpou: string;
    region: string;
    city: string;
    // One invitation link per company (profile page, "Spivrobitnyky").
    inviteToken: string;
    // The partner's discount from the wholesale list price, in percent.
    discountPercent: number;
    // Credit limit per counterparty name, as the dashboard shows them.
    creditLimits: { counterparty: string; limit: number }[];
    // Demo data only: the fixed "today" (YYYY-MM-DD) the seeded orders were
    // built around. null = the real Kyiv date.
    demoToday: string | null;
    // Created through POST /api/dev/session (test mode only).
    test?: true;
  };

export type CounterpartyDoc = Stamps &
  Seeded &
  Omit<Counterparty, "id" | "contracts"> & {
    _id: string;
    clientId: string;
    sort: number;
    contracts: Contract[];
  };

export type EmployeeDoc = Stamps &
  Seeded &
  Omit<Employee, "id"> & {
    _id: string;
    clientId: string;
    sort: number;
    // Package F, seeded demo invitations only: the profile answer stamps
    // invitedAt with the current time (it was "now" for every viewer of the
    // browser mock); a real resend removes the flag.
    invitedAtFloating?: true;
  };

// --- catalog ----------------------------------------------------------------

// The product page content. Related products are stored as ids and resolved
// when the page is rendered.
export type ProductDetailsDoc = {
  sku: string;
  description: string;
  benefits: string[];
  characteristics: SpecRow[];
  payment: SpecRow[];
  delivery: SpecRow[];
  scent: { intro: string; top: string; middle: string; base: string };
  images: string[];
  platformImages: string[];
  boughtTogether: { productId: string; benefits: string[] }[];
  seriesIds: string[];
  similarIds: string[];
};

export type ProductDoc = Stamps &
  Seeded &
  Omit<Product, "id"> & {
    _id: string;
    // Listing order ("za populiarnistiu" = this order).
    sort: number;
    // false = has a product page but appears in no listing.
    listed: boolean;
    directionSlug: string;
    categorySlug: string;
    details: ProductDetailsDoc;
  };

// --- shop -------------------------------------------------------------------

export type CartDoc = {
  _id: string; // userId
  lines: CartLine[];
  updatedAt: Date;
};

// `seed` (optional, package F): the demo partner's seeded assortment.
export type AssortmentDoc = Seeded & {
  _id: string; // userId
  lines: AssortmentLine[];
  updatedAt: Date;
};

// A document of an order as stored: the tile's fields plus where the file
// is (a path under public/ today, later a blob URL). `file` never reaches
// the browser; the DTO's `href` is the session-checked API route
// (GET /api/orders/<id>/documents/<docId>), which redirects to it.
export type OrderDocumentDoc = OrderDocumentCore & { file: string | null };

// A partner's order ("b2b"), listed in the cabinet of `clientId`: every
// field of the cabinet's Order type (the payload is built from these),
// the documents with their file locations, and the cancel record.
export type B2bOrderDoc = Stamps &
  Seeded &
  Omit<Order, "id" | "documents"> & {
    _id: string; // = number
    channel: "b2b";
    clientId: string;
    userId: string | null; // the buyer who placed it (null for the seed)
    documents: OrderDocumentDoc[];
    // "Скасувати замовлення": an instant cancel also sets status
    // "cancelled"; a request (order "inProgress") keeps the status.
    cancel?: CancelRecord;
    // What was typed at checkout (orders created by POST /api/orders).
    checkout?: CheckoutValues;
    // Held for a few seconds while a return request of this order is
    // checked and written, so two requests cannot return the same goods.
    returnLock?: Date;
  };

// One line of a retail order: a snapshot of the product at order time.
export type RetailOrderItem = {
  productId: string;
  title: string;
  // The product page's article (details.sku), "" when it has none.
  sku: string;
  image: string;
  qty: number;
  // Unit price charged (UAH), from the products collection.
  price: number;
};

// An order placed at checkout by a guest or a B2C customer ("retail").
export type RetailOrderDoc = Stamps & {
  _id: string; // = number ("BN-" + 6 digits)
  channel: "retail";
  clientId: null;
  userId: string | null; // null = guest
  number: string;
  date: string; // YYYY-MM-DD, Kyiv
  status: "new";
  items: RetailOrderItem[];
  total: number;
  // The checkout form as sent (pruned to the chosen delivery / invoice).
  checkout: CheckoutValues;
};

export type OrderDoc = B2bOrderDoc | RetailOrderDoc;

export type ReturnDoc = Stamps &
  Seeded &
  Omit<ReturnRequest, "id"> & {
    _id: string;
    clientId: string;
    userId: string | null;
    // The cabinet day the request was withdrawn (status is "cancelled").
    withdrawnAt?: string;
  };

// Number sequences (package E): "orders-b2b" (8-digit partner order
// numbers), "orders-retail" (the digits of "BN-xxxxxx"), "returns".
export type CounterDoc = {
  _id: string;
  seq: number;
};

// --- content ----------------------------------------------------------------

export type MaterialCategoryDoc = Seeded &
  Omit<MaterialCategory, "slug"> & {
    _id: string; // slug
    sort: number;
  };

export type MaterialFileDoc = Seeded &
  Omit<MaterialFile, "id" | "preview"> & {
    _id: string;
    sort: number;
    // Where the bytes of a downloadable file are (today a path under
    // public/, later a blob URL). The public `href` is the download route,
    // which checks access and redirects here; the path itself reaches the
    // browser only as the preview picture of a `png` every viewer may
    // download. Absent on `url` files, whose `href` is the external link.
    storagePath?: string;
  };

export type BlogBody = {
  intro: string;
  sections: { heading: string; paragraphs: string[] }[];
  listSection: { heading: string; items: string[] };
  tags: string[];
};

export type BlogPostDoc = Seeded &
  Omit<BlogPost, "slug"> & {
    _id: string; // slug
    sort: number;
    body: BlogBody;
  };

export type LeadDoc = {
  _id: string;
  kind: "quiz" | "star-checklist" | "partner-contact";
  // The page the form was sent from (pathname).
  source: string;
  payload: Record<string, unknown>;
  contact: { name?: string; email?: string; phone?: string; company?: string };
  userId: string | null;
  userAgent: string | null;
  status: "new";
  createdAt: Date;
};

// --- access -----------------------------------------------------------------

export const COLLECTION = {
  users: "users",
  sessions: "sessions",
  passwordResets: "password_resets",
  rateLimits: "rate_limits",
  outbox: "outbox",
  clients: "clients",
  counterparties: "counterparties",
  employees: "employees",
  products: "products",
  carts: "carts",
  assortments: "assortments",
  orders: "orders",
  returns: "returns",
  counters: "counters",
  materialCategories: "material_categories",
  materialFiles: "material_files",
  blogPosts: "blog_posts",
  leads: "leads",
} as const;

export type CollectionDocs = {
  users: UserDoc;
  sessions: SessionDoc;
  passwordResets: PasswordResetDoc;
  rateLimits: RateLimitDoc;
  outbox: OutboxDoc;
  clients: ClientDoc;
  counterparties: CounterpartyDoc;
  employees: EmployeeDoc;
  products: ProductDoc;
  carts: CartDoc;
  assortments: AssortmentDoc;
  orders: OrderDoc;
  returns: ReturnDoc;
  counters: CounterDoc;
  materialCategories: MaterialCategoryDoc;
  materialFiles: MaterialFileDoc;
  blogPosts: BlogPostDoc;
  leads: LeadDoc;
};

export type CollectionKey = keyof CollectionDocs;

// `const users = await collection("users")` - a typed handle.
export async function collection<K extends CollectionKey>(key: K): Promise<Collection<CollectionDocs[K]>> {
  return (await getDb()).collection<CollectionDocs[K]>(COLLECTION[key]);
}
