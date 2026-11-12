import "server-only";
import type { Binary, Collection } from "mongodb";
import type { AccountType, CompanyData, PersonData } from "@/components/auth/data";
import type { BlogPost } from "@/components/blog/data";
import type { CartLine } from "@/components/cart/data";
import type { Product } from "@/components/catalog/data";
import type { CheckoutValues } from "@/components/checkout/data";
import type { MaterialCategory, MaterialFile } from "@/components/materials/data";
import type { AssortmentLine } from "@/components/platform/assortment/data";
import type {
  CancelRecord,
  Order,
  OrderDocumentCore,
  OrderStatus,
  PaymentState,
  ReturnRequest,
} from "@/components/platform/orders/data";
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
  kind:
    | "password-reset"
    | "email-changed"
    | "employee-invite"
    | "lead"
    // Written by the staff area and the order flow (admin panel).
    | "order-placed"
    | "order-status"
    | "staff-invite"
    | "staff-password";
  to: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  sentAt: Date | null;
  expiresAt?: Date;
  // Delivery bookkeeping of the mailer (src/server/mail): how many times
  // it tried and the last refusal. Absent on messages nobody tried yet.
  attempts?: number;
  lastError?: string | null;
  lastAttemptAt?: Date | null;
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
  } & ClientStaffFields;

// What only staff and the ERP exchange write on a company (admin panel).
// All optional: a company created before the admin panel has none of them.
export type ClientStaffFields = {
  // GUID of the client / partner in the ERP (BAS).
  externalId?: string | null;
  // customer_groups._id; absent = the default "registered" group.
  groupId?: string | null;
  // staff._id of the manager who looks after the company.
  managerId?: string | null;
  // false = the partner cabinet is switched off (the "B2B_Active" trigger).
  isActive?: boolean;
  // Show real stock figures to this company, capped at `stockDisplayMax`
  // (null = the shop setting).
  showStock?: boolean;
  stockDisplayMax?: number | null;
  notes?: StaffNote[];
  erpSyncedAt?: Date | null;
};

// What the ERP knows about a contract beyond the cabinet's tile.
export type ContractErpFields = {
  externalId?: string | null;
  discountPercent?: number;
  creditLimit?: number;
  currentDebt?: number;
  overdueDebt?: number;
  oldestDebtDays?: number;
  // "prepayment" | "deferred" | "schedule", plus the days of a deferral.
  paymentTerms?: string;
  paymentDays?: number | null;
  priceTypeId?: string | null;
  isActive?: boolean;
};

export type ContractDoc = Contract & ContractErpFields;

export type CounterpartyDoc = Stamps &
  Seeded &
  Omit<Counterparty, "id" | "contracts"> & {
    _id: string;
    clientId: string;
    sort: number;
    contracts: ContractDoc[];
    // GUID of the legal entity in the ERP.
    externalId?: string | null;
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
  } & ProductStaffFields;

// A packaging unit of a product ("product_packaging" of the requirement
// document): the unit a partner may order in and how many base units it
// holds.
export type ProductPackage = {
  id: string;
  name: string;
  coefficient: number;
  // Unit code in the ERP ("796", "778").
  unitCode: string;
  isDefault: boolean;
  externalId?: string | null;
};

// A certificate or another file attached to a product ("product_documents").
export type ProductFile = { id: string; name: string; file: string };

