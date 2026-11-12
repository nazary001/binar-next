import type { Metadata } from "next";
import { OrderScreen } from "@/components/admin/orders/OrderScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

type Props = { params: Promise<{ id: string }> };

// An order id is a plain business id ("48291064", "BN-100122"); anything
// that does not decode is passed on as it is and ends as "not found".
function idOf(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Замовлення №${idOf(id)}` };
}

export default async function OrderPage({ params }: Props) {
  const { allowed } = await requireStaffPage("orders.view");
  if (!allowed) return <Forbidden />;
  const { id } = await params;
  return <OrderScreen id={idOf(id)} />;
}
