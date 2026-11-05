// Checkout content — Figma «Оформити замовлення» (4329:40696). Field
// labels, the delivery / payment vocabularies and the pickup notice are
// verbatim from the masters; the city and branch lists are placeholders
// until the Nova Poshta API is wired.

import { isValidPhone } from "@/components/auth/data";

export const RESERVE_MINUTES = 15;

// sessionStorage key prefix of the form draft (useCheckoutDraft; the
// account id or "guest" follows after a colon).
export const DRAFT_KEY = "binar.checkout.draft.v1";

export type DeliveryOption = "pickup" | "np-branch" | "np-locker" | "np-address";

export const DELIVERY_OPTIONS: { value: DeliveryOption; label: string }[] = [
  { value: "pickup", label: "Самовивіз" },
  { value: "np-branch", label: "Нова Пошта (Самовивіз)" },
  { value: "np-locker", label: "Нова Пошта (Поштомат)" },
  { value: "np-address", label: "Нова Пошта (Адресна доставка)" },
];

// The payment «<Menu>» of the master (4329:41085, the slot of the open
// form variant 4329:41086): three 46-px items in this order, verbatim.
export const PAYMENT_OPTIONS = [
  "Банківською карткою",
  "Безготівковий розрахунок",
  "Післяплата",
] as const;

// The four delivery methods of the master's «<Menu>» (4329:41044): a
// branch pickup asks for «Відділення» (4329:41150), a parcel locker for
// «Поштомат» (4329:41168), address delivery for the street and house.
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

// Placeholder lists until the Nova Poshta API is wired.
export const BRANCHES = [
  "Відділення №1: вул. Хрещатик, 1",
  "Відділення №2: просп. Перемоги, 24",
  "Відділення №5: вул. Велика Васильківська, 72",
  "Відділення №12: вул. Борщагівська, 154",
  "Відділення №27: просп. Бажана, 10",
];

export const LOCKERS = [
  "Поштомат №4021: вул. Саксаганського, 120",
  "Поштомат №6318: вул. Антоновича, 176",
  "Поштомат №7502: просп. Науки, 8",
  "Поштомат №9114: вул. Дегтярівська, 21",
  "Поштомат №10233: бульв. Лесі Українки, 26",
];

// Select options of the two lists. Desktop shows `label` (the full
// string); phones show two lines, `primary` ("Поштомат N10233") over
// `secondary` ("бульв. Лесі Українки, 26"), split at the first ": "
// (checkout spec 2.6, fields.tsx SelectOption).
function splitPlace(place: string): { value: string; label: string; primary?: string; secondary?: string } {
  const at = place.indexOf(": ");
  if (at < 0) return { value: place, label: place };
  return { value: place, label: place, primary: place.slice(0, at), secondary: place.slice(at + 2) };
}

export const BRANCH_OPTIONS = BRANCHES.map(splitPlace);
export const LOCKER_OPTIONS = LOCKERS.map(splitPlace);

export type CheckoutValues = {
  name: string;
  email: string;
  phone: string;
  city: string;
  delivery: DeliveryOption | "";
  branch: string;
  locker: string;
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
  locker: "",
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

export function validate(v: CheckoutValues): CheckoutErrors {
  const e: CheckoutErrors = {};
  if (!v.name.trim()) e.name = "Вкажіть ім'я";
  if (!v.email.trim()) e.email = "Вкажіть email";
  else if (!EMAIL.test(v.email.trim())) e.email = "Перевірте формат email";
  if (!v.phone.trim()) e.phone = "Вкажіть номер телефону";
  // 10 national digits 0[3-9]XXXXXXXX once "+38", spaces, brackets and
  // dashes are stripped (the account forms' rule, auth/data.ts).
  else if (!isValidPhone(v.phone)) e.phone = "Перевірте номер телефону";
  if (!v.city.trim()) e.city = "Оберіть місто";
  if (!v.delivery) e.delivery = "Оберіть спосіб доставки";
  if (v.delivery === "np-branch" && !v.branch) e.branch = "Оберіть відділення";
  if (v.delivery === "np-locker" && !v.locker) e.locker = "Оберіть поштомат";
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

// The payload keeps only what the chosen delivery method and the invoice
// switch ask for: a branch / locker / address typed before the method was
// changed, or company data with the invoice unticked, never travel with
// the order (CO-34).
export function pruneDelivery(v: CheckoutValues): CheckoutValues {
  return {
    ...v,
    branch: v.delivery === "np-branch" ? v.branch : "",
    locker: v.delivery === "np-locker" ? v.locker : "",
    street: v.delivery === "np-address" ? v.street : "",
    house: v.delivery === "np-address" ? v.house : "",
    flat: v.delivery === "np-address" ? v.flat : "",
    company: v.invoice ? v.company : "",
    edrpou: v.invoice ? v.edrpou : "",
    ipn: v.invoice ? v.ipn : "",
    address: v.invoice ? v.address : "",
    invoiceEmail: v.invoice ? v.invoiceEmail : "",
  };
}
