// The contract of the panel-wide search (the command palette, Ctrl+K).
// Types and plain constants only.
//
//   GET /api/admin/search?q=<text>   [any signed-in member of staff]
//   -> SearchAnswer
//
// - q is trimmed and cut to SEARCH_MAX_LENGTH; shorter than
//   SEARCH_MIN_LENGTH answers { ok: true, groups: [] } without a query.
// - Only the groups the caller's role may open are searched; a group with
//   no match is left out; at most SEARCH_GROUP_LIMIT items per group.
// - Groups come in the order of SEARCH_GROUPS.

export type SearchGroupType = "orders" | "returns" | "customers" | "companies" | "products" | "posts" | "leads" | "staff";

export type SearchItem = {
  id: string;
  title: string;
  subtitle?: string;
  // The admin page to open.
  href: string;
};

export type SearchGroup = {
  type: SearchGroupType;
  label: string;
  items: SearchItem[];
};

export type SearchAnswer = { ok: true; groups: SearchGroup[] };

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;
export const SEARCH_GROUP_LIMIT = 5;

// In the order the palette shows them.
export const SEARCH_GROUPS: { type: SearchGroupType; label: string }[] = [
  { type: "orders", label: "Замовлення" },
  { type: "returns", label: "Повернення" },
  // The menu's word for customer accounts.
  { type: "customers", label: "Акаунти" },
  { type: "companies", label: "Компанії" },
  { type: "products", label: "Товари" },
  { type: "posts", label: "Статті блогу" },
  { type: "leads", label: "Заявки" },
  { type: "staff", label: "Співробітники" },
];
