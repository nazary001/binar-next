import type { Metadata } from "next";
import { MaterialsScreen } from "@/components/admin/materials/MaterialsScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Матеріали" };

// The materials library of the site (/materials): folders and their files.
export default async function MaterialsPage() {
  const { allowed } = await requireStaffPage("content.view");
  if (!allowed) return <Forbidden />;
  return <MaterialsScreen />;
}
