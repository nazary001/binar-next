import { LEAD_OPEN_PARAM } from "../leads/types";
import type { Permission } from "../lib/permissions";

// The contract of the journal of actions (collection `audit_log`), shared by
// the routes under src/app/api/admin/audit and the screens: the journal page
// (/admin/audit) and the "history" panels of detail screens. Types and plain
// constants only.
//
//   GET /api/admin/audit         [audit.view] -> JournalPage, newest first
//       ?actorId=<id>  ?actorKind=staff|system|integration|customer
//       ?group=<JournalGroupKey> (one of JOURNAL_ACTION_GROUPS: every action of the group)
//       ?action=order.status (exact) | order. (every action of the prefix)
//       ?entityType=order  ?entityId=48291064
//       ?from=YYYY-MM-DD&to=YYYY-MM-DD (Kyiv days, both inclusive)
//       ?q=<text> (the summary contains it)  ?sort=-at|at  ?page=1&limit=50
//   GET /api/admin/audit/facets  [audit.view] -> JournalFacets (for the filter selects)
//   GET /api/admin/audit/entity?type=<type>&id=<id>[&related=1]
//       [any view permission of that record, see entityViewPermissions(),
//        or audit.view; a type not listed there needs audit.view]
//       -> { ok: true, items: JournalRow[] } (the last JOURNAL_ENTITY_LIMIT lines, newest first)
//       related=1 adds the lines of the records that belong to it and are
//       journaled under their own type (ENTITY_RELATED: for a company, its
//       counterparties, contracts and employees), each related type only
//       when the caller may view it. Any other value of `related`, or a
//       type with nothing related, answers the record's own lines.
//
// A filter value that does not have the expected shape is ignored (the
// list answers as if it was not given); /audit/entity without a valid
// type and id answers 400 "bad-request".

export type JournalActorKind = "staff" | "system" | "integration" | "customer";

export const JOURNAL_ACTOR_KINDS: { value: JournalActorKind; label: string }[] = [
  { value: "staff", label: "Співробітник" },
  { value: "system", label: "Система" },
  { value: "integration", label: "Інтеграція" },
  { value: "customer", label: "Клієнт" },
];

export type JournalEntity = {
  type: string;
  id: string;
  label: string;
  // The admin page of the record, null when the type has none.
  href: string | null;
};

export type JournalRow = {
  id: string;
  // ISO string.
  at: string;
  actor: { id: string; name: string; kind: JournalActorKind };
  // "order.status", "lead.assign", "staff.sign-in", ...
  action: string;
  entity: JournalEntity | null;
  // The Ukrainian sentence to show as is.
  summary: string;
  // Machine-readable details (from / to values, counts).
  meta: Record<string, unknown>;
  ip: string | null;
};

export type JournalPage = {
  ok: true;
  items: JournalRow[];
  total: number;
  page: number;
  limit: number;
};

export type JournalActorFacet = { id: string; name: string; kind: JournalActorKind };

// An action prefix ("order.") with its label ("Замовлення").
export type JournalPrefixFacet = { prefix: string; label: string };

export type JournalEntityTypeFacet = { type: string; label: string };

export type JournalFacets = {
  ok: true;
  actors: JournalActorFacet[];
  actionPrefixes: JournalPrefixFacet[];
  // Every distinct action, sorted.
  actions: string[];
  entityTypes: JournalEntityTypeFacet[];
};

export type JournalEntityHistory = { ok: true; items: JournalRow[] };

export const JOURNAL_ENTITY_LIMIT = 50;

// --- entity types ------------------------------------------------------------------
//
// Every entity type the panel writes to the journal (checked against the
// audit() calls of src/app/api/admin and src/server/admin/repos on
// 2026-11-12). A type that is not listed here (written by a part of the
// panel built later) is shown only to roles with audit.view, gets no link
// and is labelled as written.

