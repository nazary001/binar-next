import { SpivpratsyaHero } from "@/components/spivpratsya/Hero";
import { Audiences } from "@/components/spivpratsya/Audiences";
import { Coverage } from "@/components/spivpratsya/Coverage";
import { Formats } from "@/components/spivpratsya/Formats";
import { WhyPartners } from "@/components/spivpratsya/WhyPartners";
import { StarRequestStrip } from "@/components/hotels/StarRequestStrip";
import { HowItWorks } from "@/components/spivpratsya/HowItWorks";
import { PartnerContactForm } from "@/components/spivpratsya/PartnerContactForm";
import { Faq } from "@/components/home/Faq";

export const metadata = {
  title: "Співпраця — Binar",
  description:
    "Партнер у комплектації готелів та комерційних об’єктів. Підключаємось до проєктів дизайнерів, архітекторів, девелоперів і консультантів.",
};

export default function SpivpratsyaPage() {
  return (
    <main className="flex w-full flex-1 flex-col">
      <SpivpratsyaHero />
      <Audiences />
      <Coverage />
      <Formats />
      <WhyPartners />
      <StarRequestStrip />
      <HowItWorks />
      <PartnerContactForm />
      {/* Figma MOBILE master (3166:7865) ends the FAQ with a centred
          "Показати більше" pill; desktop has none. moreButtonMobileOnly
          shows it only below lg. */}
      <Faq showMoreButton moreButtonMobileOnly />
    </main>
  );
}