// What only staff and the ERP exchange write on a product. All optional;
// none of it reaches the public catalog DTO (repos/catalog.ts PUBLIC_FIELDS)
// unless that list names it.
export type ProductStaffFields = {
  // GUID of the item in the ERP; prices and stock arrive keyed by it.
  externalId?: string | null;
  barcode?: string;
  // Free stock in base units as the ERP reported it (null = unknown). The
  // storefront still decides by `available` / `preorder`.
  stockQty?: number | null;
  leadTimeDays?: number | null;
  // The day (YYYY-MM-DD) the ERP expects the next delivery, when it says.
  expectedDate?: string | null;
  // Base unit ("шт") and its ERP code.
  unit?: string;
  unitCode?: string;
  packages?: ProductPackage[];
  // Order step in base units (1 = any quantity).
  multiplicity?: number;
  isCustomizable?: boolean;
  minCustomQty?: number | null;
  isNew?: boolean;
  isFeatured?: boolean;
  country?: string;
  manufacturer?: string;
  // Price per price type (price_types._id) as the ERP sent it, UAH.
  prices?: Record<string, number>;
  // The currency the price follows (the "fxPrice" notice names it).
  currencyLink?: "USD" | "EUR" | null;
  files?: ProductFile[];
  seoTitle?: string;
  seoDescription?: string;
  // Set = taken out of the shop: no listing, no page, kept for history.
  archivedAt?: Date | null;
  updatedBy?: string | null;
  erpSyncedAt?: Date | null;
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
export type OrderDocumentDoc = OrderDocumentCore & {
  file: string | null;
  // Set on a document the ERP pushed: its GUID there (a repeated push
  // replaces the same tile) and what kind of paper it is.
  externalId?: string | null;
  kind?: OrderDocumentKind;
};

export type OrderDocumentKind = "invoice" | "waybill" | "act" | "reconciliation" | "other";

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
    // The contract the order was placed under (counterparties.contracts.id),
    // when the buyer or the ERP named one.
    contractId?: string | null;
    // "Скасувати замовлення": an instant cancel also sets status
    // "cancelled"; a request (order "inProgress") keeps the status.
    cancel?: CancelRecord;
    // What was typed at checkout (orders created by POST /api/orders).
    checkout?: CheckoutValues;
    // Held for a few seconds while a return request of this order is
    // checked and written, so two requests cannot return the same goods.
    returnLock?: Date;
  } & OrderStaffFields;

// --- staff processing (admin panel) -----------------------------------------

// Who did something: a member of staff, the site itself, an external
// system calling the exchange API, or the customer.
export type Actor = { id: string; name: string; kind: "staff" | "system" | "integration" | "customer" };

export type StaffNote = { id: string; at: Date; by: { id: string; name: string }; text: string };

export type OrderHistoryEntry = {
  at: Date;
  by: Actor;
  type: "created" | "status" | "payment" | "note" | "shipment" | "document" | "cancel" | "manager" | "erp" | "edit";
  from?: string;
  to?: string;
  text?: string;
};

export type ShipmentStatus =
  | "draft"
  | "created"
  | "in_transit"
  | "arrived"
  | "received"
  | "refused"
  | "returning"
  | "cancelled"
  | "unknown";

// A parcel of an order. `ttn` and `ref` come from the carrier (Nova Poshta
// InternetDocument.save: IntDocNumber, Ref) or are typed by staff.
export type OrderShipment = {
  carrier: "nova-poshta" | "pickup" | "other";
  ttn: string | null;
  ref: string | null;
  status: ShipmentStatus;
  // The carrier's own code and wording of the last tracking answer.
  statusCode: string | null;
  statusText: string | null;
  cost: number | null;
  // ISO date the carrier estimates.
  estimatedDate: string | null;
  recipient: {
    name: string;
    phone: string;
    city: string;
    cityRef: string | null;
    warehouse: string;
    warehouseRef: string | null;
    address: string | null;
  };
  // The carrier's own records of the recipient (Counterparty.save,
  // Address.save), kept so a repeat waybill or an update can reuse them.
  recipientRefs?: { counterpartyRef: string | null; contactRef: string | null; addressRef: string | null } | null;
  // What staff typed when attaching a number by hand (another carrier, a
  // pickup).
  note?: string | null;
  params: {
    weight: number;
    seats: number;
    declaredCost: number;
    description: string;
    payer: "Sender" | "Recipient";
    paymentMethod: "Cash" | "NonCash";
    serviceType: string;
    // Cash on delivery, UAH (null = none).
    cod: number | null;
    // Where the parcel is handed over, and its size in cm (a postomat
    // needs one).
    serviceKind?: "branch" | "postomat" | "address";
    dimensions?: { width: number; length: number; height: number } | null;
  } | null;
  createdAt: Date;
  createdBy: string | null;
  checkedAt: Date | null;
  events: { at: Date; code: string; text: string }[];
};

