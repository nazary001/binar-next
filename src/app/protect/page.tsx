import { ProtectHero } from "@/components/protect/Hero";
import { TargetAudiences } from "@/components/protect/TargetAudiences";
import { ProtectBenefits } from "@/components/protect/Benefits";
import { ProtectQualityProcess } from "@/components/protect/QualityProcess";
import { ProtectSolutions } from "@/components/protect/Solutions";
import { ProtectQuizCta } from "@/components/protect/QuizCta";
import { ProtectFaq } from "@/components/protect/Faq";

export const metadata = {
  title: "PROTECT — Засоби індивідуального захисту — Binar",
  description:
    "ЗІЗ і одноразовий спецодяг для виробництв, медичних закладів, салонів краси та сервісних компаній.",
};

export default function ProtectPage() {
  return (
    <main className="flex w-full flex-1 flex-col">
      <ProtectHero />
      <TargetAudiences />
      <ProtectBenefits />
      <ProtectQualityProcess />
      <ProtectSolutions />
      <ProtectQuizCta />
      <ProtectFaq />
    </main>
  );
}
