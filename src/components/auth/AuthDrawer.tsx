"use client";
/* eslint-disable @next/next/no-img-element */
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/Button";
import { XMarkIcon } from "@/components/catalog/icons";
import { AutocompleteField, SelectField, TextField } from "@/components/checkout/fields";
import { CITIES } from "@/components/checkout/data";
import { useModalBehavior } from "@/components/cart/useModalBehavior";
import * as api from "./api";
import { useAuth } from "./AuthProvider";
import { CodeInput } from "./CodeInput";
import {
  CODE_LENGTH,
  CODE_TTL_SECONDS,
  EMPTY_COMPANY,
  EMPTY_PERSON,
  REGIONS,
  ROLES,
  formatPhone,
  formatPhoneShort,
  formatTimer,
  isValidEdrpou,
  isValidEmail,
  isValidPhone,
  passwordError,
  phoneDigits,
  required,
  roleLabel,
  type Account,
  type CompanyData,
  type PersonData,
} from "./data";
import { DotIcon } from "./icons";

// The account drawer — Figma «Sign up» (4573:35476, five states) and
// «Sign in» (4573:35563, two states): a 576-px sheet hanging from the
// sticky header at the right edge (rounded-tl-48, 1-px #8e8e8f ring)
// over the blurred #343435/50 scrim, pt-60 pl-60 pr-80 pb-40 with the
// ring inside the gutters, 40-px rhythm between the title block, the
// fields and the button row. Screens:
//   phone     «Вхід до особистого кабінету» + phone         (Sign up 01)
//   code      four-box SMS code + resend countdown          (Sign up 02)
//   password  «Реєстрація 1/3» login (locked) + password x2 (Variant3)
//   company   «Реєстрація 2/3» company data                 (Variant4)
//   person    «Реєстрація 3/3» contact data                 (Variant5)
//   signin    login + password + «Забули пароль?»           (Sign in 01)
//   recover   «Відновлення паролю» login                    (Variant2)
//   account   the signed-in summary + «Вийти» (no master yet; the
//             profile pages are only designed for the CRM admin)
// The code and password screens are shared by registration and
// password recovery (`mode`).
type Screen =
  | "phone"
  | "code"
  | "password"
  | "company"
  | "person"
  | "signin"
  | "recover"
  | "account";
type Mode = "register" | "recover";

const DRAWER_STYLE = { "--field-surface": "#fff" } as CSSProperties;

function TitleBlock({
  title,
  step,
  subtitle,
}: {
  title: string;
  step?: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-4 pb-4 pt-1">
        <h2 className="flex-1 text-[24px] font-bold leading-7 tracking-[-0.48px] text-neutral-900">
          {title}
        </h2>
        {step && (
          <span className="shrink-0 text-[24px] font-bold leading-7 tracking-[-0.48px] text-neutral-900">
            {step}
          </span>
        )}
      </div>
      <p className="text-body-sm text-neutral-500">{subtitle}</p>
    </div>
  );
}

// «Дані компанії» / «Ваші дані» — Title/Small 18/24 ExtraBold #343435.
function GroupTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="pb-4 pt-1 text-[18px] font-extrabold leading-6 tracking-[-0.36px] text-neutral-800">
      {children}
    </h3>
  );
}