// The state of a document in the exchange with the ERP (BAS).
export type ErpLink = {
  // GUID and number of the document there, known after the ERP took it.
  externalId: string | null;
  number: string | null;
  state: "pending" | "acked" | "error" | "skipped";
  queuedAt: Date | null;
  ackedAt: Date | null;
  error: string | null;
};

// Fields only staff and integrations write on an order. None of them is
// part of the cabinet DTO: repos/orders.ts toOrderDto builds that field by
// field.
export type OrderStaffFields = {
  history?: OrderHistoryEntry[];
  notes?: StaffNote[];
  // staff._id of the manager working on the order.
  managerId?: string | null;
  shipment?: OrderShipment | null;
  erp?: ErpLink;
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
  // "new" when placed; staff move it on in the admin panel.
  status: OrderStatus;
  items: RetailOrderItem[];
  total: number;
  // The checkout form as sent (pruned to the chosen delivery / invoice).
  checkout: CheckoutValues;
  // Set by staff (absent = nothing recorded yet, shown as "awaiting").
  payment?: PaymentState;
  // Papers staff or the ERP attached (an invoice, a waybill). A shop order
  // starts without any.
  documents?: OrderDocumentDoc[];
} & OrderStaffFields;

export type OrderDoc = B2bOrderDoc | RetailOrderDoc;

export type ReturnDoc = Stamps &
  Seeded &
  Omit<ReturnRequest, "id"> & {
    _id: string;
    clientId: string;
    userId: string | null;
    // The cabinet day the request was withdrawn (status is "cancelled").
    withdrawnAt?: string;
    // Staff processing (admin panel); never part of the cabinet DTO.
    history?: OrderHistoryEntry[];
    notes?: StaffNote[];
    // Why staff refused the request (status "rejected").
    rejectReason?: string;
    // What was agreed to give back, UAH.
    refundAmount?: number | null;
    // Waybill of the goods travelling back.
    returnTtn?: string | null;
    erp?: ErpLink;
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
    // Stamped by the admin panel on every change (absent on seeded rows).
    updatedAt?: Date;
    updatedBy?: string | null;
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
    // Stamped by the admin panel on every change (absent on seeded rows).
    updatedAt?: Date;
    updatedBy?: string | null;
  };

export type BlogBody = {
  intro: string;
  sections: { heading: string; paragraphs: string[] }[];
  listSection: { heading: string; items: string[] };
  tags: string[];
};

// A block of the richer article body the admin editor writes. Text fields
// are plain text with a small inline mark-up the renderer understands:
// **bold**, *italic* and [label](https://link). Nothing else is rendered,
// so a stored string can never inject markup.
export type BlogBlock =
  | { type: "lede"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "image"; src: string; alt: string; caption: string }
  | { type: "quote"; text: string; author: string }
  | { type: "callout"; text: string }
  | { type: "divider" };

export type BlogStatus = "draft" | "published" | "scheduled";

// Written by the admin editor. All optional: a post without `status` (the
// seed, anything older than the admin panel) is published, and a post
// without `blocks` renders the classic `body`.
export type BlogStaffFields = {
  status?: BlogStatus;
  // When the post went live, or goes live ("scheduled").
  publishedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string | null;
  author?: string;
  readingMinutes?: number | null;
  coverAlt?: string;
  seoTitle?: string;
  seoDescription?: string;
  blocks?: BlogBlock[];
};

export type BlogPostDoc = Seeded &
  Omit<BlogPost, "slug"> & {
    _id: string; // slug
    sort: number;
    body: BlogBody;
  } & BlogStaffFields;

export type LeadDoc = {
  _id: string;
  kind: "quiz" | "star-checklist" | "partner-contact";
  // The page the form was sent from (pathname).
  source: string;
  payload: Record<string, unknown>;
  contact: { name?: string; email?: string; phone?: string; company?: string };
  userId: string | null;
  userAgent: string | null;
  // "new" when it arrives; staff move it on in the admin panel.
  status: LeadStatus;
  createdAt: Date;
  // Staff processing (admin panel).
  updatedAt?: Date;
  assigneeId?: string | null;
  notes?: StaffNote[];
};

