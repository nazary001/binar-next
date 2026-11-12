import type { Metadata } from "next";
import { ProductsScreen } from "@/components/admin/products/ProductsScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Товари" };

export default async function ProductsPage() {
  const { allowed } = await requireStaffPage("catalog.view");
  if (!allowed) return <Forbidden />;
  return <ProductsScreen />;
}
