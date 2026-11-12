// What a member of staff may do in the admin panel. Shared by the server
// (every /api/admin route names the permission it needs) and the browser
// (the menu and the buttons hide what the role cannot use). No "use client"
// and no server-only import: both sides read this file.
//
// A permission is "<area>.<action>". "view" opens the pages of an area,
// "edit" allows every change in it. Roles are sets of permissions stored in
// the `staff_roles` collection; the built-in ones are listed below and are
// written by `ensureSystemRoles` (src/server/admin/roles.ts).

export const PERMISSION_GROUPS = [
  {
    key: "dashboard",
    label: "Огляд",
    permissions: [{ key: "dashboard.view", label: "Бачити огляд і показники" }],
  },
  {
    key: "orders",
    label: "Замовлення",
    permissions: [
      { key: "orders.view", label: "Переглядати замовлення" },
      { key: "orders.edit", label: "Обробляти замовлення: статуси, оплата, документи, нотатки" },
    ],
  },
  {
    key: "returns",
    label: "Повернення",
    permissions: [
      { key: "returns.view", label: "Переглядати заявки на повернення" },
      { key: "returns.edit", label: "Обробляти заявки на повернення" },
    ],
  },
  {
    key: "shipping",
    label: "Доставка",
    permissions: [
      { key: "shipping.view", label: "Переглядати відправлення" },
      { key: "shipping.edit", label: "Створювати та скасовувати накладні перевізника" },
    ],
  },
  {
    key: "catalog",
    label: "Каталог",
    permissions: [
      { key: "catalog.view", label: "Переглядати товари та довідники" },
      { key: "catalog.edit", label: "Редагувати товари, ціни, наявність і довідники" },
    ],
  },
  {
    key: "customers",
    label: "Клієнти",
    permissions: [
      { key: "customers.view", label: "Переглядати акаунти та компанії" },
      { key: "customers.edit", label: "Керувати акаунтами, компаніями, договорами і групами" },
    ],
  },
  {
    key: "content",
    label: "Контент",
    permissions: [
      { key: "content.view", label: "Переглядати блог і матеріали" },
      { key: "content.edit", label: "Створювати та редагувати статті й матеріали" },
      { key: "content.publish", label: "Публікувати та знімати з публікації" },
    ],
  },
  {
    key: "leads",
    label: "Заявки",
    permissions: [
      { key: "leads.view", label: "Переглядати заявки з форм сайту" },
      { key: "leads.edit", label: "Опрацьовувати заявки" },
    ],
  },
  {
    key: "integrations",
    label: "Інтеграції",
    permissions: [
      { key: "integrations.view", label: "Бачити стан інтеграцій і журнал обміну" },
      { key: "integrations.edit", label: "Налаштовувати інтеграції та ключі доступу" },
    ],
  },
  {
    key: "settings",
    label: "Налаштування",
    permissions: [
      { key: "settings.view", label: "Переглядати налаштування сайту" },
      { key: "settings.edit", label: "Змінювати налаштування сайту" },
    ],
  },
  {
    key: "staff",
    label: "Співробітники",
    permissions: [{ key: "staff.manage", label: "Керувати співробітниками та ролями" }],
  },
  {
    key: "audit",
    label: "Журнал дій",
    permissions: [{ key: "audit.view", label: "Переглядати журнал дій" }],
  },
] as const;

export type Permission = (typeof PERMISSION_GROUPS)[number]["permissions"][number]["key"];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.key),
);

const KNOWN = new Set<string>(ALL_PERMISSIONS);

export function isPermission(value: string): value is Permission {
  return KNOWN.has(value);
}

// The role that can do everything and cannot be edited or removed.
export const OWNER_ROLE_ID = "owner";

const VIEW_ONLY = ALL_PERMISSIONS.filter((key) => key.endsWith(".view"));

export type SystemRole = { id: string; name: string; description: string; permissions: Permission[] };

export const SYSTEM_ROLES: SystemRole[] = [
  {
    id: OWNER_ROLE_ID,
    name: "Власник",
    description: "Повний доступ до всього, зокрема до співробітників і ролей.",
    permissions: ALL_PERMISSIONS,
  },
  {
    id: "admin",
    name: "Адміністратор",
    description: "Усе, крім керування співробітниками та ролями.",
    permissions: ALL_PERMISSIONS.filter((key) => key !== "staff.manage"),
  },
  {
    id: "manager",
    name: "Менеджер з продажу",
    description: "Замовлення, повернення, доставка, клієнти та заявки.",
    permissions: [
      "dashboard.view",
      "orders.view",
      "orders.edit",
      "returns.view",
      "returns.edit",
      "shipping.view",
      "shipping.edit",
      "customers.view",
      "customers.edit",
      "leads.view",
      "leads.edit",
      "catalog.view",
      "content.view",
    ],
  },
  {
    id: "catalog",
    name: "Менеджер каталогу",
    description: "Товари, ціни, наявність і довідники.",
    permissions: ["dashboard.view", "catalog.view", "catalog.edit", "content.view", "orders.view"],
  },
  {
    id: "content",
    name: "Контент-менеджер",
    description: "Блог і бібліотека матеріалів.",
    permissions: ["dashboard.view", "content.view", "content.edit", "content.publish", "catalog.view", "leads.view"],
  },
  {
    id: "viewer",
    name: "Спостерігач",
    description: "Тільки перегляд, без жодних змін.",
    permissions: VIEW_ONLY,
  },
];

// True when `granted` covers `needed` (one permission, or any of several).
export function hasPermission(granted: Iterable<string>, needed: Permission | readonly Permission[]): boolean {
  const set = granted instanceof Set ? (granted as Set<string>) : new Set(granted);
  return typeof needed === "string" ? set.has(needed) : needed.some((key) => set.has(key));
}

// What the browser knows about the signed-in member of staff
// (GET /api/admin/auth/me and the panel layout).
export type StaffMe = {
  id: string;
  email: string;
  name: string;
  roleId: string;
  roleName: string;
  permissions: Permission[];
  mustChangePassword: boolean;
};
