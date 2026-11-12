// Formatting shared by every admin screen. Ukrainian locale, Kyiv time.
// Pure functions: usable on the server and in the browser.

const KYIV = "Europe/Kyiv";

const MONEY = new Intl.NumberFormat("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MONEY_WHOLE = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });
const NUMBER = new Intl.NumberFormat("uk-UA");
const DATE = new Intl.DateTimeFormat("uk-UA", { timeZone: KYIV, day: "2-digit", month: "2-digit", year: "numeric" });
const DATE_TIME = new Intl.DateTimeFormat("uk-UA", {
  timeZone: KYIV,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const TIME = new Intl.DateTimeFormat("uk-UA", { timeZone: KYIV, hour: "2-digit", minute: "2-digit" });
const DAY_MONTH = new Intl.DateTimeFormat("uk-UA", { timeZone: KYIV, day: "numeric", month: "short" });
const KYIV_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: KYIV, year: "numeric", month: "2-digit", day: "2-digit" });

type DateLike = string | number | Date | null | undefined;

function toDate(value: DateLike): Date | null {
  if (value === null || value === undefined || value === "") return null;
  // "YYYY-MM-DD" is a business day, not midnight UTC: read it at noon so
  // no time zone can move it to the day before.
  const date =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// "1 234,50 ₴"
export function formatMoney(value: number | null | undefined, options: { whole?: boolean } = {}): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return `${(options.whole ? MONEY_WHOLE : MONEY).format(value)} ₴`;
}

// "1 234"
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return NUMBER.format(value);
}

// "12.11.2026"
export function formatDate(value: DateLike): string {
  const date = toDate(value);
  return date ? DATE.format(date) : "-";
}

// "12.11.2026, 14:05"
export function formatDateTime(value: DateLike): string {
  const date = toDate(value);
  return date ? DATE_TIME.format(date) : "-";
}

// "14:05"
export function formatTime(value: DateLike): string {
  const date = toDate(value);
  return date ? TIME.format(date) : "-";
}

// "12 лист."
export function formatDayMonth(value: DateLike): string {
  const date = toDate(value);
  return date ? DAY_MONTH.format(date) : "-";
}

// "YYYY-MM-DD" in Kyiv (the value of a date input).
export function kyivDay(value: DateLike = new Date()): string {
  const date = toDate(value);
  return date ? KYIV_DAY.format(date) : "";
}

// "щойно", "5 хв тому", "3 год тому", "вчора", then the date. `now` is a
// parameter so a component can pass a ticking clock.
export function formatRelative(value: DateLike, now: number = Date.now()): string {
  const date = toDate(value);
  if (!date) return "-";
  const seconds = Math.round((now - date.getTime()) / 1000);
  if (seconds < 45) return "щойно";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} хв тому`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} год тому`;
  const days = Math.round(hours / 24);
  if (days === 1) return "вчора";
  if (days < 7) return `${days} дн. тому`;
  return formatDate(date);
}

// Ukrainian plural: plural(3, ["товар", "товари", "товарів"]) -> "товари".
export function plural(count: number, forms: readonly [string, string, string]): string {
  const n = Math.abs(count) % 100;
  const last = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

// "3 товари"
export function countOf(count: number, forms: readonly [string, string, string]): string {
  return `${formatNumber(count)} ${plural(count, forms)}`;
}

// "0671234567" -> "+380 67 123 45 67"; anything else is returned as typed.
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "-";
  const digits = value.replace(/\D/g, "");
  const national = digits.length === 12 && digits.startsWith("380") ? digits.slice(2) : digits;
  if (national.length !== 10 || !national.startsWith("0")) return value;
  return `+380 ${national.slice(1, 3)} ${national.slice(3, 6)} ${national.slice(6, 8)} ${national.slice(8)}`;
}

// "1,4 МБ"
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return "-";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} МБ`;
}

// Two letters for an avatar: "Олена Коваль" -> "ОК".
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : (parts[0][1] ?? "");
  return `${first}${second}`.toUpperCase();
}

// Builds a query string from a record, skipping empty values:
// qs({ page: 2, q: "", status: ["new", "shipped"] }) -> "page=2&status=new&status=shipped".
export function qs(values: Record<string, string | number | boolean | null | undefined | readonly string[]>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === "" || value === false) continue;
    if (Array.isArray(value)) for (const item of value) params.append(key, item);
    else params.set(key, String(value));
  }
  return params.toString();
}

// Joins class names, skipping the falsy ones.
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

// A URL-friendly slug of a Ukrainian or Latin title:
// "Як обрати тапочки для готелю?" -> "yak-obraty-tapochky-dlya-hotelyu".
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ye", ж: "zh", з: "z", и: "y", і: "i", ї: "yi",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh",
  ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "", ю: "yu", я: "ya", ё: "yo", ы: "y", э: "e", ъ: "",
};

// Apostrophes of every kind (straight, typographic, modifier letter,
// backtick) vanish instead of becoming a hyphen: "зв'язок" -> "zvyazok".
const APOSTROPHES = new RegExp(`[${String.fromCharCode(0x27, 0x2019, 0x2bc, 0x60)}]`, "g");

export function slugify(text: string, maxLength = 60): string {
  const lower = text.trim().toLowerCase();
  let out = "";
  for (const char of lower) out += TRANSLIT[char] ?? char;
  return out
    .replace(APOSTROPHES, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}
