// Account area of the site - Figma «Authorisation NEW» 5420:38169 (the
// 576 x 930 drawer under the header, three flows: Sign in, Forgot
// password -> link sent -> set new password, Sign up) and the
// first-login «Вітаємо на платформі» modal. Everything the screens share
// lives here: the record shapes, the copy taken from the Figma text
// layers, and the validators / formatters.

export const AUTH_STORAGE_KEY = "binar.auth.v1";

// «Ви зможете отримати посилання ще раз через 0:59.» (5420:38217): the
// reset link can be requested again after a minute; the countdown shows
// 0:59 ... 0:00, then the «send again» state (5420:38222) takes over.
export const RESET_RESEND_SECONDS = 60;

// The e-mailed reset link is mocked: «Відновити пароль» records a pending
// reset for the login, and `/?reset=demo` opens the drawer on «Створіть
// новий пароль» (5420:38207) for it.
export const DEMO_RESET_TOKEN = "demo";
export const RESET_QUERY_PARAM = "reset";

// «Мій профіль» of a partner (the B2B cabinet page); retail customers
// have no profile page, their summary stays in the drawer.
export const PROFILE_HREF = "/profile";

// «Dashboard :: Admin» (5052:32106): where a partner lands after the
// header «Увійти» and where a signed-in partner's «Кабінет» leads. The
// designer (2026-11-13, C27): no account-summary drawer for partners,
// «після кнопки увійти діректимо на Дашборд».
export const DASHBOARD_HREF = "/dashboard";

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

// "b2b" = a business partner: signed in, the catalog, product and order
// pages switch to the platform shell. "b2c" = a retail customer: the
// public shop stays, only the header pill and the account screen change.
// The site sign-up (5420:38224) creates retail customers; partner
// accounts come from the CRM (the demo partner in demo.ts stands in).
export type AccountType = "b2b" | "b2c";

// One account. `login` is what the person signs in with: the national
// phone digits («0500000001») or the lower-cased e-mail.
export type Account = {
  id: string;
  type: AccountType;
  phone: string;
  login: string;
  passwordHash: string;
  company: CompanyData;
  person: PersonData;
  createdAt: string;
  // The «Вітаємо на платформі» modal shows once, after the first login.
  welcomed: boolean;
  logo?: string;
};

// A requested password reset waiting for its link to be opened.
export type PendingReset = {
  token: string;
  login: string;
};

export type AuthState = {
  accounts: Account[];
  sessionId: string | null;
  reset?: PendingReset | null;
};

export const EMPTY_STATE: AuthState = { accounts: [], sessionId: null };

export const EMPTY_COMPANY: CompanyData = { name: "", edrpou: "", region: "", city: "" };

// Region labels (the partner profile forms, the admin's new customer).
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

// --- copy ------------------------------------------------------------
// Verbatim from the Figma text layers unless marked (NEEDED.md lists the
// strings whose layers were not fetched).

export const COPY = {
  signin: {
    // Designer typo «осбистого» kept verbatim (5420:38175).
    title: "Вхід до осбистого кабінету",
    subtitle: "Для авторизації введіть електронну пошту або номер телефону та пароль.",
    forgot: "Забули пароль?",
    submit: "Увійти",
    google: "Увійти з Google",
    prompt: "Ще не зареєстровані?",
    promptAction: "Зареєструватись",
    // Alert «Платіж» 436 x 128 (5420:38195).
    invalid:
      "Неправильна електронна пошта, телефон або пароль. Перевірте введені дані та спробуйте ще раз. Якщо не вдається увійти, зверніться до служби підтримки.",
  },
  forgot: {
    title: "Відновлення паролю",
    subtitle: "Для відновлення паролю введіть логін.",
    submit: "Відновити пароль",
  },
  linkSent: {
    // 5420:38217 breaks the title after «відновлення».
    titleTimer: ["Посилання для відновлення", "паролю надіслано"],
    titleAgain: "Посилання надіслано",
    body: "Перевірте вказану електронну пошту чи телефон та скористайтеся підказками в повідомленні для відновлення паролю.",
    timer: "Ви зможете отримати посилання ще раз через",
    back: "Повернутися до входу",
    // «Send again» variant 5410:64943 (ctx 5420-38222).
    again: "Отримати посилання ще раз",
  },
  setPassword: {
    title: "Створіть новий пароль",
    subtitle: "Для відновлення доступу до вашого акаунту, створіть новий пароль.",
    submit: "Зберегти пароль",
  },
  signup: {
    title: "Реєстрація",
    subtitle: "Для реєстрації заповніть форму.",
    loginHelper: "Це буде ваш логін для входу у систему.",
    submit: "Зареєструватись",
    google: "Зареєструватись з Google",
    prompt: "Вже маєте акаунт?",
    promptAction: "Увійти",
  },
  labels: {
    login: "Електронна пошта або телефон",
    // The sign-in login label of «Error :: user didn't enter data»
    // (5420:38180, I5420:38180;5254:85676;4130:38451); the default and
    // filled frames (5420:38175 / 5420:38195) keep the short one.
    loginError: "Електронна пошта або номер телефону",
    password: "Пароль",
    repeat: "Повторіть пароль",
    // U+02BC as in the layer «Імʼя».
    firstName: "Імʼя",
    lastName: "Прізвище",
  },
  // Alert «Платіж» 436 x 80 (5410:60769): sign-up «invalid data or
  // account for this phone / email already exists», reused for a dead
  // reset link.
  requestFailed:
    "Не вдалося обробити запит. Спробуйте ще раз або зверніться до служби підтримки.",
  // Field messages (one line = a 65-px field, two lines = 81).
  errors: {
    // «Error :: user didn't enter data» 5420:38180.
    signinLogin: "Введіть дані, щоб увійти",
    signinPassword: "Введіть пароль, щоб увійти",
    // «Error :: passwords don't match» 5420:38248 (the repeat field; the
    // first password field turns red without a message).
    mismatch: "Паролі не збігаються. Переконайтеся, що обидва поля заповнені однаково.",
    // No frame draws these (NEEDED.md): written in the same voice.
    login: "Введіть електронну пошту або номер телефону",
    loginFormat: "Вкажіть коректну електронну пошту або номер телефону",
    password: "Введіть пароль",
    passwordShort: "Пароль має містити щонайменше 8 символів",
    repeat: "Повторіть пароль",
    firstName: "Введіть імʼя",
    lastName: "Введіть прізвище",
  },
  google: "Незабаром",
  // The retail customer's signed-in summary (no master; kept from the
  // first build). Partners never see it: they go to the dashboard and
  // sign out from the cabinet header menu (designer, 2026-11-13).
  account: {
    title: "Особистий кабінет",
    signedInAs: "Ви увійшли як",
    signOut: "Вийти",
    phone: "Телефон",
    email: "Електронна пошта",
  },
  // Phone sheet bar (auth spec 2.1, DECISIONS D7 / O-12): one title line,
  // so the two titles wider than 228 px at 320 show a short form below
  // 375; the crosses carry specific names.
  sheet: {
    signinShort: "Вхід",
    setPasswordShort: "Новий пароль",
    close: "Закрити вікно входу",
    closeAccount: "Закрити особистий кабінет",
  },
} as const;

