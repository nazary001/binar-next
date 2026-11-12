import type { Metadata } from "next";
import { ProductEditorScreen } from "@/components/admin/products/ProductEditorScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Товар" };

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { allowed } = await requireStaffPage("catalog.view");
  if (!allowed) return <Forbidden />;
  const { id } = await params;
  return <ProductEditorScreen id={id} />;
}
