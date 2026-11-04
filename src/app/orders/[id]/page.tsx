import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetailsView } from "@/components/platform/orders/OrderDetailsView";
import { ORDERS, findOrder } from "@/components/platform/orders/data";

type Params = { id: string };

export function generateStaticParams(): Params[] {
  return ORDERS.map((o) => ({ id: o.id }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Замовлення №${id}`,
    robots: { index: false, follow: false },
  };
}

// «Деталі замовлення» - Figma 5052:56810 / 5192:77948 (section «Мої
// Замовлення : Admin» 4573:37243). The placeholder orders are static;
// the page renders inside the platform shell for a signed-in partner
// and shows a sign-in prompt to everyone else.
export default async function OrderDetailsPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  if (!findOrder(id)) notFound();
  return <OrderDetailsView id={id} />;
}