// Which permission opens the history of a record of each entity type.
export const ENTITY_VIEW_PERMISSION: Record<string, Permission> = {
  order: "orders.view",
  return: "returns.view",
  product: "catalog.view",
  "price-type": "catalog.view",
  customer: "customers.view",
  company: "customers.view",
  "customer-group": "customers.view",
  counterparty: "customers.view",
  contract: "customers.view",
  employee: "customers.view",
  blog_post: "content.view",
  material_category: "content.view",
  material_file: "content.view",
  media: "content.view",
  lead: "leads.view",
  staff: "staff.manage",
  role: "staff.manage",
  settings: "settings.view",
  "api-key": "integrations.view",
  outbox: "integrations.view",
};

// Settings groups shown on a page outside the settings screen: their
// history is open to whoever may open one of the pages that show them.
// The integrations' groups go with their integration page; the catalog
// group (written by PUT /api/admin/taxonomy/meta [catalog.edit] and by
// the settings screen's catalog tab) with /admin/categories [catalog.view]
// and with that tab [settings.view].
const SETTINGS_ID_PERMISSIONS: Record<string, readonly Permission[]> = {
  novaPoshta: ["integrations.view"],
  bas: ["integrations.view"],
  mail: ["integrations.view"],
  catalog: ["catalog.view", "settings.view"],
};

// The permissions that open the history of one record (any one of them;
// audit.view always does). Empty when the type is unknown: then only
// audit.view may read it.
export function entityViewPermissions(type: string, id: string): readonly Permission[] {
  if (type === "settings" && Object.hasOwn(SETTINGS_ID_PERMISSIONS, id)) return SETTINGS_ID_PERMISSIONS[id];
  return Object.hasOwn(ENTITY_VIEW_PERMISSION, type) ? [ENTITY_VIEW_PERMISSION[type]] : [];
}

// Records journaled under a type of their own that belong to a record of
// another type, and the meta key that names the owner on their lines.
// The companies routes write meta.clientId = the company's id on every
// line about one of its counterparties, contracts and employees.
export type EntityRelation = { types: readonly string[]; metaKey: string };

export const ENTITY_RELATED: Record<string, EntityRelation> = {
  company: { types: ["counterparty", "contract", "employee"], metaKey: "clientId" },
};

// The relation of a type, null when it has none.
export function entityRelation(type: string): EntityRelation | null {
  return Object.hasOwn(ENTITY_RELATED, type) ? ENTITY_RELATED[type] : null;
}

// What one record of each type is called (the journal's "Об'єкт" column,
// the entity facet); an unknown one is shown as written.
export const ENTITY_TYPE_LABELS: Record<string, string> = {
  order: "Замовлення",
  return: "Повернення",
  product: "Товар",
  "price-type": "Тип цін",
  customer: "Акаунт",
  company: "Компанія",
  "customer-group": "Група покупців",
  counterparty: "Контрагент компанії",
  contract: "Договір",
  employee: "Працівник компанії",
  blog_post: "Стаття блогу",
  material_category: "Розділ матеріалів",
  material_file: "Файл матеріалів",
  media: "Файл медіатеки",
  lead: "Заявка",
  staff: "Співробітник",
  role: "Роль",
  settings: "Налаштування",
  "api-key": "Ключ доступу",
  outbox: "Лист",
};

// The admin page of a record ("{id}" is replaced by the encoded id). The
// addresses are the binding ones of the panel (lists, records, the drawers
// opened from a list's address). Types without a page of their own
// (counterparty, contract, employee) have no link.
export const ENTITY_HREFS: Record<string, string> = {
  order: "/admin/orders/{id}",
  return: "/admin/returns/{id}",
  product: "/admin/products/{id}",
  "price-type": "/admin/pricing",
  customer: "/admin/customers/{id}",
  company: "/admin/companies/{id}",
  "customer-group": "/admin/customer-groups",
  blog_post: "/admin/blog/{id}",
  material_category: "/admin/materials",
  material_file: "/admin/materials?file={id}",
  media: "/admin/media?id={id}",
  lead: `/admin/leads?${LEAD_OPEN_PARAM}={id}`,
  staff: "/admin/staff?id={id}",
  role: "/admin/staff?tab=roles",
  settings: "/admin/settings",
  "api-key": "/admin/integrations/bas?tab=keys",
  outbox: "/admin/integrations/mail?id={id}",
};

