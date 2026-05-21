import { CleaningHero } from "@/components/cleaning/Hero";
import { CleaningAudience } from "@/components/cleaning/Audience";
import { CleaningBenefits } from "@/components/cleaning/Benefits";
import { CleaningSolutions } from "@/components/cleaning/Solutions";
import { CleaningProcess } from "@/components/cleaning/Process";
import { CleaningPartnerBrands } from "@/components/cleaning/PartnerBrands";
import { CleaningQuizCta } from "@/components/cleaning/QuizCta";
import { CleaningFaq } from "@/components/cleaning/Faq";

export const metadata = {
  title: "CLEANING — Засоби та інвентар для прибирання — Binar",
  description:
    "Професійна хімія, інвентар та гігієна для бізнесу: готелі, HoReCa, клінінг, медицина, виробництво.",
};

export default function CleaningPage() {
  return (
    <main className="flex w-full flex-1 flex-col">
      <CleaningHero />
      <CleaningAudience />
      <CleaningBenefits />
      <CleaningSolutions />
      <CleaningProcess />
      <CleaningPartnerBrands />
      <CleaningQuizCta />
      <CleaningFaq />
    </main>
  );
}
