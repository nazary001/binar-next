// Account area of the site — Figma «Реєстрація» section 4573:36735:
// the «Sign up» drawer (phone -> SMS code -> registration in three
// steps), the «Sign in» drawer (login + password, password recovery)
// and the first-login «Вітаємо на платформі» modal. Everything the
// screens share lives here: the record shapes, the option lists and the
// validators / formatters.

export const AUTH_STORAGE_KEY = "binar.auth.v1";

// The SMS code is four digits (4573:35491) and stays valid for three
// minutes — the master shows the countdown at «2:51».
export const CODE_LENGTH = 4;
export const CODE_TTL_SECONDS = 180;

// «Завантажити лого компанії» accepts PNG / JPG up to 5 MB
// (4573:35606); the stored copy is downscaled to this square.
export const LOGO_MAX_BYTES = 5 * 1024 * 1024;
export const LOGO_MIME = ["image/png", "image/jpeg"];
export const LOGO_STORE_PX = 288;

export type CompanyData = {
  name: string;
  edrpou: string;
  region: string;
  city: string;
};

export type PersonData = {
  fullName: string;
  role: string;
  position: string;
  phone: string;
  email: string;
};

// One registered account. `phone` is the national number the person
// verified by SMS («0634714689» in the master); it doubles as the login.
export type Account = {
  id: string;
  phone: string;
  login: string;
  passwordHash: string;
  company: CompanyData;
  person: PersonData;
  createdAt: string;
  // The «Вітаємо на платформі» modal shows once, right after registration.
  welcomed: boolean;
  logo?: string;
};

export type AuthState = {
  accounts: Account[];
  sessionId: string | null;
};

export const EMPTY_STATE: AuthState = { accounts: [], sessionId: null };

export const EMPTY_COMPANY: CompanyData = { name: "", edrpou: "", region: "", city: "" };
export const EMPTY_PERSON: PersonData = {
  fullName: "",
  role: "",
  position: "",
  phone: "",
  email: "",
};

// «Область» options (registration 2/3).
export const REGIONS = [
  "Київ",
  "Вінницька",
  "Волинська",
  "Дніпропетровська",
  "Донецька",
  "Житомирська",
  "Закарпатська",
  "Запорізька",
  "Івано-Франківська",
  "Київська",
  "Кіровоградська",
  "Луганська",
  "Львівська",
  "Миколаївська",
  "Одеська",
  "Полтавська",
  "Рівненська",
  "Сумська",
  "Тернопільська",
  "Харківська",
  "Херсонська",
  "Хмельницька",
  "Черкаська",
  "Чернівецька",
  "Чернігівська",
].map((r) => ({ value: r, label: r === "Київ" ? "м. Київ" : `${r} область` }));

// «Роль» options (registration 3/3): the person creating the company
// account is its administrator; the profile later adds employees and
// counterparties («Додавайте співробітників та контрагентів»).
export const ROLES = [
  { value: "owner", label: "Власник бізнесу" },
  { value: "admin", label: "Адміністратор компанії" },
  { value: "purchasing", label: "Менеджер із закупівель" },
  { value: "accountant", label: "Бухгалтер" },
  { value: "other", label: "Інша роль" },
];

export function roleLabel(value: string): string {
  return ROLES.find((r) => r.value === value)?.label ?? value;
}

// --- phone -----------------------------------------------------------

// Keeps the national digits of a Ukrainian mobile number («0634714689»)
// from anything the person typed or pasted: «+38 063 567 8793»,
// «380635678793», «063-567-87-93»...
export function phoneDigits(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("380")) d = d.slice(2);
  else if (d.startsWith("38") && d.length > 10) d = d.slice(2);
  if (d.length > 0 && !d.startsWith("0")) d = `0${d}`;
  return d.slice(0, 10);
}

// The master shows the typed number as «+38 063 567 8793».
export function formatPhone(raw: string): string {
  const d = phoneDigits(raw);
  if (!d) return "";
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean);
  return `+38 ${parts.join(" ")}`;
}

// «Введіть код, який ми надіслали на номер [063 567 8793]».
export function formatPhoneShort(raw: string): string {
  const d = phoneDigits(raw);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean).join(" ");
}

export function isValidPhone(raw: string): boolean {
  const d = phoneDigits(raw);
  return d.length === 10 && /^0[3-9]\d{8}$/.test(d);
}

// --- other validators ------------------------------------------------

export function isValidEdrpou(raw: string): boolean {
  return /^\d{8}$/.test(raw.trim());
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim());
}

export const PASSWORD_MIN = 8;

export function passwordError(value: string): string | undefined {
  if (!value) return "Введіть пароль";
  if (value.length < PASSWORD_MIN) return `Мінімум ${PASSWORD_MIN} символів`;
  return undefined;
}

export function required(value: string, message = "Обов'язкове поле"): string | undefined {
  return value.trim() ? undefined : message;
}

export function firstName(fullName: string): string {
  // «Прізвище Ім'я По батькові» -> the given name; a single word stays.
  const parts = fullName.trim().split(/\s+/);
  return parts.length >= 2 ? parts[1] : parts[0] ?? "";
}

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
