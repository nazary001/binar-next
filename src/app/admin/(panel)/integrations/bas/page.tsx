import type { Metadata } from "next";
import { BasScreen } from "@/components/admin/integrations/bas/BasScreen";
import { Forbidden } from "@/components/admin/ui";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Обмін з BAS" };

// The tab (?tab=status|settings|keys|queue|log|dev) is read by the screen
// from the address bar, so switching tabs is a client navigation.
export default async function BasPage() {
  const { allowed } = await requireStaffPage("integrations.view");
  if (!allowed) return <Forbidden />;
  return <BasScreen />;
}