// The dialog's accessible name per screen (auth spec 2.1, F15). The full
// names, spelled correctly; the visible sign-in title keeps the Figma
// spelling (DECISIONS O-5).
export const DIALOG_LABEL = {
  signin: "Вхід до особистого кабінету",
  forgot: "Відновлення паролю",
  linkSent: "Відновлення паролю",
  setPassword: "Створіть новий пароль",
  signup: "Реєстрація",
  account: "Особистий кабінет",
} as const;

// --- phone / login -----------------------------------------------------

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

// «+38 063 567 8793».
export function formatPhone(raw: string): string {
  const d = phoneDigits(raw);
  if (!d) return "";
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean);
  return `+38 ${parts.join(" ")}`;
}

export function isValidPhone(raw: string): boolean {
  const d = phoneDigits(raw);
  return d.length === 10 && /^0[3-9]\d{8}$/.test(d);
}

// The rule of /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/ on the trimmed value, written
// as linear scans: that regex backtracks quadratically on a long string such
// as "a@" + "." * 60000 + "@", and the server runs this check on request
// bodies. No whitespace, exactly one "@" with something before it, and a "."
// in the domain part that has at least one character before it and two
// after it.
export function isValidEmail(raw: string): boolean {
  const s = raw.trim();
  if (/\s/.test(s)) return false;
  const at = s.indexOf("@");
  if (at < 1 || at !== s.lastIndexOf("@")) return false;
  const domain = s.slice(at + 1);
  const dot = domain.indexOf(".", 1);
  return dot !== -1 && dot <= domain.length - 3;
}

export function isEmailLike(raw: string): boolean {
  return raw.includes("@");
}

// The one key a login is stored and looked up under: the lower-cased
// e-mail, or the phone digits (an e-mail with digits in it must not be
// read as a phone number).
export function normalizeLogin(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (isEmailLike(trimmed)) return trimmed.toLowerCase();
  return phoneDigits(trimmed) || trimmed.toLowerCase();
}

export function isValidLogin(raw: string): boolean {
  return isEmailLike(raw) ? isValidEmail(raw) : isValidPhone(raw);
}

// --- forms -------------------------------------------------------------

export const PASSWORD_MIN = 8;

export type SignInFields = { login: string; password: string };
export type SignUpFields = {
  firstName: string;
  lastName: string;
  login: string;
  password: string;
  repeat: string;
};
export type SetPasswordFields = { password: string; repeat: string };

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function hasErrors<T>(errors: FieldErrors<T>): boolean {
  return Object.values(errors).some(Boolean);
}

// «Error :: user didn't enter data» (5420:38176): both fields red.
export function validateSignIn(f: SignInFields): FieldErrors<SignInFields> {
  return {
    login: f.login.trim() ? undefined : COPY.errors.signinLogin,
    password: f.password ? undefined : COPY.errors.signinPassword,
  };
}

function passwordPair(password: string, repeat: string) {
  return {
    password: !password
      ? COPY.errors.password
      : password.length < PASSWORD_MIN
        ? COPY.errors.passwordShort
        : undefined,
    // «Error :: passwords don't match» (5420:38244): the 5th field.
    repeat: !repeat ? COPY.errors.repeat : repeat !== password ? COPY.errors.mismatch : undefined,
  };
}

export function validateSignUp(f: SignUpFields): FieldErrors<SignUpFields> {
  return {
    firstName: f.firstName.trim() ? undefined : COPY.errors.firstName,
    lastName: f.lastName.trim() ? undefined : COPY.errors.lastName,
    login: !f.login.trim()
      ? COPY.errors.login
      : isValidLogin(f.login)
        ? undefined
        : COPY.errors.loginFormat,
    ...passwordPair(f.password, f.repeat),
  };
}

export function validateSetPassword(f: SetPasswordFields): FieldErrors<SetPasswordFields> {
  return passwordPair(f.password, f.repeat);
}

// «Паролі не збігаються» paints BOTH password fields red (5420:38248).
export function isMismatch(errors: { repeat?: string }): boolean {
  return errors.repeat === COPY.errors.mismatch;
}

// «0:59».
export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
