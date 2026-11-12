import type { Metadata } from "next";
import { PriceTypesScreen } from "@/components/admin/catalog/PriceTypesScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Типи цін" };

export default async function PricingPage() {
  const { allowed } = await requireStaffPage("catalog.view");
  if (!allowed) return <Forbidden />;
  return <PriceTypesScreen />;
}
