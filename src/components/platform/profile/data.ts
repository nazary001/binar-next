// «Мій профіль : Admin» - Figma section 4868:30956 (Контрагенти
// 4868:30958, Співробітники 4868:31376, their Empty frames 4929:64196 /
// 4929:64664 and the contract / counterparty / invite modals). The
// company admin's cabinet page: own and company data, the password, the
// company's counterparties (legal entities that sign contracts) and the
// employees invited to the platform.
//
// There is no CRM yet: the lists live in the browser (store.ts) under
// one record per account, seeded for the shared demo partner with the
// rows the Figma frames draw. Strings are verbatim from the Figma text
// layers (the master's “ ” quotes included); label widths that the
// metadata only gives as boxes were proven by measuring Manrope in
// Chromium (see the notes next to each constant).

import type { StatusTone } from "@/components/platform/ui/StatusPill";

export const PROFILE_STORAGE_KEY = "binar.profile.v1";

// --- statuses ---------------------------------------------------------

// «Статус контрагента» - the table badge (md pill with the dot). The
// frame draws «Активний» (green) and «Не активний» (orange,
// 4868:31083); a counterparty the partner adds here waits for the
// manager's check, shown with the amber «На розгляді» of the status
// family (5070:75396).
export type CounterpartyStatus = "active" | "inactive" | "review";

export const COUNTERPARTY_STATUS: Record<CounterpartyStatus, { label: string; tone: StatusTone }> = {
  active: { label: "Активний", tone: "green" },
  inactive: { label: "Не активний", tone: "orange" },
  review: { label: "На розгляді", tone: "amber" },
};

// Contract status. «Діє» / «Завершений» are the pills of «Кілька
// договорів» 4868:31197 (no dot, px-12 py-4, Medium 14/22): «Діє»
// #c8e4fe / #00509a in a fixed 69-px pill, «Завершений» #d2d2d2 /
// #545454. «Один договір» 4868:31167 draws the title badge of the same
// «Діє» as the green md pill WITH the dot (#e8f8f4 / #178d72, 60 x 38) -
// both kept as drawn. An upload waits for the manager like a new
// counterparty (amber «На розгляді»).
export type ContractStatus = "active" | "completed" | "review";

export const CONTRACT_STATUS: Record<
  ContractStatus,
  {
    label: string;
    // md pill (with the dot) next to the modal title.
    tone: StatusTone;
    // sm pill on the contract tiles.
    pill: { bg: string; text: string; width?: number };
  }
> = {
  active: { label: "Діє", tone: "green", pill: { bg: "#c8e4fe", text: "#00509a", width: 69 } },
  completed: { label: "Завершений", tone: "neutral", pill: { bg: "#d2d2d2", text: "#545454" } },
  review: { label: "На розгляді", tone: "amber", pill: { bg: "#fff5dd", text: "#805300" } },
};

// --- records ----------------------------------------------------------

export type ContractFile = {
  name: string;
  // Bytes; rendered «0.9 МБ» (the master's dot decimal).
  size: number;
  // «PDF» / «PNG» / «JPG».
  format: string;
};

export type Contract = {
  id: string;
  // «№432-01».
  number: string;
  // ISO date of signing, rendered «19.09.2025».
  date: string;
  status: ContractStatus;
  file: ContractFile;
};

export type Counterparty = {
  id: string;
  // «Юридична назва»: ТОВ “Міротель”.
  name: string;
  // «Підписант».
  signatory: string;
  // «ЄДРПОУ/ІПН»: 8 digits (company) or 10 (sole trader).
  code: string;
  status: CounterpartyStatus;
  contracts: Contract[];
};

export type EmployeeStatus = "active" | "invited";

export type Employee = {
  id: string;
  status: EmployeeStatus;
  // Active: «Марина Левченко» + «Закупівельник»; an invitation only has
  // the e-mail it went to.
  fullName: string;
  position: string;
  // National digits «0671234567», rendered «+380 67 123 4567».
  phone: string;
  email: string;
  // ISO time the invitation was (re)sent; it stays valid 48 hours.
  invitedAt?: string;
};

export type ProfileData = {
  counterparties: Counterparty[];
  employees: Employee[];
  // The company's invitation link token: binar2000.com/invite/<token>.
  inviteToken: string;
};

// --- copy -------------------------------------------------------------

