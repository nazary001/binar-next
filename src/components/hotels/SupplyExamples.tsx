import { Cases, type CaseEntry } from "../home/Cases";
import { Button } from "@/components/ui/Button";

const HOTEL_CASES: CaseEntry[] = [
  {
    name: "Rixos",
    logo: "/figma-export/cases/logo-rixos.svg",
    logoClass: "h-[47px] w-[160px]",
    description:
      "Розробка унікального кастомного дизайну з інтеграцією логотипу готелю, що підкреслює його індивідуальність та стиль, забезпечуючи впізнаваність бренду та привабливість для гостей.",
    tags: ["готельна косметика", "косметичні набори", "тапочки"],
    image: "/figma-export/cases/img-rixos.png",
    imageStyle: { left: "-12.06%", top: "-0.82%", width: "158.25%", height: "205.07%" },
    // Mobile (<lg) crop mirrors home/Cases.tsx Rixos (Figma 3094:5131).
    mobileImageStyle: { left: "-7.64%", top: "-24.61%", width: "118.47%", height: "293.18%" },
    stats: [
      { value: "4", label: "роки співпраці" },
      { value: "200", label: "оснащених номерів" },
    ],
  },
  {
    name: "Mirotel",
    logo: "/figma-export/cases/logo-mirotel.svg",
    logoClass: "h-[54px] w-[119px]",
    description:
      "Розробка унікального кастомного дизайну з інтеграцією логотипу готелю, що підкреслює його індивідуальність та стиль, забезпечуючи впізнаваність бренду та привабливість для гостей.",
    tags: ["готельна косметика", "косметичні набори", "тапочки"],
    image: "/figma-export/cases/img-mirotel.png",
    imageStyle: { left: "-12.06%", top: "-34.65%", width: "113.17%", height: "146.64%" },
    // Mobile (<lg) crop mirrors home/Cases.tsx Mirotel (Figma 3094:5177).
    mobileImageStyle: { left: "-7.64%", top: "-121.77%", width: "118.47%", height: "293.29%" },
    stats: [
      { value: "3", label: "роки співпраці" },
      { value: "1200", label: "оснащених номерів" },
    ],
  },
];

export function SupplyExamples() {
  return (
    <>
      {/* Figma mobile master 3117:14490 ("Приклади постачання для
          готелів"): the header block is `px-24 py-60` (24-px gutter,
          60-px vertical) with a `gap-32` column between the 30/36 heading
          and the COMPACT (small) CTA. Desktop keeps its 130-px lg-pad-x
          gutter + 160-px vertical + flex-row header via the lg: classes
          and `lg-pad-x` (which wins over the base px-6 above lg), so the
          desktop layout is unchanged. */}
      <section className="lg-pad-x bg-white px-6 pt-[60px] pb-0 lg:py-[160px]">
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-start">
          <h2 className="max-w-[574px] text-neutral-900">
            <span className="text-h2-light">Приклади постачання</span>
            <br aria-hidden />
            <span className="text-h2">для готелів</span>
          </h2>
          {/* size="responsive" renders Figma's compact 16/22 pill + 42-px
              orange arrow below lg (the mobile master) and the large CTA
              at lg, in one instance, so desktop stays identical. */}
          <Button href="/#contact-form" size="responsive" arrow>
            Підібрати рішення
          </Button>
        </div>
      </section>
      <Cases entries={HOTEL_CASES} />
    </>
  );
}