function Screens({ initial }: { initial: Screen }) {
  const { user, closeAuth, signOut, finishRegistration } = useAuth();
  const [screen, setScreen] = useState<Screen>(initial);
  const [mode, setMode] = useState<Mode>("register");
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // Phone / login
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string>();
  const [login, setLogin] = useState("");
  const [loginError, setLoginError] = useState<string>();
  const [signinPassword, setSigninPassword] = useState("");
  const [signinError, setSigninError] = useState<string>();

  // SMS code + countdown
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string>();
  const [expiresAt, setExpiresAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // Registration draft
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<{ a?: string; b?: string }>({});
  const [company, setCompany] = useState<CompanyData>(EMPTY_COMPANY);
  const [companyErrors, setCompanyErrors] = useState<Partial<Record<keyof CompanyData, string>>>({});
  const [person, setPerson] = useState<PersonData>(EMPTY_PERSON);
  const [personErrors, setPersonErrors] = useState<Partial<Record<keyof PersonData, string>>>({});

  // Focus follows the screen: the first enabled control of every new
  // screen (after the dialog plumbing has placed focus on the panel).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      bodyRef.current
        ?.querySelector<HTMLElement>("input:not([disabled]), button[data-autofocus]")
        ?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [screen]);

  // The «2:51» countdown ticks while the code screen is showing.
  useEffect(() => {
    if (screen !== "code") return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [screen]);
  const secondsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));

  const goToCode = async (nextMode: Mode) => {
    await api.sendCode(phone);
    setMode(nextMode);
    setCode("");
    setCodeError(undefined);
    setExpiresAt(Date.now() + CODE_TTL_SECONDS * 1000);
    setNow(Date.now());
    setScreen("code");
  };

  // --- phone (Sign up 01) --------------------------------------------
  const submitPhone = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!phone.trim()) return setPhoneError("Введіть номер телефону");
    if (!isValidPhone(phone)) return setPhoneError("Невірний формат номера");
    setPhoneError(undefined);
    setBusy(true);
    try {
      const found = await api.lookupPhone(phone);
      if (found === "registered") {
        // Already on the site: the login is the phone, only the password
        // is missing.
        setLogin(phoneDigits(phone));
        setSigninPassword("");
        setSigninError(undefined);
        setScreen("signin");
      } else {
        await goToCode("register");
      }
    } finally {
      setBusy(false);
    }
  };

  // --- code (Sign up 02) --------------------------------------------
  const submitCode = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (code.length < CODE_LENGTH) return setCodeError(`Введіть ${CODE_LENGTH} цифри коду`);
    if (secondsLeft === 0) return setCodeError("Час дії коду минув, надішліть новий");
    setBusy(true);
    try {
      const ok = await api.verifyCode(phone, code);
      if (!ok) return setCodeError("Невірний код, спробуйте ще раз");
      setCodeError(undefined);
      setPassword("");
      setPassword2("");
      setPasswordErrors({});
      setScreen("password");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await goToCode(mode);
    } finally {
      setBusy(false);
    }
  };

  // --- password (Реєстрація 1/3 / new password) ----------------------
  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const a = passwordError(password);
    const b = !password2 ? "Повторіть пароль" : password2 !== password ? "Паролі не збігаються" : undefined;
    setPasswordErrors({ a, b });
    if (a || b) return;
    if (mode === "recover") {
      setBusy(true);
      try {
        const account = await api.resetPassword(phone, password);
        if (!account) return setPasswordErrors({ a: "Акаунт не знайдено" });
        closeAuth();
      } finally {
        setBusy(false);
      }
      return;
    }
    setScreen("company");
  };

  // --- company (Реєстрація 2/3) -------------------------------------
  const submitCompany = (e: FormEvent) => {
    e.preventDefault();
    const errors: typeof companyErrors = {
      name: required(company.name, "Введіть назву компанії"),
      edrpou: !company.edrpou.trim()
        ? "Введіть ЄДРПОУ"
        : !isValidEdrpou(company.edrpou)
          ? "ЄДРПОУ складається з 8 цифр"
          : undefined,
      region: required(company.region, "Оберіть область"),
      city: required(company.city, "Вкажіть місто"),
    };
    setCompanyErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    if (!person.phone) setPerson((p) => ({ ...p, phone: formatPhone(phone) }));
    setScreen("person");
  };

  // --- person (Реєстрація 3/3) ---------------------------------------
  const submitPerson = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const errors: typeof personErrors = {
      fullName: required(person.fullName, "Введіть ПІБ"),
      role: required(person.role, "Оберіть роль"),
      position: required(person.position, "Введіть посаду"),
      phone: !person.phone.trim()
        ? "Введіть номер телефону"
        : !isValidPhone(person.phone)
          ? "Невірний формат номера"
          : undefined,
      email: !person.email.trim()
        ? "Введіть електронну пошту"
        : !isValidEmail(person.email)
          ? "Невірний формат пошти"
          : undefined,
    };
    setPersonErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    setBusy(true);
    try {
      await api.register({
        phone,
        password,
        company: {
          ...company,
          name: company.name.trim(),
          edrpou: company.edrpou.trim(),
          city: company.city.trim(),
        },
        person: {
          ...person,
          fullName: person.fullName.trim(),
          position: person.position.trim(),
          phone: phoneDigits(person.phone),
          email: person.email.trim(),
        },
      });
      finishRegistration();
    } finally {
      setBusy(false);
    }
  };

  // --- signin (Sign in 01) -------------------------------------------
  const submitSignin = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const lErr = required(login, "Введіть логін");
    const pErr = required(signinPassword, "Введіть пароль");
    setLoginError(lErr);
    setSigninError(pErr);
    if (lErr || pErr) return;
    setBusy(true);
    try {
      const account = await api.signIn(login, signinPassword);
      if (!account) return setSigninError("Невірний логін або пароль");
      closeAuth();
    } finally {
      setBusy(false);
    }
  };

  // --- recover (Sign in Variant2) ------------------------------------
  const submitRecover = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const lErr = required(login, "Введіть логін");
    setLoginError(lErr);
    if (lErr) return;
    setBusy(true);
    try {
      const found = await api.findAccount(login);
      if (!found) return setLoginError("Акаунт із таким логіном не знайдено");
      setPhone(phoneDigits(login) || login.trim());
      await goToCode("recover");
    } finally {
      setBusy(false);
    }
  };

  const codeTarget = isValidPhone(phone)
    ? `номер [${formatPhoneShort(phone)}]`
    : `пошту [${phone}]`;

  return (
    <div ref={bodyRef} className="flex flex-col gap-6 lg:gap-10">
      {screen === "phone" && (
        <form onSubmit={submitPhone} noValidate className="flex flex-col gap-6 lg:gap-10">
          <TitleBlock
            title="Вхід до особистого кабінету"
            subtitle="Для авторизації введіть номер телефону"
          />
          <TextField
            label="Номер телефону"
            value={phone}
            onChange={(v) => {
              setPhone(formatPhone(v));
              if (phoneError) setPhoneError(undefined);
            }}
            error={phoneError}
            type="tel"
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            helperZone
          />
          <div className="flex justify-end">
            <Button type="submit" size="small" disabled={busy}>
              Увійти
            </Button>
          </div>
        </form>
      )}

      {screen === "code" && (
        <form onSubmit={submitCode} noValidate className="flex flex-col gap-6 lg:gap-10">
          <TitleBlock
            title={mode === "recover" ? "Відновлення паролю" : "Вхід до особистого кабінету"}
            subtitle={`Введіть код, який ми надіслали на ${codeTarget}`}
          />
          <div className="flex flex-col gap-2">
            <CodeInput
              value={code}
              onChange={(v) => {
                setCode(v);
                if (codeError) setCodeError(undefined);
              }}
              error={codeError}
              disabled={busy}
            />
            <div className="flex items-center gap-2 text-body-sm text-neutral-500">
              {secondsLeft > 0 ? (
                <>
                  <span>Надіслати код ще раз</span>
                  <DotIcon className="size-2 shrink-0 text-[#626770]" />
                  <span aria-live="off">{formatTimer(secondsLeft)}</span>
                </>
              ) : (
                <button
                  type="button"
                  onClick={resend}
                  disabled={busy}
                  className="cursor-pointer text-neutral-900 underline transition-colors duration-200 hover:text-brand disabled:opacity-50"
                >
                  Надіслати код ще раз
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="small" disabled={busy}>
              Підтвердити
            </Button>
          </div>
        </form>
      )}

      {screen === "password" && (
        <form onSubmit={submitPassword} noValidate className="flex flex-col gap-6 lg:gap-10">
          {mode === "register" ? (
            <TitleBlock
              title="Реєстрація"
              step="1/3"
              subtitle="Створіть пароль для входу в кабінет"
            />
          ) : (
            <TitleBlock title="Новий пароль" subtitle="Створіть новий пароль для входу" />
          )}
          <div className="flex flex-col gap-2">
            <TextField label="Логін" value={phoneDigits(phone) || phone} onChange={() => {}} disabled helperZone />
            <TextField
              label="Пароль"
              value={password}
              onChange={(v) => {
                setPassword(v);
                if (passwordErrors.a) setPasswordErrors((p) => ({ ...p, a: undefined }));
              }}
              error={passwordErrors.a}
              type="password"
              name="new-password"
              autoComplete="new-password"
              helperZone
            />
            <TextField
              label="Повторіть пароль"
              value={password2}
              onChange={(v) => {
                setPassword2(v);
                if (passwordErrors.b) setPasswordErrors((p) => ({ ...p, b: undefined }));
              }}
              error={passwordErrors.b}
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              helperZone
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="small" disabled={busy}>
              {mode === "register" ? "Дальше" : "Зберегти"}
            </Button>
          </div>
        </form>
      )}

      {screen === "company" && (
        <form onSubmit={submitCompany} noValidate className="flex flex-col gap-6 lg:gap-10">
          <TitleBlock title="Реєстрація" step="2/3" subtitle="Вкажіть дані вашої компанії" />
          <div className="flex flex-col">
            <GroupTitle>Дані компанії</GroupTitle>
            <div className="flex flex-col gap-2">
              <TextField
                label="Назва компанії"
                value={company.name}
                onChange={(v) => {
                  setCompany((c) => ({ ...c, name: v }));
                  if (companyErrors.name) setCompanyErrors((p) => ({ ...p, name: undefined }));
                }}
                error={companyErrors.name}
                name="organization"
                autoComplete="organization"
                helperZone
              />
              <TextField
                label="ЄДРПОУ"
                value={company.edrpou}
                onChange={(v) => {
                  setCompany((c) => ({ ...c, edrpou: v.replace(/\D/g, "").slice(0, 8) }));
                  if (companyErrors.edrpou) setCompanyErrors((p) => ({ ...p, edrpou: undefined }));
                }}
                error={companyErrors.edrpou}
                name="edrpou"
                inputMode="numeric"
                maxLength={8}
                helperZone
              />
              <SelectField
                label="Область"
                value={company.region}
                options={REGIONS}
                onChange={(v) => {
                  setCompany((c) => ({ ...c, region: v }));
                  if (companyErrors.region) setCompanyErrors((p) => ({ ...p, region: undefined }));
                }}
                error={companyErrors.region}
                name="region"
                helperZone
              />
              <AutocompleteField
                label="Місто"
                value={company.city}
                options={CITIES}
                onChange={(v) => {
                  setCompany((c) => ({ ...c, city: v }));
                  if (companyErrors.city) setCompanyErrors((p) => ({ ...p, city: undefined }));
                }}
                error={companyErrors.city}
                name="city"
                autoComplete="address-level2"
                helperZone
              />
            </div>
          </div>
          <div className="flex items-start justify-between gap-4">
            <Button
              type="button"
              size="small"
              variant="outlinedDark"
              onClick={() => setScreen("password")}
            >
              Назад
            </Button>
            <Button type="submit" size="small">
              Дальше
            </Button>
          </div>
        </form>
      )}

      {screen === "person" && (
        <form onSubmit={submitPerson} noValidate className="flex flex-col gap-6 lg:gap-10">
          <TitleBlock title="Реєстрація" step="3/3" subtitle="Вкажіть ваші контактні дані" />
          <div className="flex flex-col">
            <GroupTitle>Ваші дані</GroupTitle>
            <div className="flex flex-col gap-2">
              <TextField
                label="ПІБ"
                value={person.fullName}
                onChange={(v) => {
                  setPerson((p) => ({ ...p, fullName: v }));
                  if (personErrors.fullName) setPersonErrors((p) => ({ ...p, fullName: undefined }));
                }}
                error={personErrors.fullName}
                name="name"
                autoComplete="name"
                helperZone
              />
              <SelectField
                label="Роль"
                value={person.role}
                options={ROLES}
                onChange={(v) => {
                  setPerson((p) => ({ ...p, role: v }));
                  if (personErrors.role) setPersonErrors((p) => ({ ...p, role: undefined }));
                }}
                error={personErrors.role}
                name="role"
                helperZone
              />
              <TextField
                label="Посада"
                value={person.position}
                onChange={(v) => {
                  setPerson((p) => ({ ...p, position: v }));
                  if (personErrors.position) setPersonErrors((p) => ({ ...p, position: undefined }));
                }}
                error={personErrors.position}
                name="organization-title"
                autoComplete="organization-title"
                helperZone
              />
              <TextField
                label="Номер телефону"
                value={person.phone}
                onChange={(v) => {
                  setPerson((p) => ({ ...p, phone: formatPhone(v) }));
                  if (personErrors.phone) setPersonErrors((p) => ({ ...p, phone: undefined }));
                }}
                error={personErrors.phone}
                type="tel"
                name="contact-phone"
                inputMode="tel"
                autoComplete="tel"
                helperZone
              />
              <TextField
                label="Електронна пошта"
                value={person.email}
                onChange={(v) => {
                  setPerson((p) => ({ ...p, email: v }));
                  if (personErrors.email) setPersonErrors((p) => ({ ...p, email: undefined }));
                }}
                error={personErrors.email}
                type="email"
                name="email"
                inputMode="email"
                autoComplete="email"
                helperZone
              />
            </div>
          </div>
          <div className="flex items-start justify-between gap-4">
            <Button
              type="button"
              size="small"
              variant="outlinedDark"
              onClick={() => setScreen("company")}
              disabled={busy}
            >
              Назад
            </Button>
            <Button type="submit" size="small" disabled={busy}>
              Зареєструватись
            </Button>
          </div>
        </form>
      )}

      {screen === "signin" && (
        <form onSubmit={submitSignin} noValidate className="flex flex-col gap-6 lg:gap-10">
          <TitleBlock
            title="Вхід до особистого кабінету"
            subtitle="Для авторизації введіть логін та пароль"
          />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <TextField
                label="Логін"
                value={login}
                onChange={(v) => {
                  setLogin(v);
                  if (loginError) setLoginError(undefined);
                }}
                error={loginError}
                name="username"
                autoComplete="username"
                helperZone
              />
              <TextField
                label="Пароль"
                value={signinPassword}
                onChange={(v) => {
                  setSigninPassword(v);
                  if (signinError) setSigninError(undefined);
                }}
                error={signinError}
                type="password"
                name="current-password"
                autoComplete="current-password"
                helperZone
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setLoginError(undefined);
                setScreen("recover");
              }}
              className="cursor-pointer self-end text-[14px] font-medium leading-[22px] text-neutral-800 underline transition-colors duration-200 hover:text-brand"
            >
              Забули пароль?
            </button>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="small" disabled={busy}>
              Увійти
            </Button>
          </div>
        </form>
      )}

      {screen === "recover" && (
        <form onSubmit={submitRecover} noValidate className="flex flex-col gap-6 lg:gap-10">
          <TitleBlock title="Відновлення паролю" subtitle="Для відновлення паролю введіть логін" />
          <TextField
            label="Логін"
            value={login}
            onChange={(v) => {
              setLogin(v);
              if (loginError) setLoginError(undefined);
            }}
            error={loginError}
            name="username"
            autoComplete="username"
            helperZone
          />
          <div className="flex items-start justify-between gap-4">
            <Button
              type="button"
              size="small"
              variant="outlinedDark"
              onClick={() => {
                setLoginError(undefined);
                setScreen("signin");
              }}
              disabled={busy}
            >
              Назад
            </Button>
            <Button type="submit" size="small" disabled={busy}>
              Надіслати код
            </Button>
          </div>
        </form>
      )}

      {screen === "account" && user && <AccountScreen user={user} onSignOut={signOut} />}
    </div>
  );
}

