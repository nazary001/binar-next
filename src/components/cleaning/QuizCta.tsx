import { QuizForm, type QuizStep } from "../home/QuizForm";

const CLEANING_STEPS: QuizStep[] = [
  {
    title: "Який тип об'єкта?",
    field: "facility",
    options: [
      { value: "hotel", label: "Готель" },
      { value: "horeca", label: "HoReCa" },
      { value: "cleaning", label: "Клінінгова компанія" },
      { value: "medical", label: "Медичний заклад" },
      { value: "factory", label: "Виробництво" },
    ],
  },
  {
    title: "Що цікавить найбільше?",
    field: "category",
    options: [
      { value: "chemicals", label: "Професійна хімія" },
      { value: "tools", label: "Інвентар та обладнання" },
      { value: "hygiene", label: "Гігієна та паперова продукція" },
      { value: "disinfection", label: "Дезінфекція" },
      { value: "all", label: "Комплексний підбір" },
    ],
  },
  {
    title: "Який обсяг та формат?",
    field: "volume",
    options: [
      { value: "one-off", label: "Разова закупівля" },
      { value: "regular", label: "Регулярні поставки" },
      { value: "consult", label: "Потрібна консультація" },
    ],
  },
  {
    title: "Куди надіслати рекомендації?",
    field: "name",
    custom: "contact",
  },
];

export function CleaningQuizCta() {
  return (
    <QuizForm
      steps={CLEANING_STEPS}
      // Same bold-then-light pattern as the home QuizForm; body split
      // into two short paragraphs to match home's flex-1 right column
      // rhythm.
      headingTitle={
        <>
          <span className="text-h2">Отримайте підбір рішень </span>
          <span className="text-h2-light">{`для вашого об'єкта`}</span>
        </>
      }
      headingBody={
        <p>
          {`Заповніть коротку форму — і ми підготуємо для вас
          індивідуальний підбір позицій та комерційну пропозицію.
          Без зайвих дзвінків і уточнень — тільки те, що вам реально
          потрібно.`}
        </p>
      }
    />
  );
}
