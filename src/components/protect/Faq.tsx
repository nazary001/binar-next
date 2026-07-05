import { Faq, type FaqEntry } from "../home/Faq";

// Figma 1327:4140-4143 — the PROTECT FAQ uses the home-page default
// Question instances (same four generic supply/order questions), and
// the Figma frame ends right after the last question with no "Показати
// більше" CTA below the list.
const PROTECT_FAQS: FaqEntry[] = [
  {
    q: "Які терміни постачання?",
    a: "Терміни залежать від типу продукції. Стандартні позиції зі складу постачаємо оперативно. Кастомізовані або замовні рішення мають індивідуальні строки, які погоджуємо перед підтвердженням КП.",
  },
  {
    q: "Чи є мінімальне замовлення?",
    a: "Мінімальний обсяг залежить від категорії товару та формату постачання. Ми підбираємо оптимальні обсяги під ваші реальні потреби, щоб закупівля була економічно обґрунтованою.",
  },
  {
    q: "Чи можна замовити регулярні поставки за графіком?",
    a: "Так, ми працюємо з регулярними постачаннями. Узгоджуємо обсяги, періодичність і фіксуємо логіку співпраці, щоб уникнути перебоїв і позапланових закупівель.",
  },
  {
    q: "Як формується комерційна пропозиція та ціна?",
    a: "Комерційна пропозиція формується на основі вашого запиту: тип обʼєкта, продукція, обсяги та формат постачання. Це дозволяє отримати прозорий прорахунок без зайвих позицій і прихованих умов.",
  },
];

export function ProtectFaq() {
  // Figma MOBILE master (3165:5568) ends the FAQ with a centred
  // "Показати більше" pill; the desktop master has none. moreButtonMobileOnly
  // shows the (inert — protect has no extra questions) button only below lg.
  return <Faq faqs={PROTECT_FAQS} showMoreButton moreButtonMobileOnly />;
}
