import type { Metadata } from "next";
import { OrdersScreen } from "@/components/admin/orders/OrdersScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Замовлення" };

export default async function OrdersPage() {
  const { allowed } = await requireStaffPage("orders.view");
  if (!allowed) return <Forbidden />;
  return <OrdersScreen />;
}
