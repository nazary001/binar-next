import type { Metadata } from "next";
import { ShippingScreen } from "@/components/admin/shipping/ShippingScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Доставка" };

// The shipments list. The shipment of one order lives in the order page's
// "Доставка" card (ShipmentCard), where waybills are created.
export default async function ShippingPage() {
  const { allowed } = await requireStaffPage("shipping.view");
  if (!allowed) return <Forbidden />;
  return <ShippingScreen />;
}
