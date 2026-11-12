import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetailsView } from "@/components/platform/orders/OrderDetailsView";

type Params = { id: string };

// No order id is known at build time: the orders are the signed-in
// partner's, read from its session. The page is a static shell for any id
// that can be an order number (rendered on first request, then reused); the
// client view resolves the id from the store and shows "Замовлення не
// знайдено" for an id the company does not hold. Anything else (letters, a
// path typed by hand) can never be an order: a 404 with the site's default
// title and this segment's not-found view, as it always was, so no URL text
// ends up in a cached page title.
const ORDER_NUMBER = /^\d{1,12}$/;

export function generateStaticParams(): Params[] {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  if (!ORDER_NUMBER.test(id)) notFound();
  return {
    title: `Замовлення №${id}`,
    robots: { index: false, follow: false },
  };
}

// «Деталі замовлення» - Figma 5052:56810 / 5192:77948 (section «Мої
// Замовлення : Admin» 4573:37243). The page renders inside the platform
// shell for a signed-in partner and shows a sign-in prompt to everyone
// else.
export default async function OrderDetailsPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  if (!ORDER_NUMBER.test(id)) notFound();
  return <OrderDetailsView id={id} />;
}