export const COPY = {
  title: "Мій профіль",
  tagline: "Керуйте даними акаунту та інформацією компанії",
  logo: {
    upload: "Завантажити лого",
    // Not in Figma (the master only draws the empty avatar).
    replace: "Замінити лого",
    hint: "PNG,JPG до 5МБ",
    errorType: "Підтримуються лише PNG або JPG",
    errorSize: "Файл більший за 5 МБ",
    errorRead: "Не вдалося прочитати зображення",
  },
  you: {
    title: "Ваші дані",
    role: "Адміністратор",
    fullName: "ПІБ",
    // The fifth field of the Контрагенти frame (4868:30983 / 4929:64221).
    roleField: "Роль",
    position: "Посада",
    phone: "Номер телефону",
    email: "Електронна пошта",
  },
  company: {
    title: "Дані компанії",
    name: "Назва компанії",
    edrpou: "ЄДРПОУ",
    region: "Область",
    city: "Місто",
  },
  security: {
    title: "Безпека",
    login: "Логін",
    password: "Пароль",
    change: "Змінити пароль",
  },
  tabs: {
    counterparties: "Контрагенти",
    employees: "Співробітники",
  },
  counterparties: {
    title: "Контрагенти",
    add: "Додати контрагента",
    heads: ["Юридична назва", "Підписант", "ЄДРПОУ/ІПН", "Статус контрагента", "Договір"],
    emptyTitle: "Контрагентів ще не додано",
    emptyText: "Додайте першого контрагента, щоб він відображався у списку.",
  },
  employees: {
    title: "Співробітники",
    invite: "Запросити співробітника",
    emptyTitle: "Співробітників ще не запрошено",
    emptyText: "Запросіть співробітників, щоб додати їх до списку.",
    active: "Активний",
    invited: "Запрошено",
    resend: "Надіслати повторно",
    edit: "Редагувати",
    remove: "Видалити",
  },
  addCounterparty: {
    title: "Додати контрагента",
    name: "Юридична назва",
    code: "ЄДРПОУ / ІПН",
    signatory: "Підписант",
    contract: "Додати договір",
    submit: "Додати контрагента",
  },
  contracts: {
    // «Договір №432-01» (4868:31172) for a single contract, «Договори»
    // (4868:31202) for several.
    single: "Договір",
    many: "Договори",
    add: "Додати договір",
    download: "Завантажити",
    remove: "Видалити",
    // «Додати договір» 4868:31278 / 4868:31339.
    addTitle: "Додати договір",
    back: "Назад",
  },
  // The dropzone's own text and button label are ui/Dropzone defaults.
  dropzone: {
    hint: "PNG,JPG до 5МБ",
    pending: "Визначаємо номер і дату договору...",
  },
  invite: {
    title: "Запросити співробітника",
    text: "Оберіть спосіб запрошення — надішліть посилання самі або вкажіть email, і ми зробимо це за вас.",
    link: "Посилання-запрошення",
    copy: "Копіювати",
    // Not in Figma: the button's confirmation for two seconds.
    copied: "Скопійовано",
    or: "або надішліть на пошту",
    email: "Електронна пошта",
    submit: "Надіслати на пошту",
  },
} as const;

// --- formatting -------------------------------------------------------

// «19.09.2025».
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

// «0.9 МБ» (the master's dot decimal), «120 КБ» under a tenth of a MB.
export function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 0.1) return `${(Math.round(mb * 10) / 10).toFixed(1)} МБ`;
  return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
}

// «+380 67 123 4567» (employee cards 4262:39221) from the national digits.
export function formatEmployeePhone(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length !== 10 || !d.startsWith("0")) return digits;
  return `+380 ${d.slice(1, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

// «Запрошення дійсне 48 год» (4628:6578): hours left of the 48-hour
// window, rounded (a fresh invitation reads 48), at least 1 while open.
export const INVITE_TTL_HOURS = 48;

export function inviteHoursLeft(invitedAt: string | undefined, now: number): number {
  if (!invitedAt) return 0;
  const sent = new Date(invitedAt).getTime();
  if (Number.isNaN(sent)) return 0;
  const left = sent + INVITE_TTL_HOURS * 3600_000 - now;
  return left <= 0 ? 0 : Math.min(INVITE_TTL_HOURS, Math.max(1, Math.round(left / 3600_000)));
}

export function inviteNote(invitedAt: string | undefined, now: number): string {
  const hours = inviteHoursLeft(invitedAt, now);
  // The expired wording is not in Figma.
  return hours > 0 ? `Запрошення дійсне ${hours} год` : "Термін запрошення минув";
}

export function inviteUrl(token: string): string {
  return `binar2000.com/invite/${token}`;
}

// Extension of an uploaded file, upper-cased the way the tiles print it.
export function fileFormat(name: string, mime: string): string {
  const ext = name.includes(".") ? name.split(".").pop() ?? "" : "";
  if (ext) return ext.toUpperCase() === "JPEG" ? "JPG" : ext.toUpperCase();
  if (mime === "application/pdf") return "PDF";
  if (mime === "image/png") return "PNG";
  return "JPG";
}

// --- validation -------------------------------------------------------

// The contract dropzone takes the contract scan: PDF (what every tile in
// the frames shows) or a PNG / JPG photo, up to 5 MB.
export const CONTRACT_MIME = ["application/pdf", "image/png", "image/jpeg"];
export const CONTRACT_MAX_BYTES = 5 * 1024 * 1024;

export function contractFileError(file: { type: string; size: number }): string | null {
  if (!CONTRACT_MIME.includes(file.type)) return "Підтримуються PDF, PNG або JPG";
  if (file.size > CONTRACT_MAX_BYTES) return "Файл більший за 5 МБ";
  return null;
}

// ЄДРПОУ: 8 digits; ІПН (sole trader): 10 digits.
export function isValidCode(raw: string): boolean {
  return /^(\d{8}|\d{10})$/.test(raw.trim());
}

export function isValidEdrpou(raw: string): boolean {
  return /^\d{8}$/.test(raw.trim());
}

// A Ukrainian number as the national digits «0671234567», or null. The
// raw digit count is checked BEFORE normalising (auth/data phoneDigits
// pads and slices to 10, which turned «123456789» into 0123456789 and
// silently dropped the last digit of an 11-digit entry): an optional
// 38 / 380 prefix, then exactly 0 + operator code 3..9 + 8 digits; nine
// digits without the leading 0 («67 123 4567») get it added.
export function nationalPhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("380")) d = d.slice(2);
  if (d.length === 9 && !d.startsWith("0")) d = `0${d}`;
  return /^0[3-9]\d{8}$/.test(d) ? d : null;
}

export const PHONE_ERROR = "Вкажіть номер у форматі +38 0XX XXX XXXX";
export const EMAIL_EXISTS_ERROR = "Цю адресу вже додано";

// --- ids ----------------------------------------------------------------

export function newId(prefix: string): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rnd}`;
}

