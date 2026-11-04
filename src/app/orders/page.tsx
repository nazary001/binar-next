import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersRoute, OrdersView } from "@/components/platform/orders/OrdersView";

export const metadata: Metadata = {
  title: "Мої замовлення",
  description: "Статуси, оплати та документи ваших замовлень у кабінеті бізнес-клієнта Binar 2000.",
  robots: { index: false, follow: false },
};

// «Мої замовлення» - Figma «Мої Замовлення : Admin» 4573:37243 and «Мої
// повернення» 5192:78615 (`?tab=returns`), the order list of the B2B
// platform. Renders inside the platform shell for a signed-in partner
// (PlatformChrome); visitors get a sign-in prompt. The tab is read from
// the URL on the client (useSearchParams under Suspense), so the page
// itself stays static.
export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersView tab="orders" />}>
      <OrdersRoute />
    </Suspense>
  );
}
