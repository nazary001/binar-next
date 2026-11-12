import type { Permission } from "./permissions";

// The menu of the admin panel: sections, their pages and the permission
// that opens each. The shell hides what the role cannot open; the pages and
// the API check the same permission on the server. Icons are named here
// and resolved to Heroicons in shell/NavIcon.tsx, so this file stays plain
// data (the command palette reads it too).

export type NavIconName =
  | "home"
  | "orders"
  | "returns"
  | "shipping"
  | "products"
  | "categories"
  | "pricing"
  | "customers"
  | "companies"
  | "groups"
  | "blog"
  | "materials"
  | "media"
  | "leads"
  | "integrations"
  | "settings"
  | "staff"
  | "audit";

// Which counter of GET /api/admin/nav-counts a menu line shows.
export type NavCounter = "orders" | "returns" | "leads";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  permission: Permission;
  counter?: NavCounter;
  // Extra words the command palette matches.
  keywords?: string;
};

export type NavGroup = { key: string; label: string | null; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    key: "home",
    label: null,
    items: [{ href: "/admin", label: "Огляд", icon: "home", permission: "dashboard.view", keywords: "дашборд головна" }],
  },
  {
    key: "sales",
    label: "Продажі",
    items: [
      { href: "/admin/orders", label: "Замовлення", icon: "orders", permission: "orders.view", counter: "orders" },
      { href: "/admin/returns", label: "Повернення", icon: "returns", permission: "returns.view", counter: "returns" },
      {
        href: "/admin/shipping",
        label: "Доставка",
        icon: "shipping",
        permission: "shipping.view",
        keywords: "нова пошта ттн накладні відправлення",
      },
    ],
  },
  {
    key: "catalog",
    label: "Каталог",
    items: [
      { href: "/admin/products", label: "Товари", icon: "products", permission: "catalog.view", keywords: "номенклатура" },
      { href: "/admin/categories", label: "Категорії", icon: "categories", permission: "catalog.view" },
      {
        href: "/admin/pricing",
        label: "Типи цін",
        icon: "pricing",
        permission: "catalog.view",
        keywords: "ціни роздрібна оптова",
      },
    ],
  },
  {
    key: "customers",
    label: "Клієнти",
    items: [
      {
        href: "/admin/customers",
        label: "Акаунти",
        icon: "customers",
        permission: "customers.view",
        keywords: "користувачі покупці b2b b2c",
      },
      {
        href: "/admin/companies",
        label: "Компанії",
        icon: "companies",
        permission: "customers.view",
        keywords: "партнери контрагенти договори",
      },
      { href: "/admin/customer-groups", label: "Групи покупців", icon: "groups", permission: "customers.view" },
    ],
  },
  {
    key: "content",
    label: "Контент",
    items: [
      { href: "/admin/blog", label: "Блог", icon: "blog", permission: "content.view", keywords: "статті" },
      { href: "/admin/materials", label: "Матеріали", icon: "materials", permission: "content.view", keywords: "файли" },
      { href: "/admin/media", label: "Медіатека", icon: "media", permission: "content.view", keywords: "зображення фото" },
    ],
  },
  {
    key: "inbox",
    label: "Звернення",
    items: [
      {
        href: "/admin/leads",
        label: "Заявки",
        icon: "leads",
        permission: "leads.view",
        counter: "leads",
        keywords: "ліди форми квіз",
      },
    ],
  },
  {
    key: "system",
    label: "Система",
    items: [
      {
        href: "/admin/integrations",
        label: "Інтеграції",
        icon: "integrations",
        permission: "integrations.view",
        keywords: "нова пошта bas 1с пошта api ключі обмін",
      },
      { href: "/admin/settings", label: "Налаштування", icon: "settings", permission: "settings.view" },
      { href: "/admin/staff", label: "Співробітники", icon: "staff", permission: "staff.manage", keywords: "ролі доступи" },
      { href: "/admin/audit", label: "Журнал дій", icon: "audit", permission: "audit.view", keywords: "історія лог" },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV.flatMap((group) => group.items);

// The menu line a path belongs to: "/admin/orders/48291064" -> Замовлення.
export function navItemOf(pathname: string): NavItem | null {
  let best: NavItem | null = null;
  for (const item of NAV_ITEMS) {
    const match = item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (match && (!best || item.href.length > best.href.length)) best = item;
  }
  return best;
}
