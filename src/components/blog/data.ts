// Blog content model. The Figma «Блог» page defines 6 cards in the
// listing grid plus one fully-written article («Тендер на оснащення
// готелю»). We keep those 6 exactly as designed and add 3 more in-theme
// posts so the «Показати більше» pagination and the category filter have
// something to reveal — the initial view (6 cards + button) still matches
// the Figma master 1:1.

export type BlogPost = {
  slug: string;
  // Filter category — matches one of BLOG_CATEGORIES so the chips filter.
  category: string;
  // Short label shown on the card (rendered uppercase via CSS, matching
  // Figma where every card category is upper-cased).
  categoryLabel: string;
  title: string;
  excerpt: string;
  image: string;
};

// Filter chips, in Figma order. «Всі статті» is the default (orange) chip.
export const BLOG_CATEGORIES = [
  "Всі статті",
  "Готелі",
  "Клінінг",
  "Гігієна та косметика",
  "Стандарти якості",
  "Закупівлі",
] as const;

const EXCERPT =
  "Критерії відбору постачальників та типові помилки при первинному оснащенні.";

export const BLOG_POSTS: BlogPost[] = [
  // --- Figma listing, row 1 ---
  {
    slug: "tender-na-osnaschennya-gotelyu",
    category: "Закупівлі",
    categoryLabel: "Закупівлі",
    title: "Тендер на оснащення готелю: як не переплатити",
    excerpt: EXCERPT,
    image: "/figma-export/blog/card-zakupivli.png",
  },
  {
    slug: "iso-9001-v-goteli",
    category: "Стандарти якості",
    categoryLabel: "Стандарти",
    title: "ISO 9001 в готелі: практика впровадження без зупинки",
    excerpt:
      "Реальний досвід переходу: тайм-лайн, витрати та вплив на рейтинги.",
    image: "/figma-export/blog/card-standarti.png",
  },
  {
    slug: "klininhovyi-protokol-5-zirok",
    category: "Клінінг",
    categoryLabel: "Клінінг",
    title: "Клініговий протокол для 5-зіркових готелів: від лобі до SPA",
    excerpt: EXCERPT,
    image: "/figma-export/blog/card-klining.png",
  },
  // --- Figma listing, row 2 ---
  {
    slug: "hotelnyi-tekstyl-200-pran",
    category: "Готелі",
    categoryLabel: "Готелі",
    title: "Як вибрати готельний текстиль, що витримає 200+ прань",
    excerpt: EXCERPT,
    image: "/figma-export/blog/card-tekstil.png",
  },
  {
    slug: "aromamarketynh-loyalnist-gostey",
    category: "Готелі",
    categoryLabel: "Готелі",
    title: "Аромамаркетинг: як запах підвищує лояльність гостей",
    excerpt: EXCERPT,
    image: "/figma-export/blog/card-aroma.png",
  },
  {
    slug: "tender-na-osnaschennya-gotelyu-2",
    category: "Закупівлі",
    categoryLabel: "Закупівлі",
    title: "Тендер на оснащення готелю: як не переплатити",
    excerpt: EXCERPT,
    image: "/figma-export/blog/card-tender.png",
  },
  // --- Extra posts (revealed by «Показати більше» / category filter) ---
  {
    slug: "hostova-kosmetyka-formaty-ta-brenduvannya",
    category: "Гігієна та косметика",
    categoryLabel: "Косметика",
    title: "Гостьова косметика: формати, обсяги та брендування",
    excerpt:
      "Саше, флакони чи дозатори — як обрати формат під клас готелю та бюджет.",
    image: "/figma-export/blog/card-zakupivli.png",
  },
  {
    slug: "shchodenne-prybyrannya-nomeriv-cheklist",
    category: "Клінінг",
    categoryLabel: "Клінінг",
    title: "Щоденне прибирання номерів: чек-лист для покоївок",
    excerpt:
      "Послідовність дій, норми часу та контроль якості для стабільного сервісу.",
    image: "/figma-export/blog/card-klining.png",
  },
  {
    slug: "specyfikatsiya-tekstylyu-dlya-tendera",
    category: "Закупівлі",
    categoryLabel: "Закупівлі",
    title: "Як скласти специфікацію текстилю для тендера",
    excerpt:
      "Щільність, склад і параметри прання, які варто прописати ще до запиту цін.",
    image: "/figma-export/blog/card-tender.png",
  },
];

// The single article fully written in the Figma «Блог :: Стаття» frame.
// Rendered for every /blog/[slug] page (the design specifies one article
// body); the per-post title, category and image come from BLOG_POSTS.
export const ARTICLE_BODY = {
  intro:
    "Первинне оснащення готелю — один з найбільших одноразових витрат у бізнесі. Від правильної організації закупівельного процесу залежить не лише бюджет, а й якість усього, що потрапить до номерів, ресторанів і spa-зон.",
  sections: [
    {
      heading: "Чому більшість власників переплачують",
      paragraphs: [
        "Основна проблема — поспіх. Відкриття готелю завжди має дедлайн, і у власників бракує часу на ретельний аналіз ринку. У результаті вони обирають першого-ліпшого постачальника, який може закрити весь список за прийнятні строки. Але «прийнятні строки» часто означають надмірну ціну.",
        "Другий фактор — відсутність чітких специфікацій. Коли ТЗ містить «постільна білизна 200×220 см», а не «бавовна мако 400TC, щільність 140 г/м²», постачальник заповнює прогалини своїми критеріями — і не завжди на вашу користь.",
      ],
    },
  ],
  listSection: {
    heading: "5 критеріїв відбору постачальника",
    items: [
      "Досвід у готельному сегменті — не менше 3 років роботи з об'єктами від 50 номерів",
      "Власне виробництво або ексклюзивний контракт з виробником",
      "Сертифікати якості: OEKO-TEX, ISO 9001 або еквіваленти",
      "Наявність шоу-румів або можливість замовлення зразків",
      "Чіткі умови гарантійного обслуговування та заміни",
    ],
  },
  tags: ["закупівлі", "готелі", "косметика"],
};
