// The contract of the buyer group routes of the panel
// (/api/admin/customer-groups/**). Shared by the routes, their repo
// (src/server/admin/repos/groups.ts) and the screens. Types and plain
// constants only: no "use client", no server import.
//
// Dates are ISO strings; every answer also carries `ok: true` (left out of
// the types below).
//
// A group says what its buyers see: the price type, real stock figures,
// the payment and delivery methods offered, the catalog categories hidden
// from them. A company belongs to one group (clients.groupId; none = the
// "registered" group). Two system groups always exist and can be edited
// but not renamed or removed.
//
// Option lists for the form: paymentMethods are labels of PAYMENT_OPTIONS,
// deliveryMethods are values of DELIVERY_OPTIONS
// (src/components/checkout/data.ts); hiddenCategories are
// "<direction>/<category>" keys of CATALOG_DIRECTIONS (a direction's slug
// and one of its carousel cards' slugs, src/components/catalog/data.ts).

export const GUESTS_GROUP = "guests";
export const REGISTERED_GROUP = "registered";
export const SYSTEM_GROUP_IDS = [GUESTS_GROUP, REGISTERED_GROUP] as const;

export const GROUP_NAME_MAX = 120;
export const GROUP_DESCRIPTION_MAX = 500;

export const GROUP_SORTS = ["createdAt", "name"] as const;

export const GROUP_ERRORS: Record<string, string> = {
  exists: "Група з такою назвою вже існує.",
  system: "Системну групу не можна перейменувати чи видалити.",
  "in-use": "До групи належать компанії: спершу перенесіть їх в іншу групу.",
};

// One group as every route answers it.
export type CustomerGroupDto = {
  id: string;
  name: string;
  description: string;
  // price_types._id (null = the shop's default prices).
  priceTypeId: string | null;
  // The price type's name; null when none is set or it no longer exists.
  priceTypeName: string | null;
  showStock: boolean;
  paymentMethods: string[];
  deliveryMethods: string[];
  hiddenCategories: string[];
  system: boolean;
  // Companies in the group (for "registered" also the companies without
  // any group).
  companiesCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

// GET /api/admin/customer-groups?q=&sort=createdAt|-createdAt|name|-name&page=&limit=
// -> { ok: true, items: CustomerGroupDto[], total, page, limit }. Default
// sort: createdAt (the system groups first); default limit 100.
export type CustomerGroupsPage = { items: CustomerGroupDto[]; total: number; page: number; limit: number };

// GET /api/admin/customer-groups/<id> -> { ok: true, group }
export type CustomerGroupAnswer = { group: CustomerGroupDto };

// POST /api/admin/customer-groups [customers.edit] -> 201 { ok: true, group }
// PATCH /api/admin/customer-groups/<id> [customers.edit] -> { ok: true, group }
// DELETE /api/admin/customer-groups/<id> [customers.edit] -> { ok: true, id }
// Errors: 400 "bad-request" (shape, unknown method or category key),
// 400 "fields" { priceTypeId: "not-found" }, 404, 409 "exists" (the name),
// 409 "system", 409 "in-use" (with { companies }).
export type CreateGroupBody = {
  name: string;
  description?: string;
  priceTypeId?: string | null;
  showStock?: boolean;
  paymentMethods?: string[];
  deliveryMethods?: string[];
  hiddenCategories?: string[];
};
export type PatchGroupBody = Partial<CreateGroupBody>;
