import { Hero } from "@/components/home/Hero";
import { Directions } from "@/components/home/Directions";
import { WhyUs } from "@/components/home/WhyUs";
import { AboutUs } from "@/components/home/AboutUs";
import { TrustBand } from "@/components/home/TrustBand";
import { Cases } from "@/components/home/Cases";
import { LogosMarquee } from "@/components/home/LogosMarquee";
import { TeamCta } from "@/components/home/TeamCta";
import { QuizForm } from "@/components/home/QuizForm";
import { Faq } from "@/components/home/Faq";

export default function HomePage() {
  return (
    <main className="flex w-full flex-1 flex-col">
      {/* All sections are full-width. Content stays at the 1440 design's
          x-positions via adaptive horizontal padding (.lg-pad-x in
          globals.css), so backgrounds, borders, photos and dividers run
          edge-to-edge on viewports wider than 1440 while text/elements
          remain centered at design proportions. */}
      <Hero />
      <Directions />
      <WhyUs />
      <AboutUs />
      <TrustBand />
      <Cases />
      <LogosMarquee />
      <TeamCta />
      <QuizForm />
      <Faq />
    </main>
  );
}