export type LeadStatus = "new" | "in_progress" | "done" | "spam";

// --- staff area (admin panel) -------------------------------------------------

// A member of staff who may sign in at /admin. Deliberately not a `users`
// document: customers and staff never share a login, a session or a cookie.
export type StaffDoc = Stamps & {
  _id: string;
  // Lower-cased; the sign-in name. Unique.
  email: string;
  name: string;
  // scrypt, see auth/password.ts.
  passwordHash: string;
  // staff_roles._id.
  roleId: string;
  isActive: boolean;
  // The account was given a generated password: the panel asks for a new
  // one before anything else.
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdBy: string | null;
  // Accounts of the audit scripts; removed by their clean-up.
  test?: true;
};

export type StaffSessionDoc = {
  _id: string; // sha256 (hex) of the cookie token
  staffId: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date; // TTL index
  // "Remember me": a 30-day session instead of a 12-hour one.
  remember: boolean;
  userAgent: string | null;
  ip: string | null;
};

export type StaffRoleDoc = Stamps & {
  _id: string;
  name: string;
  description: string;
  // Permission keys (src/components/admin/lib/permissions.ts).
  permissions: string[];
  // Built-in roles; the owner role can never be edited or removed.
  system?: true;
};

// One line of the staff area's journal: who did what to which record.
export type AuditLogDoc = {
  _id: string;
  at: Date;
  actor: Actor;
  // "order.status", "blog.publish", "staff.sign-in", ...
  action: string;
  entity: { type: string; id: string; label: string } | null;
  // One human sentence in Ukrainian, shown in the journal as is.
  summary: string;
  meta: Record<string, unknown>;
  ip: string | null;
};

// One settings group per document ("general", "shop", "novaPoshta", ...);
// the shapes and defaults live in src/server/admin/settings.ts.
export type SettingDoc = {
  _id: string;
  value: Record<string, unknown>;
  updatedAt: Date;
  updatedBy: string | null;
};

// An uploaded file. The bytes live in `media_blobs` under the same id; a
// "public" file is served by GET /api/media/<id>, a "private" one only by
// the routes that check who is asking (order documents, locked materials).
export type MediaDoc = {
  _id: string;
  kind: "image" | "file";
  filename: string;
  contentType: string;
  size: number;
  width: number | null;
  height: number | null;
  // Where it was uploaded from: "blog" | "products" | "materials" | "orders" | "misc".
  folder: string;
  access: "public" | "private";
  alt: string;
  sha256: string;
  createdAt: Date;
  createdBy: string | null;
  // Set when staff rename the file or change its alt text.
  updatedAt?: Date;
  updatedBy?: string | null;
};

export type MediaBlobDoc = {
  _id: string; // = media._id
  data: Binary;
};

// A price type of the ERP ("Роздрібна", "Оптова") and what the site uses
// it for: "base" is what guests see, "individual" is the partners' list
// price before the contract discount.
export type PriceTypeDoc = Stamps & {
  _id: string;
  name: string;
  externalId: string | null;
  currency: string;
  vatIncluded: boolean;
  role: "base" | "individual" | null;
};

// A group of buyers and what it may see ("Групи покупців" of the
// requirement document). Two system groups always exist: "guests" and
// "registered".
export type CustomerGroupDoc = Stamps & {
  _id: string;
  name: string;
  description: string;
  priceTypeId: string | null;
  showStock: boolean;
  paymentMethods: string[];
  deliveryMethods: string[];
  // "<direction>/<category>" keys the group does not see.
  hiddenCategories: string[];
  system?: true;
};

// One movement of the settlements with a partner, as the ERP reports it
// ("accounting_ledger" of the requirement document).
export type LedgerEntryDoc = {
  _id: string;
  clientId: string;
  counterpartyId: string | null;
  contractId: string | null;
  // The site order the document belongs to (null for an opening balance).
  orderId: string | null;
  externalId: string;
  docType: "opening_balance" | "order" | "invoice" | "payment" | "return";
  docNumber: string;
  docDate: Date;
  amount: number;
  // plus = the debt grows, minus = it shrinks.
  impact: "plus" | "minus";
  createdAt: Date;
};