// A settings line names its group in the entity id: the page (or the tab)
// where that group is edited.
export const SETTINGS_HREFS: Record<string, string> = {
  general: "/admin/settings?tab=general",
  shop: "/admin/settings?tab=shop",
  blog: "/admin/settings?tab=blog",
  catalog: "/admin/settings?tab=catalog",
  novaPoshta: "/admin/integrations/nova-poshta",
  bas: "/admin/integrations/bas",
  mail: "/admin/integrations/mail",
};

// --- actions ---------------------------------------------------------------------------

// Ukrainian names of the action prefixes (the part before the first dot),
// for the facets; an unknown one is shown as written.
export const ACTION_PREFIX_LABELS: Record<string, string> = {
  order: "Замовлення",
  shipment: "Відправлення",
  return: "Повернення",
  product: "Товари",
  "price-type": "Типи цін",
  catalog: "Довідники каталогу",
  customer: "Акаунти",
  "customer-group": "Групи покупців",
  company: "Компанії",
  blog: "Блог",
  materials: "Матеріали",
  media: "Медіатека",
  lead: "Заявки",
  integration: "Інтеграції",
  np: "Нова Пошта",
  bas: "Обмін з BAS",
  outbox: "Черга листів",
  mail: "Пошта",
  settings: "Налаштування",
  system: "Обслуговування",
  staff: "Співробітники",
  role: "Ролі",
  auth: "Вхід і паролі",
};

// The groups of the journal's "what kind of action" filter (?group=). A
// group is a set of action prefixes ("order." = every action that starts
// with it) and exact actions, minus the exact actions another group owns
// (signing in is a staff.* action but has a group of its own).
export type JournalGroupKey =
  | "orders"
  | "returns"
  | "catalog"
  | "customers"
  | "content"
  | "leads"
  | "integrations"
  | "settings"
  | "staff"
  | "sign-in";

export type JournalActionGroup = {
  key: JournalGroupKey;
  label: string;
  prefixes: string[];
  actions: string[];
  exclude: string[];
};

// A member of staff entering, leaving or securing their own way in.
const SIGN_IN_ACTIONS = ["staff.sign-in", "staff.sign-in-refused", "staff.sign-out", "staff.sign-out-others", "staff.password"];

export const JOURNAL_ACTION_GROUPS: JournalActionGroup[] = [
  { key: "orders", label: "Замовлення", prefixes: ["order.", "shipment."], actions: [], exclude: [] },
  { key: "returns", label: "Повернення", prefixes: ["return."], actions: [], exclude: [] },
  { key: "catalog", label: "Товари", prefixes: ["product.", "price-type.", "catalog.", "category."], actions: [], exclude: [] },
  { key: "customers", label: "Клієнти", prefixes: ["customer.", "customer-group.", "company."], actions: [], exclude: [] },
  { key: "content", label: "Контент", prefixes: ["blog.", "materials.", "media."], actions: [], exclude: [] },
  { key: "leads", label: "Заявки", prefixes: ["lead."], actions: [], exclude: [] },
  {
    key: "integrations",
    label: "Інтеграції",
    // The exchange with BAS writes "integration.bas.*"; "bas." and
    // "exchange." are kept for lines a later part of the panel may write.
    prefixes: ["integration.", "np.", "nova-poshta.", "bas.", "exchange.", "outbox.", "mail."],
    actions: [],
    exclude: [],
  },
  { key: "settings", label: "Налаштування", prefixes: ["settings.", "system."], actions: [], exclude: [] },
  { key: "staff", label: "Співробітники", prefixes: ["staff.", "role."], actions: [], exclude: SIGN_IN_ACTIONS },
  { key: "sign-in", label: "Вхід до панелі", prefixes: ["auth."], actions: SIGN_IN_ACTIONS, exclude: [] },
];

export const JOURNAL_GROUP_KEYS: readonly JournalGroupKey[] = JOURNAL_ACTION_GROUPS.map((group) => group.key);

// The group an action belongs to (null when no group covers it).
export function journalGroupOf(action: string): JournalActionGroup | null {
  for (const group of JOURNAL_ACTION_GROUPS) {
    if (group.exclude.includes(action)) continue;
    if (group.actions.includes(action) || group.prefixes.some((prefix) => action.startsWith(prefix))) return group;
  }
  return null;
}
