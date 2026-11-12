import type { Metadata } from "next";
import { CompanyScreen } from "@/components/admin/companies/CompanyScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Компанія" };

// One partner company: overview and terms, accounts, legal entities with
// contracts, the company's own staff list, settlements and notes
// (?tab=overview|users|contracts|employees|ledger|notes).
export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { allowed } = await requireStaffPage("customers.view");
  if (!allowed) return <Forbidden />;
  const { id } = await params;
  return <CompanyScreen id={id} />;
}
