import { QuizForm, type QuizStep } from "../home/QuizForm";

const HOTEL_STEPS: QuizStep[] = [
  {
    title: "Яка ваша задача зараз?",
    field: "task",
    options: [
      { value: "budget", label: "Підібрати оптимальні позиції під бюджет" },
      { value: "upgrade", label: "Оновити стандарти / покращити сервіс" },
      { value: "one-off", label: "Разова закупівля" },
      { value: "replace", label: "Замінити поточного постачальника" },
      { value: "regular", label: "Потрібні регулярні поставки" },
    ],
  },
  {
    title: "Який тип об'єкта?",
    field: "type",
    options: [
      { value: "hotel", label: "Готель" },
      { value: "hostel", label: "Хостел" },
      { value: "apartments", label: "Апартаменти" },
      { value: "boutique", label: "Бутік-готель" },
    ],
  },
  {
    title: "Куди надіслати рекомендації?",
    field: "name",
    custom: "contact",
  },
];

// Figma 1384:12118 (Group 65) and 1384:12139 (Group 64) — same 246x294
// left/right decoration stacks as the home page, just with hotel-specific
// silhouettes (bottles + sponge + slippers). All asset placement and the
// lg+ visibility are handled by QuizForm's `decorations` prop so the
// pattern matches /, /protect, /cleaning.
export function HotelQuizCta() {
  return (
    <QuizForm
      steps={HOTEL_STEPS}
      decorations="hotels"
      // Same bold-then-light heading pattern as the home QuizForm: the
      // opening clause is text-h2 (bold), the closing clause is
      // text-h2-light. The body is split into two short paragraphs to
      // match the home form's flex-1 right column rhythm.
      headingTitle={
        <>
          <span className="text-h2-light">{`Отримайте індивідуальні рекомендації по товарах `}</span>
          <span className="text-h2">{`для вашого об'єкта`}</span>
        </>
      }
      headingBody={
        <>
          <p>
            Заповніть форму за 1 хвилину, і ми підготуємо підбір під ваш формат,
            бюджет і задачі.
          </p>
          <p>
            Ви отримаєте готові рекомендації та комерційну пропозицію, щоб
            швидко погодити закупівлю й перейти до замовлення без зайвих
            дзвінків і уточнень.
          </p>
        </>
      }
    />
  );
}