// The CRM reads the number and date off the uploaded scan («Визначаємо
// номер і дату договору...»); the mock assigns the next number in the
// «№NNN-YY» pattern of the frames and today's date.
export function mockContractNumber(existing: Contract[], today: Date): string {
  const yy = String(today.getFullYear()).slice(2);
  const n = 100 + ((existing.length * 37 + today.getDate() * 11) % 900);
  return `№${n}-${yy}`;
}

// --- seed ---------------------------------------------------------------

// The demo partner's rows, verbatim from the frames: the table of
// 4868:30958 (texts from the screenshot - the design context returns
// "Cell") and the cards of 4868:31376. «ТОВ “Флексмакс”» has the
// documents glyph and «+ 2», i.e. three contracts - the three tiles of
// «Кілька договорів» 4868:31197 (Діє / Завершений / Діє, files
// dogovir_289-03 / 932-06 / 245-01.pdf; the master repeats «№289-03» on
// every tile, so the numbers here follow the file names and the table's
// «№123-04»). File meta «19.09.2025 · 0.9 МБ · PDF» on every tile.
const pdf = (name: string): ContractFile => ({ name, size: 943_718, format: "PDF" });

export function seedProfile(): ProfileData {
  return {
    counterparties: [
      {
        id: "cp-mirotel",
        name: "ТОВ “Міротель”",
        signatory: "Іваненко С.П",
        code: "412356789",
        status: "active",
        contracts: [
          { id: "ct-432-01", number: "№432-01", date: "2025-09-19", status: "active", file: pdf("dogovir_432-01.pdf") },
        ],
      },
      {
        id: "cp-mirotel-west",
        name: "ТОВ “Міротель Захід”",
        signatory: "Добрій Л.М",
        code: "189977289",
        status: "inactive",
        contracts: [
          { id: "ct-289-03", number: "№289-03", date: "2025-09-19", status: "active", file: pdf("dogovir_289-03.pdf") },
        ],
      },
      {
        id: "cp-flexmax",
        name: "ТОВ “Флексмакс”",
        signatory: "ТОВ “Міротель”",
        code: "412356789",
        status: "active",
        contracts: [
          { id: "ct-123-04", number: "№123-04", date: "2025-09-19", status: "active", file: pdf("dogovir_123-04.pdf") },
          { id: "ct-932-06", number: "№932-06", date: "2025-09-19", status: "completed", file: pdf("dogovir_932-06.pdf") },
          { id: "ct-245-01", number: "№245-01", date: "2025-09-19", status: "active", file: pdf("dogovir_245-01.pdf") },
        ],
      },
    ],
    employees: [
      {
        id: "emp-levchenko",
        status: "active",
        fullName: "Марина Левченко",
        position: "Закупівельник",
        phone: "0671234567",
        email: "sales@binar2000.com",
      },
      {
        id: "emp-invite-sales",
        status: "invited",
        fullName: "",
        position: "",
        phone: "",
        email: "sales@binar2000.com",
        invitedAt: new Date().toISOString(),
      },
      {
        id: "emp-melnyk",
        status: "active",
        fullName: "Наталія Мельник",
        position: "Закупівельник",
        phone: "0671234567",
        email: "sales@binar2000.com",
      },
      {
        id: "emp-bondarenko",
        status: "active",
        fullName: "Ірина Бондаренко",
        position: "Закупівельник",
        phone: "0671234567",
        email: "sales@binar2000.com",
      },
    ],
    inviteToken: "a8f3k2",
  };
}

// Any other partner starts with empty lists (the Empty frames) and a
// token of its own.
export function emptyProfile(): ProfileData {
  return {
    counterparties: [],
    employees: [],
    inviteToken: Math.random().toString(36).slice(2, 8),
  };
}
