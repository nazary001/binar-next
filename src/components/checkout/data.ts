// Checkout content — Figma «Оформити замовлення» (4329:40696). Field
// labels, the delivery / payment vocabularies and the pickup notice are
// verbatim from the masters; the city and branch lists are placeholders
// until the Nova Poshta API is wired.

export const RESERVE_MINUTES = 15;

export type DeliveryOption = "pickup" | "np-branch" | "np-address";

export const DELIVERY_OPTIONS: { value: DeliveryOption; label: string }[] = [
  { value: "pickup", label: "Самовивіз" },
  { value: "np-branch", label: "Нова Пошта (Самовивіз)" },
  { value: "np-address", label: "Нова Пошта (Адресна доставка)" },
];

// «Банківською карткою» is the master's filled value; the other two are
// the payment methods the product page's delivery tab lists.
export const PAYMENT_OPTIONS = [
  "Банківською карткою",
  "Безготівковий розрахунок",
  "Післяплата",
] as const;

// Figma 4329:41061.
export const PICKUP_NOTICE =
  "Самовивіз доступний за адресою: Україна, м. Київ, вул. Хрещатик, 1, пн–пт з 09:00 до 18:00. Будь ласка, дочекайтеся повідомлення про готовність замовлення перед візитом.";

export const CITIES = [
  "Київ",
  "Львів",
  "Одеса",
  "Дніпро",
  "Харків",
  "Запоріжжя",
  "Вінниця",
  "Полтава",
  "Івано-Франківськ",
  "Черкаси",
  "Чернігів",
  "Житомир",
  "Рівне",
  "Тернопіль",
  "Луцьк",
  "Ужгород",
  "Хмельницький",
  "Кропивницький",
  "Миколаїв",
  "Суми",
];

export const BRANCHES = [
  "Відділення №1: вул. Хрещатик, 1",
  "Відділення №2: просп. Перемоги, 24",
  "Відділення №5: вул. Велика Васильківська, 72",
  "Відділення №12: вул. Борщагівська, 154",
  "Відділення №27: просп. Бажана, 10",
  "Поштомат №4021: вул. Саксаганського, 120",
];

export type CheckoutValues = {
  name: string;
  email: string;
  phone: string;
  city: string;
  delivery: DeliveryOption | "";
  branch: string;
  street: string;
  house: string;
  flat: string;
  payment: string;
  comment: string;
  invoice: boolean;
  company: string;
  edrpou: string;
  ipn: string;
  address: string;
  invoiceEmail: string;
};

export const EMPTY_VALUES: CheckoutValues = {
  name: "",
  email: "",
  phone: "",
  city: "",
  delivery: "",
  branch: "",
  street: "",
  house: "",
  flat: "",
  payment: "",
  comment: "",
  invoice: false,
  company: "",
  edrpou: "",
  ipn: "",
  address: "",
  invoiceEmail: "",
};

export type CheckoutErrors = Partial<Record<keyof CheckoutValues, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s()-]{10,}$/;

export function validate(v: CheckoutValues): CheckoutErrors {
  const e: CheckoutErrors = {};
  if (!v.name.trim()) e.name = "Вкажіть ім'я";
  if (!v.email.trim()) e.email = "Вкажіть email";
  else if (!EMAIL.test(v.email.trim())) e.email = "Перевірте формат email";
  if (!v.phone.trim()) e.phone = "Вкажіть номер телефону";
  else if (!PHONE.test(v.phone.trim())) e.phone = "Перевірте номер телефону";
  if (!v.city.trim()) e.city = "Оберіть місто";
  if (!v.delivery) e.delivery = "Оберіть спосіб доставки";
  if (v.delivery === "np-branch" && !v.branch) e.branch = "Оберіть відділення";
  if (v.delivery === "np-address") {
    if (!v.street.trim()) e.street = "Вкажіть вулицю";
    if (!v.house.trim()) e.house = "Вкажіть будинок";
  }
  if (!v.payment) e.payment = "Оберіть спосіб оплати";
  if (v.invoice) {
    if (!v.company.trim()) e.company = "Вкажіть назву компанії";
    if (!/^\d{8}$/.test(v.edrpou.trim())) e.edrpou = "ЄДРПОУ - 8 цифр";
    if (v.ipn.trim() && !/^\d{10,12}$/.test(v.ipn.trim())) e.ipn = "ІПН - 10 або 12 цифр";
    if (!v.address.trim()) e.address = "Вкажіть адресу";
    if (!v.invoiceEmail.trim()) e.invoiceEmail = "Вкажіть email для рахунку";
    else if (!EMAIL.test(v.invoiceEmail.trim())) e.invoiceEmail = "Перевірте формат email";
  }
  return e;
}
