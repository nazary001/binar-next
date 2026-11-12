import type { Metadata } from "next";
import { ProductNewScreen } from "@/components/admin/products/ProductNewScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Новий товар" };

export default async function NewProductPage() {
  const { allowed } = await requireStaffPage("catalog.edit");
  if (!allowed) return <Forbidden />;
  return <ProductNewScreen />;
}
