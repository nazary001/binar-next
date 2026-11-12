import type { Metadata } from "next";
import { NovaPoshtaScreen } from "@/components/admin/integrations/NovaPoshtaScreen";
import { Forbidden } from "@/components/admin/ui";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Нова Пошта" };

export default async function NovaPoshtaPage() {
  const { allowed } = await requireStaffPage("integrations.view");
  if (!allowed) return <Forbidden />;
  return <NovaPoshtaScreen />;
}
