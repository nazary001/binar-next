import { HotelsHero } from "@/components/hotels/Hero";
import { ZonesGrid } from "@/components/hotels/ZonesGrid";
import { HotelBenefits } from "@/components/hotels/Benefits";
import { StarRequestStrip } from "@/components/hotels/StarRequestStrip";
import { PartnerBrands } from "@/components/hotels/PartnerBrands";
import { Solutions } from "@/components/hotels/Solutions";
import { SupplyExamples } from "@/components/hotels/SupplyExamples";
import { HotelQuizCta } from "@/components/hotels/QuizCta";
import { HotelFaq } from "@/components/hotels/HotelFaq";

export const metadata = {
  title: "Готелі — Binar",
  description:
    "Усе для готелів: B2B постачання одноразової продукції та комплектація номерів під ваш бюджет, формат та стандарти.",
};

export default function HotelsPage() {
  return (
    <main className="flex w-full flex-1 flex-col">
      <HotelsHero />
      <ZonesGrid />
      <HotelBenefits />
      <StarRequestStrip />
      <PartnerBrands />
      <Solutions />
      <SupplyExamples />
      <HotelQuizCta />
      <HotelFaq />
    </main>
  );
}
