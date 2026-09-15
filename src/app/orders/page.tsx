import type { Metadata } from "next";
import { OrdersView } from "@/components/platform/orders/OrdersView";

export const metadata: Metadata = {
  title: "Мої замовлення",
  description: "Статуси, оплати та документи ваших замовлень у кабінеті бізнес-клієнта Binar 2000.",
  robots: { index: false, follow: false },
};

// «Мої замовлення» — Figma «Мої Замовлення : Admin» 4573:37243, the
// order list of the B2B platform. Renders inside the platform shell for
// a signed-in partner (PlatformChrome); visitors get a sign-in prompt.
export default function OrdersPage() {
  return <OrdersView />;
}
