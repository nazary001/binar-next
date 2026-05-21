import { PartnerBrands } from "../hotels/PartnerBrands";

export function CleaningPartnerBrands() {
  return (
    <PartnerBrands
      heading={
        <>
          <span className="text-h2-light">Партнери-виробники </span>
          <br aria-hidden className="hidden lg:inline" />
          <span className="text-h2-light">та бренди, </span>
          <span className="text-h2">з якими ми працюємо</span>
        </>
      }
      body={
        <p>
          Ми постачаємо продукцію перевірених виробників професійної хімії та
          гігієни. Це гарантує стабільні характеристики, прогнозовану якість і
          відповідність вимогам бізнесу.
        </p>
      }
    />
  );
}
