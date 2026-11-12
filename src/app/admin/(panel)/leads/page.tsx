import type { Metadata } from "next";
import { LeadsScreen } from "@/components/admin/leads/LeadsScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Заявки" };

// The inbox of the site's forms; one submission opens in its drawer from
// ?id=<id> (the panel's search, the journal and the e-mail notice link there).
export default async function LeadsPage() {
  const { allowed } = await requireStaffPage("leads.view");
  if (!allowed) return <Forbidden />;
  return <LeadsScreen />;
}
