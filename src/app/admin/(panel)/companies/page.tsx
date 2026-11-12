import type { Metadata } from "next";
import { CompaniesScreen } from "@/components/admin/companies/CompaniesScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Компанії" };

// The partner companies (list, search, filters, "Додати компанію").
export default async function CompaniesPage() {
  const { allowed } = await requireStaffPage("customers.view");
  if (!allowed) return <Forbidden />;
  return <CompaniesScreen />;
}