// Signed-in summary. The site has no profile master yet (the account
// pages in Figma are the CRM admin's), so this reads the registration
// back in the drawer's own typography and offers «Вийти». A B2C
// customer has no company, so only the contact rows show.
function AccountScreen({ user, onSignOut }: { user: Account; onSignOut: () => void }) {
  const companyRows: [string, string][] =
    user.type === "b2b"
      ? [
          ["Компанія", user.company.name],
          ["ЄДРПОУ", user.company.edrpou],
          ["Регіон", [REGIONS.find((r) => r.value === user.company.region)?.label, user.company.city].filter(Boolean).join(", ")],
          ["Роль", `${roleLabel(user.person.role)}${user.person.position ? `, ${user.person.position}` : ""}`],
        ]
      : [];
  const rows: [string, string][] = [
    ...companyRows,
    ["Телефон", formatPhone(user.person.phone || user.phone)],
    ["Електронна пошта", user.person.email],
  ];
  return (
    <div className="flex flex-col gap-6 lg:gap-10">
      <TitleBlock title="Особистий кабінет" subtitle={`Ви увійшли як ${user.person.fullName}`} />
      <div className="flex flex-col gap-4 rounded-3xl bg-bg-subtle p-6">
        {user.logo && (
          <img
            src={user.logo}
            alt="Лого компанії"
            className="size-16 rounded-xl object-cover"
          />
        )}
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-[14px] leading-6 text-neutral-500">{label}</span>
            <span className="text-body-sm font-medium text-neutral-900">{value || "—"}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="button" size="small" variant="outlinedDark" onClick={onSignOut} data-autofocus>
          Вийти
        </Button>
      </div>
    </div>
  );
}

