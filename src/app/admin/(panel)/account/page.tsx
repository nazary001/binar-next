import type { Metadata } from "next";
import { AccountScreen } from "@/components/admin/staff/AccountScreen";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Мій акаунт" };

// The signed-in member of staff: name, password, sessions, sign-ins. Every
// member of staff may open it, whatever the role.
export default async function AccountPage() {
  await requireStaffPage();
  return <AccountScreen />;
}