// A key an external system (the ERP) signs its calls to
// /api/integrations/* with. Only the SHA-256 of the key is stored.
export type ApiKeyDoc = {
  _id: string;
  name: string;
  // First characters of the key, shown in the panel to tell keys apart.
  prefix: string;
  hash: string;
  // "bas:read", "bas:write".
  scopes: string[];
  isActive: boolean;
  createdAt: Date;
  createdBy: string | null;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  lastUsedIp: string | null;
  // Set when staff rename the key, change its scopes or switch it off.
  updatedAt?: Date;
  updatedBy?: string | null;
};

// One call of an exchange (in either direction), for the panel's journal.
export type ExchangeLogDoc = {
  _id: string;
  at: Date;
  system: "bas" | "nova-poshta" | "mail";
  direction: "in" | "out";
  // "products", "prices", "stock", "orders", "waybill", "tracking", ...
  entity: string;
  action: string;
  status: "ok" | "partial" | "error";
  counts: { received: number; created: number; updated: number; unchanged: number; failed: number };
  durationMs: number;
  actor: Actor | null;
  batchId: string | null;
  error: string | null;
  // A few failed rows, for diagnosis; never a whole payload.
  details: { id: string; error: string }[];
  expiresAt: Date; // TTL index (90 days)
};

// The answer given to a batch of the exchange API, kept for a week so a
// repeated batch gets the same answer instead of being applied twice.
export type ExchangeBatchDoc = {
  _id: string; // "<entity>:<batchId>"
  response: Record<string, unknown>;
  createdAt: Date;
  expiresAt: Date; // TTL index
};

// Something the ERP has to pick up: a new order, a return request. The ERP
// reads the queue in `seq` order and acknowledges each entry.
export type ExchangeQueueDoc = {
  _id: string;
  seq: number;
  kind: "order" | "return";
  entityId: string;
  state: "pending" | "acked" | "error";
  attempts: number;
  createdAt: Date;
  ackedAt: Date | null;
  ack: { externalId: string | null; number: string | null } | null;
  error: string | null;
};

// Cached answers of the carrier's directory (cities, branches), so a
// search box does not call the carrier on every keystroke.
export type CarrierCacheDoc = {
  _id: string;
  data: unknown;
  expiresAt: Date; // TTL index
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
  // Staff area (admin panel).
  staff: "staff",
  staffSessions: "staff_sessions",
  staffRoles: "staff_roles",
  auditLog: "audit_log",
  settings: "settings",
  media: "media",
  mediaBlobs: "media_blobs",
  priceTypes: "price_types",
  customerGroups: "customer_groups",
  ledger: "ledger",
  apiKeys: "api_keys",
  exchangeLog: "exchange_log",
  exchangeBatches: "exchange_batches",
  exchangeQueue: "exchange_queue",
  carrierCache: "carrier_cache",
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
  staff: StaffDoc;
  staffSessions: StaffSessionDoc;
  staffRoles: StaffRoleDoc;
  auditLog: AuditLogDoc;
  settings: SettingDoc;
  media: MediaDoc;
  mediaBlobs: MediaBlobDoc;
  priceTypes: PriceTypeDoc;
  customerGroups: CustomerGroupDoc;
  ledger: LedgerEntryDoc;
  apiKeys: ApiKeyDoc;
  exchangeLog: ExchangeLogDoc;
  exchangeBatches: ExchangeBatchDoc;
  exchangeQueue: ExchangeQueueDoc;
  carrierCache: CarrierCacheDoc;
};

export type CollectionKey = keyof CollectionDocs;

// `const users = await collection("users")` - a typed handle.
export async function collection<K extends CollectionKey>(key: K): Promise<Collection<CollectionDocs[K]>> {
  return (await getDb()).collection<CollectionDocs[K]>(COLLECTION[key]);
}
