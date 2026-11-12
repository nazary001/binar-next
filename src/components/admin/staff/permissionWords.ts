import { OWNER_ROLE_ID, PERMISSION_GROUPS } from "../lib/permissions";

// A set of permissions in plain words, for the roles screen: the cards say
// what a role changes and what it only looks at, the editor keeps a live
// "Ця роль може: ..." next to the boxes.

// The verb of each permission inside its group ("Замовлення: переглядати
// і обробляти").
const VERBS: Record<string, string> = {
  "dashboard.view": "бачити показники",
  "orders.view": "переглядати",
  "orders.edit": "обробляти",
  "returns.view": "переглядати",
  "returns.edit": "обробляти",
  "shipping.view": "переглядати",
  "shipping.edit": "створювати та скасовувати накладні",
  "catalog.view": "переглядати",
  "catalog.edit": "редагувати",
  "customers.view": "переглядати",
  "customers.edit": "керувати",
  "content.view": "переглядати",
  "content.edit": "редагувати",
  "content.publish": "публікувати",
  "leads.view": "переглядати",
  "leads.edit": "опрацьовувати",
  "integrations.view": "переглядати",
  "integrations.edit": "налаштовувати",
  "settings.view": "переглядати",
  "settings.edit": "змінювати",
  "staff.manage": "керувати в межах своїх прав",
  "audit.view": "переглядати",
};

// "переглядати, редагувати і публікувати"
export function joinWords(words: string[]): string {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} і ${words[words.length - 1]}`;
}

export type GroupAccess = {
  key: string;
  label: string;
  // "edit": something in the group changes data; "view": looks only.
  level: "edit" | "view";
  verbs: string[];
};

export type AccessSummary = { granted: GroupAccess[]; missing: string[] };

// `owner`: the owner role, whose management of staff has no limit.
export function summarize(permissions: readonly string[], owner = false): AccessSummary {
  const held = new Set(permissions);
  const granted: GroupAccess[] = [];
  const missing: string[] = [];
  for (const group of PERMISSION_GROUPS) {
    const keys = group.permissions.map((permission) => permission.key).filter((key) => held.has(key));
    if (keys.length === 0) {
      missing.push(group.label);
      continue;
    }
    const level = keys.some((key) => !key.endsWith(".view")) ? "edit" : "view";
    const verbs = keys.map((key) => (owner && key === "staff.manage" ? "керувати" : (VERBS[key] ?? key)));
    granted.push({ key: group.key, label: group.label, level, verbs });
  }
  return { granted, missing };
}

// The labels of the groups a role changes and the ones it only views, for
// the role cards.
export function accessLines(roleId: string, permissions: readonly string[]): { edits: string[]; views: string[] } {
  if (roleId === OWNER_ROLE_ID) return { edits: PERMISSION_GROUPS.map((group) => group.label), views: [] };
  const { granted } = summarize(permissions);
  return {
    edits: granted.filter((group) => group.level === "edit").map((group) => group.label),
    views: granted.filter((group) => group.level === "view").map((group) => group.label),
  };
}

export const TOTAL_PERMISSIONS = PERMISSION_GROUPS.reduce((sum, group) => sum + group.permissions.length, 0);
