import "server-only";
import { redirect } from "next/navigation";
import type { Permission, StaffMe } from "@/components/admin/lib/permissions";
import { can, readStaff, toStaffMe, type StaffContext } from "./auth";

// The guard of the admin PAGES (server components under src/app/admin).
//
//   export default async function OrdersPage() {
//     const { allowed } = await requireStaffPage("orders.view");
//     if (!allowed) return <Forbidden />;
//     return <OrdersScreen />;
//   }
//
// - nobody signed in: redirect to the login page;
// - a generated password not yet replaced: redirect to the password page;
// - the role lacks the permission: `allowed` is false and the page shows
//   the "no access" panel inside the shell.
// Every page calls it, not only the layout: a layout does not run again
// when the visitor moves between pages. The data itself is guarded once
// more by every /api/admin route.

export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_PASSWORD_PATH = "/admin/password";

export type StaffPage = { staff: StaffContext; me: StaffMe; allowed: boolean };

export async function requireStaffPage(
  permission: Permission | readonly Permission[] | null = null,
  options: { allowPasswordChange?: boolean } = {},
): Promise<StaffPage> {
  const staff = await readStaff();
  if (!staff) redirect(ADMIN_LOGIN_PATH);
  if (staff.staff.mustChangePassword && !options.allowPasswordChange) redirect(ADMIN_PASSWORD_PATH);
  return { staff, me: toStaffMe(staff), allowed: permission === null || can(staff, permission) };
}
