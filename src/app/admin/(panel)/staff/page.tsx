import type { Metadata } from "next";
import { StaffScreen } from "@/components/admin/staff/StaffScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Співробітники" };

// The people who work in the panel and the roles. A member of staff opens
// in a drawer from ?id=<staff id>; the roles tab is ?tab=roles (a role
// opens from ?tab=roles&id=<role id>).
export default async function StaffPage() {
  const { allowed } = await requireStaffPage("staff.manage");
  if (!allowed) return <Forbidden />;
  return <StaffScreen />;
}
