import type { Metadata } from "next";
import { DashboardView } from "@/components/platform/dashboard/DashboardView";

export const metadata: Metadata = {
  title: "Дашборд",
  description: "Огляд фінансів, останніх замовлень і найближчих платежів у кабінеті бізнес-клієнта Binar 2000.",
  robots: { index: false, follow: false },
};

// «Dashboard» — Figma «Dashboard :: Admin» 5052:32105 (frame 5052:32106),
// the partner's overview page. Renders inside the platform shell for a
// signed-in partner (PlatformChrome); visitors get a sign-in prompt.
export default function DashboardPage() {
  return <DashboardView />;
}
