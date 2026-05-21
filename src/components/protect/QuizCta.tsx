import { QuizForm, type QuizStep } from "../home/QuizForm";

const PROTECT_STEPS: QuizStep[] = [
  {
    title: "Який тип бізнесу?",
    field: "industry",
    options: [
      { value: "production", label: "Виробниче підприємство" },
      { value: "medical", label: "Медичний заклад" },
      { value: "cleaning", label: "Клінінгова компанія" },
      { value: "horeca", label: "HoReCa" },
      { value: "spa", label: "SPA / Салон краси" },
    ],
  },
  {
    title: "Що цікавить найбільше?",
    field: "category",
    options: [
      { value: "masks", label: "Маски та респіратори" },
      { value: "gowns", label: "Одноразові халати та комбінезони" },
      { value: "accessories", label: "Бахіли, шапочки, нарукавники" },
      { value: "gloves", label: "Рукавички" },
      { value: "all", label: "Комплексний підбір" },
    ],
  },
  {
    title: "Який обсяг та формат?",
    field: "volume",
    options: [
      { value: "one-off", label: "Разова закупівля" },
      { value: "regular", label: "Регулярні поставки" },
      { value: "tender", label: "Тендерна закупівля" },
    ],
  },
  {
    title: "Куди надіслати рекомендації?",
    field: "name",
    custom: "contact",
  },
];

export function ProtectQuizCta() {
  return (
    <QuizForm
      steps={PROTECT_STEPS}
      // Same bold-then-light pattern as the home QuizForm; body split
      // into two short paragraphs to match home's flex-1 right column
      // rhythm (one long paragraph wraps into a tall block in the
      // 575-px column).
      headingTitle={
        <>
          <span className="text-h2">Отримайте підбір рішень </span>
          <span className="text-h2-light">для вашого бізнесу</span>
        </>
      }
      headingBody={
        <>
          <p>
            Заповніть форму за 1 хвилину, і ми підготуємо підбір ЗІЗ та
            одноразового одягу під ваші процеси, бюджет і стандарти.
          </p>
          <p>
            Ви отримаєте готову специфікацію, документи й комерційну
            пропозицію без зайвих дзвінків і уточнень.
          </p>
        </>
      }
    />
  );
}
