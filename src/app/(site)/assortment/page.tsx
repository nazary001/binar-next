import type { Metadata } from "next";
import { AssortmentView } from "@/components/platform/assortment/AssortmentView";

export const metadata: Metadata = {
  title: "Мій асортимент",
  description: "Швидке замовлення регулярних товарів у кабінеті бізнес-клієнта Binar 2000.",
  robots: { index: false, follow: false },
};

// «Мій асортимент» — Figma section 4209:74148 (frame 4202:36108 and its
// empty / selected / added-to-cart states). Renders inside the platform
// shell for a signed-in partner; visitors get a sign-in prompt.
export default function AssortmentPage() {
  return <AssortmentView />;
}
