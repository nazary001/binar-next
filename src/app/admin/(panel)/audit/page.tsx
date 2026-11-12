import type { Metadata } from "next";
import { JournalScreen } from "@/components/admin/audit/JournalScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Журнал дій" };

// Every change made in the panel, newest first.
export default async function AuditPage() {
  const { allowed } = await requireStaffPage("audit.view");
  if (!allowed) return <Forbidden />;
  return <JournalScreen />;
}
