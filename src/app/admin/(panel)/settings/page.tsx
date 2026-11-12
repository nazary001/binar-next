import type { Metadata } from "next";
import { SettingsScreen } from "@/components/admin/settings/SettingsScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Налаштування" };

// The site's settings (four groups) and the system page, as tabs.
export default async function SettingsPage() {
  const { allowed } = await requireStaffPage("settings.view");
  if (!allowed) return <Forbidden />;
  return <SettingsScreen />;
}
