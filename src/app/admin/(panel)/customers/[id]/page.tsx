import type { Metadata } from "next";
import { CustomerScreen } from "@/components/admin/customers/CustomerScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Акаунт" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { allowed } = await requireStaffPage("customers.view");
  if (!allowed) return <Forbidden />;
  const { id } = await params;
  return <CustomerScreen id={id} />;
}
