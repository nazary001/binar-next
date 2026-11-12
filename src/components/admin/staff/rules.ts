// The limits of a member of staff who manages the team without being an
// owner. Shared by the repos, which enforce them, and by the screens, which
// explain a disabled control in the same terms, so both sides always draw
// the same line. Plain functions only: no "use client", no server import.
//
// Owners are exempt from every rule here. Everybody else:
// 1. never edits or deletes the role they currently hold ("own-role");
// 2. creates or changes a role only within the permissions they hold
//    themselves, and leaves a role that already has more alone
//    ("beyond-own");
// 3. gives an account only a role within their own permissions, and only
//    views an account whose role has more than they have ("beyond-own").
// Refusals are 403 "forbidden" with { reason }.

import { ALL_PERMISSIONS, OWNER_ROLE_ID, PERMISSION_GROUPS } from "../lib/permissions";

export type StaffRefusalReason = "own-role" | "beyond-own";

export const STAFF_REFUSAL_REASONS: readonly StaffRefusalReason[] = ["own-role", "beyond-own"];

export function isOwnerRoleId(roleId: string): boolean {
  return roleId === OWNER_ROLE_ID;
}

// What a role really grants: the owner role always means everything,
// whatever its document says (the same rule as admin/auth.ts).
export function effectivePermissions(roleId: string, stored: readonly string[]): string[] {
  return isOwnerRoleId(roleId) ? [...ALL_PERMISSIONS] : [...stored];
}

// The permissions of `wanted` that the actor does not hold ([] = within
// reach). `held` is the actor's own set.
export function permissionsBeyond(held: Iterable<string>, wanted: readonly string[]): string[] {
  const own = held instanceof Set ? (held as Set<string>) : new Set(held);
  return wanted.filter((key) => !own.has(key));
}

// Rule 2 and 3 in one question: may an actor with `actorRoleId` and `held`
// permissions hand out (or touch) a set of `wanted` permissions?
export function withinActor(actorRoleId: string, held: Iterable<string>, wanted: readonly string[]): boolean {
  return isOwnerRoleId(actorRoleId) || permissionsBeyond(held, wanted).length === 0;
}

// --- the shape of the permission catalogue ----------------------------------

type GroupKey = (typeof PERMISSION_GROUPS)[number]["key"];

// The "view" permission of a group, when it has one ("orders.view").
export function viewPermissionOf(groupKey: GroupKey | string): string | null {
  const group = PERMISSION_GROUPS.find((item) => item.key === groupKey);
  const view = group?.permissions.find((permission) => permission.key.endsWith(".view"));
  return view ? view.key : null;
}

export function groupOf(permission: string): string {
  return permission.split(".")[0] ?? permission;
}

// Any permission of a group that changes something needs the group's view
// permission too (nobody edits orders they cannot open). The roles screen
// ticks and locks the view permission while one of these is on.
export function isChangePermission(permission: string): boolean {
  return !permission.endsWith(".view") && viewPermissionOf(groupOf(permission)) !== null;
}

// The set with every implied view permission added, in catalogue order.
export function withImpliedViews(permissions: readonly string[]): string[] {
  const set = new Set(permissions);
  for (const key of permissions) {
    if (!isChangePermission(key)) continue;
    const view = viewPermissionOf(groupOf(key));
    if (view) set.add(view);
  }
  return ALL_PERMISSIONS.filter((key) => set.has(key));
}
