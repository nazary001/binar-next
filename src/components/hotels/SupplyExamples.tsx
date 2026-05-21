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
    stats: [
      { value: "4 роки", suffix: "", label: "співпраці" },
      { value: "15000", label: "товарів" },
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
    stats: [
      { value: "9 років", suffix: "", label: "співпраці" },
      { value: "200000", label: "товарів" },
    ],
  },
];

export function SupplyExamples() {
  return (
    <>
      <section className="lg-pad-x bg-white px-5 py-16 sm:px-10 sm:py-20 lg:py-[160px]">
        <div className="flex flex-col items-start justify-between gap-6 sm:gap-8 lg:flex-row lg:items-start">
          <h2 className="max-w-[574px] text-neutral-900">
            <span className="text-h2-light">Приклади постачання</span>
            <br aria-hidden />
            <span className="text-h2">для готелів</span>
          </h2>
          <Button href="/#contact-form" arrow>
            Підібрати рішення
          </Button>
        </div>
      </section>
      <Cases entries={HOTEL_CASES} />
    </>
  );
}
