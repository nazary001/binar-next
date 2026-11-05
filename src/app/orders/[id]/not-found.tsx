import { OrderNotFound } from "@/components/platform/orders/OrderNotFound";

// An unknown order id (page.tsx calls notFound(), so the response keeps
// its 404 status): the cabinet head «Замовлення не знайдено» with the
// way back to the list instead of the default English 404 (order-detail
// spec 2.8; visitors get the sign-in prompt).
export default function OrderNotFoundPage() {
  return <OrderNotFound />;
}
