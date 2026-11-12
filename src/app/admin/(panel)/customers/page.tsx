import type { Metadata } from "next";
import { CustomersScreen } from "@/components/admin/customers/CustomersScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Акаунти" };

export default async function CustomersPage() {
  const { allowed } = await requireStaffPage("customers.view");
  if (!allowed) return <Forbidden />;
  return <CustomersScreen />;
}
