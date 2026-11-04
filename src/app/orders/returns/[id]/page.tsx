import type { Metadata } from "next";
import { ReturnDetailsView } from "@/components/platform/orders/ReturnDetailsView";
import { RETURNS } from "@/components/platform/orders/data";

type Params = { id: string };

// The placeholder returns are prerendered; requests a partner sends live
// in this browser's storage (orders/store.ts), so any other id renders on
// demand and the client view resolves it (or says it was not found).
export function generateStaticParams(): Params[] {
  return RETURNS.map((r) => ({ id: r.id }));
}

export const metadata: Metadata = {
  title: "Деталі повернення",
  robots: { index: false, follow: false },
};

// «Деталі повернення» - Figma 5192:79067 (section «Повернення : Admin»
// 5192:79831), inside the platform shell for a signed-in partner.
export default async function ReturnDetailsPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  return <ReturnDetailsView id={id} />;
}
