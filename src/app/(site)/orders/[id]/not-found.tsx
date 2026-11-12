import { OrderNotFound } from "@/components/platform/orders/OrderNotFound";

// The 404 body of this segment, should anything under it call notFound():
// the cabinet head «Замовлення не знайдено» with the way back to the list
// instead of the default English 404 (order-detail spec 2.8; visitors get
// the sign-in prompt). An unknown order id itself is resolved on the
// client (OrderDetailsView renders the same OrderNotFound).
export default function OrderNotFoundPage() {
  return <OrderNotFound />;
}
