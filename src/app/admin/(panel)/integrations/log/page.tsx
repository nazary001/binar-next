import type { Metadata } from "next";
import { LogScreen } from "@/components/admin/integrations/LogScreen";
import { Forbidden } from "@/components/admin/ui";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Журнал обміну" };

export default async function IntegrationsLogPage() {
  const { allowed } = await requireStaffPage("integrations.view");
  if (!allowed) return <Forbidden />;
  return <LogScreen />;
}
