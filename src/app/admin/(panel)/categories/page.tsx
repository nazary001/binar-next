import type { Metadata } from "next";
import { CategoriesScreen } from "@/components/admin/catalog/CategoriesScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Категорії" };

export default async function CategoriesPage() {
  const { allowed } = await requireStaffPage("catalog.view");
  if (!allowed) return <Forbidden />;
  return <CategoriesScreen />;
}