export function AuthDrawer() {
  const { open, openCount, entry, user, hasAccounts, closeAuth } = useAuth();
  const asideRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useModalBehavior({
    open,
    onClose: closeAuth,
    container: asideRef,
    initial: closeRef,
    inertSelector: "body > header",
  });

  // Entry screen: the signed-in summary for an account, «Sign in» when
  // the device already holds an account, the phone screen otherwise.
  const initial: Screen =
    entry === "account" || user ? "account" : hasAccounts ? "signin" : "phone";

  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`}
    >
      <div
        aria-hidden
        onClick={closeAuth}
        className={`absolute inset-0 bg-[#343435]/50 backdrop-blur-[4px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        ref={asideRef}
        role="dialog"
        aria-modal="true"
        aria-label={user ? "Особистий кабінет" : "Вхід до особистого кабінету"}
        tabIndex={-1}
        style={{ top: "var(--site-header-h, 92px)", ...DRAWER_STYLE }}
        className={`scrollbar-hidden absolute bottom-0 right-0 flex w-[576px] max-w-[92vw] flex-col overflow-y-auto overscroll-contain rounded-tl-[32px] border border-stroke-default bg-white px-6 pb-6 pt-14 transition-[translate] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[translate] lg:rounded-tl-[48px] lg:pb-[39px] lg:pl-[59px] lg:pr-[79px] lg:pt-[59px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={closeAuth}
          aria-label="Закрити"
          className="absolute right-4 top-4 z-[1] flex size-8 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 hover:text-brand lg:right-6 lg:top-6"
        >
          <XMarkIcon className="size-8" />
        </button>
        {/* Remounts on every open so each visit starts at the entry
            screen with empty fields. */}
        <Screens key={openCount} initial={initial} />
      </aside>
    </div>
  );
}
