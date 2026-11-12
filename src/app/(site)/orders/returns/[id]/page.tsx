import type { Metadata } from "next";
import { ReturnDetailsView } from "@/components/platform/orders/ReturnDetailsView";

type Params = { id: string };

// No return id is known at build time: the requests are the signed-in
// partner's, read from its session. The page is a static shell for any id
// (rendered on first request, then reused); the client view resolves it
// (or says it was not found).
export function generateStaticParams(): Params[] {
  return [];
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
