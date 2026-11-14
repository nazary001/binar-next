"use client";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Button } from "@/components/ui/Button";
import { SheetBar } from "@/components/ui/Sheet";
import { DESKTOP_QUERY, usePhone } from "@/components/ui/useMediaQuery";
import { TextField } from "@/components/checkout/fields";
import { useFitZoom } from "@/components/cart/useFitZoom";
import { OVERLAY_INERT, useModalBehavior } from "@/components/cart/useModalBehavior";
import * as api from "./api";
import { useAuth, type AuthEntry } from "./AuthProvider";
import {
  COPY,
  DIALOG_LABEL,
  formatPhone,
  formatTimer,
  hasErrors,
  isMismatch,
  validateSetPassword,
  validateSignIn,
  validateSignUp,
  type Account,
  type FieldErrors,
  type SetPasswordFields,
  type SignInFields,
  type SignUpFields,
} from "./data";
import { CheckmarkCircleIcon, EyeIcon, EyeSlashIcon, GoogleGIcon, WarningIcon } from "./icons";

// The account drawer - Figma «Authorisation NEW» 5420:38169: a 576-px
// sheet hanging from the sticky header at the right edge (x 1134 on the
// 1710 canvas, 930 tall in the 1022-px frames), rounded-tl-48, 1-px
// #8e8e8f ring inside the box, pt-60 pl-60 pr-80 pb-40 (so a 436-px
// content column), 40-px rhythm between the blocks. Screens:
//   signin       «Вхід до осбистого кабінету»          5420:38175
//                + empty-field errors                  5420:38180
//                + «invalid data» alert 436 x 128      5420:38195
//   forgot       «Відновлення паролю»                  5420:38202
//   linkSent     checkmark + 0:59 countdown            5420:38217
//                -> «send again» (2 buttons)           5420:38222
//   setPassword  «Створіть новий пароль» (reset link)  5420:38207
//   signup       «Реєстрація», five fields             5420:38228
//                + «паролі не збігаються»: both password
//                  fields red, 81-px repeat field          5420:38248
//                + «account exists» alert 436 x 80     5420:38238
//   account      the retail customer's signed-in summary (no master;
//                kept from the first build): contacts + «Вийти». A
//                partner never sees it (designer, 2026-11-13): «Увійти»
//                takes them to /dashboard and they sign out from the
//                cabinet header menu
// Every field is the checkout «<TextField>» with the Figma FormHelperText
// box (`muiHelper`): 46 tall, 65 with one message line, 81 with two.
// No frame draws a close control: on desktop the drawer closes on the
// scrim and Esc only, and opening focuses the dialog itself.
// Phones (< 640, auth spec 2.1, DECISIONS D7 / T5c, no master): the same
// tree becomes a full-screen white sheet above the header (z 60, no scrim,
// no ring), entering like the phone menu (fade + 12-px drop). Its one
// scroller opens with the shared 66-px SheetBar (sticky; the screen title
// in one line + the 24 cross in a 48 box), the body follows 24 under it
// at the 24 gutters; forms keep the 46 fields 24 apart and put their
// actions 48 under the last field, every pill is the 42 Button/Small.
type Screen = "signin" | "forgot" | "linkSent" | "setPassword" | "signup" | "account";

// The frames are 1710 x 1022: 930 px of drawer under the 92-px header.
// Shorter desktop windows get the same composition scaled to fit.
const DRAWER_W = 576;
const DRAWER_DESIGN_H = 930;
const DESKTOP_HEADER_H = 92;
const DRAWER_STYLE = { "--field-surface": "#fff" } as CSSProperties;

const EMPTY_SIGNUP: SignUpFields = {
  firstName: "",
  lastName: "",
  login: "",
  password: "",
  repeat: "",
};
const EMPTY_NEW_PASSWORD: SetPasswordFields = { password: "", repeat: "" };

function entryScreen(entry: AuthEntry, signedIn: boolean): Screen {
  if (entry === "reset") return "setPassword";
  return signedIn ? "account" : "signin";
}

// --- atoms -------------------------------------------------------------

// Phone sheet bar copy (auth spec 2.1): the screen title, one line; the two
// titles wider than 228 px at 320 show their short form below 375. The
// link-sent success heading stays in the body.
const BAR_TITLE: Record<Screen, string> = {
  signin: COPY.signin.title,
  forgot: COPY.forgot.title,
  linkSent: COPY.forgot.title,
  setPassword: COPY.setPassword.title,
  signup: COPY.signup.title,
  account: COPY.account.title,
};
const BAR_SHORT: Partial<Record<Screen, string>> = {
  signin: COPY.sheet.signinShort,
  setPassword: COPY.sheet.setPasswordShort,
};

const COARSE = "(pointer: coarse)";

// A busy submit stays focusable (aria-disabled, the handlers return early)
// and keeps the 50 % look the disabled pill had.
const BUSY = "aria-disabled:opacity-50";

// Title (24/28 Bold -0.48 #1d1d1f, pt-4 pb-16 = a 48-px row) over the
// Body/Medium 16/24 #777779 subtitle. Phones: the title lives in the sheet
// bar, the subtitle is Body Small 14/20.
function TitleBlock({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center pb-4 pt-1 max-lg:hidden">
        <h2 className="min-w-0 flex-1 text-[24px] font-bold leading-7 tracking-[-0.48px] text-neutral-900">
          {title}
        </h2>
      </div>
      <p className="text-body-sm text-neutral-500">{subtitle}</p>
    </div>
  );
}

// Link-sent title block (5410:61014): the 48-px «Checkmark» centred over
// the title (gap 16), everything centred. Phones: Title Large 22/28
// SemiBold, balanced, 12 to the body.
function SuccessTitle({ title, body }: { title: ReactNode; body: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full flex-col items-center gap-4 pb-3 lg:pb-4 lg:pt-1">
        <CheckmarkCircleIcon className="size-12 shrink-0 text-positive" />
        <h2 className="w-full text-balance text-center text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900 lg:text-wrap lg:text-[24px] lg:font-bold lg:tracking-[-0.48px]">
          {title}
        </h2>
      </div>
      <p className="w-full text-center text-body-sm text-neutral-500">{body}</p>
    </div>
  );
}

// The error alert (layer «Платіж»): #ffe7e5 r24 p-16, the 24-px red
// «warning» and 16/24 Regular #1d1d1f text 16 px apart, centred. Phones:
// Body Small 14/20 with the icon on the first line. Focusable (tabIndex
// -1, no ring) so a failed phone submit can bring it into view.
function Alert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      tabIndex={-1}
      data-auth-alert
      className="flex w-full items-start gap-4 rounded-3xl bg-[#ffe7e5] p-4 outline-none lg:items-center"
    >
      <WarningIcon className="size-6 shrink-0 text-negative max-lg:-my-0.5" />
      <p className="min-w-0 flex-1 text-[14px] font-normal leading-5 text-neutral-900 lg:text-[16px] lg:leading-6">
        {children}
      </p>
    </div>
  );
}

// Button/Small, full column width: the orange «Button» (accent) or the
// #343435-outlined one. 42 tall at every width (DECISIONS D8: 16/22 Medium
// labels on phones too). `wrapClassName` carries the phone margins / order.
function WideButton({
  children,
  variant = "accent",
  className = "",
  wrapClassName = "",
  ...rest
}: {
  children: ReactNode;
  variant?: "accent" | "outlinedDark";
  className?: string;
  wrapClassName?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  title?: string;
  "aria-disabled"?: boolean;
  "data-autofocus"?: boolean;
}) {
  return (
    <div className={`flex w-full ${wrapClassName}`.trim()}>
      <Button size="small" variant={variant} fullWidth className={className} {...rest}>
        {children}
      </Button>
    </div>
  );
}

// An aria-disabled placeholder keeps the master's resting look: no
// hover inversion, no pointer (the label span carries both in Button).
const INERT_PILL =
  "[&>span]:cursor-default [&>span:hover]:border-neutral-800 [&>span:hover]:bg-transparent [&>span:hover]:text-neutral-900";
// "Зареєструватись з Google" (G 24 + 8 + 202.8) needs 282.8 px with the
// standard 24-px sides; the 272-px pill at 320 gets 12 (11 + the ring).
const GOOGLE_PILL = "max-[360px]:[&>span]:px-[11px]";

// «Увійти з Google» / «Зареєструватись з Google» (5258:5093): outlined
// Button/Small with the 24-px G 10 px before the label, centred. Visual
// only until Google sign-in exists: aria-disabled, no action, no hover.
// A tap on a phone shows "Незабаром" under the pill for 3 s (absolute, in
// the gap below, so nothing moves); desktop keeps the title tooltip.
function GoogleButton({ label }: { label: string }) {
  const [note, setNote] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    const t = timer;
    return () => window.clearTimeout(t.current);
  }, []);
  const showNote = () => {
    setNote(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNote(false), 3000);
  };
  return (
    <div className="relative flex w-full">
      <Button
        size="small"
        variant="outlinedDark"
        fullWidth
        title={COPY.google}
        aria-disabled
        className={`${GOOGLE_PILL} ${INERT_PILL}`}
        onClick={showNote}
      >
        {/* The 24-px logo overhangs the 22-px label line by 1 px each side,
            as in the master (logo y 9 in the 42-px box); phones close the
            gap to 8. */}
        <span className="flex h-[22px] items-center gap-[10px] max-sm:gap-2">
          <GoogleGIcon className="size-6 shrink-0" />
          {label}
        </span>
      </Button>
      <p
        role="status"
        className="pointer-events-none absolute inset-x-0 top-full mt-1 text-center text-[12px] leading-4 text-neutral-500 lg:hidden"
      >
        {note ? COPY.google : ""}
      </p>
    </div>
  );
}

// «Ще не зареєстровані? Зареєструватись» (5254:85725): 16/22, Regular
// #777779 + Bold #1d1d1f underlined action, 4 px apart, centred. Phones:
// a 16/24 line and a 44-px tall action.
function PromptRow({
  text,
  action,
  onAction,
}: {
  text: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-x-1 text-[16px] leading-6 lg:leading-[22px]">
      <span className="whitespace-nowrap text-neutral-500">{text}</span>
      <button
        type="button"
        onClick={onAction}
        className="-my-2.5 cursor-pointer whitespace-nowrap py-2.5 font-bold text-neutral-900 underline decoration-from-font [text-underline-position:from-font] transition-colors duration-200 hover:text-brand lg:my-0 lg:py-0"
      >
        {action}
      </button>
    </div>
  );
}

type EnterHint = "next" | "go" | "send";

// Password «<TextField>» with the eye «AdornmentEnd»: hidden = eye,
// visible = eye-slash. The toggle keeps the caret in the field; it is a
// toggle button with a constant name («Показати пароль», pressed or not).
// `hintId` / `describedBy` tie the «паролі не збігаються» line under the
// repeat field to the first field as well. Phones: the eye is a 44-px hit
// box centred on its 24-px slot.
function PasswordField({
  label,
  value,
  onChange,
  error,
  invalid,
  hintId,
  describedBy,
  name,
  autoComplete,
  enterKeyHint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  invalid?: boolean;
  hintId?: string;
  describedBy?: string;
  name: string;
  autoComplete: string;
  enterKeyHint: EnterHint;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      label={label}
      value={value}
      onChange={onChange}
      error={error}
      invalid={invalid}
      hintId={hintId}
      describedBy={describedBy}
      type={visible ? "text" : "password"}
      name={name}
      autoComplete={autoComplete}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint={enterKeyHint}
      muiHelper
      trailing={
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setVisible((v) => !v)}
          aria-label="Показати пароль"
          aria-pressed={visible}
          data-eye
          className="flex size-6 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 hover:text-brand max-lg:-m-2.5 max-lg:size-11"
        >
          {visible ? <EyeSlashIcon className="size-6" /> : <EyeIcon className="size-6" />}
        </button>
      }
    />
  );
}

function LoginField({
  label = COPY.labels.login,
  value,
  onChange,
  error,
  helper,
  enterKeyHint,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  helper?: string;
  enterKeyHint: EnterHint;
}) {
  return (
    <TextField
      label={label}
      value={value}
      onChange={onChange}
      error={error}
      helper={helper}
      name="username"
      autoComplete="username"
      inputMode="email"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint={enterKeyHint}
      muiHelper
    />
  );
}

// --- screens -----------------------------------------------------------

function Screens({
  initial,
  resetToken,
  labelId,
  titleRef,
  closeRef,
}: {
  initial: Screen;
  resetToken: string | null;
  labelId: string;
  // The sheet bar's title / cross (phones), owned by AuthDrawer for the
  // initial focus.
  titleRef: RefObject<HTMLElement | null>;
  closeRef: RefObject<HTMLButtonElement | null>;
}) {
  const { user, closeAuth, signOut, signedIn } = useAuth();
  const phone = usePhone();
  const [screen, setScreen] = useState<Screen>(initial);
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  // «Паролі не збігаються» lives under the repeat field; the first
  // password field (also red) points at it too.
  const mismatchHintId = useId();

  // The login travels between «Вхід» and «Відновлення паролю».
  const [login, setLogin] = useState("");

  // Sign in
  const [password, setPassword] = useState("");
  const [signinErrors, setSigninErrors] = useState<FieldErrors<SignInFields>>({});
  const [signinAlert, setSigninAlert] = useState(false);

  // Forgot password + link sent
  const [forgotError, setForgotError] = useState<string>();
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(0);

  // Set new password
  const [newPassword, setNewPassword] = useState<SetPasswordFields>(EMPTY_NEW_PASSWORD);
  const [newPasswordErrors, setNewPasswordErrors] = useState<FieldErrors<SetPasswordFields>>({});
  const [newPasswordAlert, setNewPasswordAlert] = useState(false);

  // Sign up
  const [signup, setSignup] = useState<SignUpFields>(EMPTY_SIGNUP);
  const [signupErrors, setSignupErrors] = useState<FieldErrors<SignUpFields>>({});
  const [signupAlert, setSignupAlert] = useState(false);

  // «...через 0:59.»: the minute runs 0:59 ... 0:00, then the screen
  // switches to «send again».
  const remainingMs = resendAt - now;
  const timerOn = screen === "linkSent" && remainingMs > 0;
  useEffect(() => {
    if (!timerOn) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timerOn]);
  const secondsShown = Math.min(59, Math.max(0, Math.ceil(remainingMs / 1000) - 1));

  // Every screen opens at the top of the sheet (a switch from the bottom of
  // a long sign-up must not land mid-way under the bar).
  useLayoutEffect(() => {
    const scroller = bodyRef.current?.closest<HTMLElement>("[data-auth-sheet]");
    if (scroller) scroller.scrollTop = 0;
  }, [screen]);

  // Focus follows the view: the first field (or the marked button) of
  // every screen the visitor moves to. The entry screen keeps the
  // dialog's own initial focus so it opens in the master's rest state
  // (compared by value, so the dev double-run of effects cannot skip it).
  // The link-sent screen swaps its whole body when the countdown ends
  // and again after «Отримати посилання ще раз»; such a swap inside one
  // screen moves focus only when the focused control went away with the
  // old state (otherwise e.g. the close X keeps it). On a touch phone the
  // sheet bar title takes it instead (screen readers hear the new screen,
  // no keyboard pops up).
  const view: string = screen === "linkSent" ? `linkSent:${timerOn ? "timer" : "again"}` : screen;
  const shownView = useRef<string>(initial);
  useEffect(() => {
    const prev = shownView.current;
    if (prev === view) return;
    shownView.current = view;
    const sameScreen = prev.split(":")[0] === screen;
    const id = requestAnimationFrame(() => {
      const body = bodyRef.current;
      if (!body) return;
      const focused = document.activeElement;
      if (sameScreen && focused && focused !== document.body && body.closest("[role=dialog]")?.contains(focused)) {
        return;
      }
      const title = titleRef.current;
      if (title && title.offsetParent !== null && window.matchMedia(COARSE).matches) {
        title.focus({ preventScroll: true });
        return;
      }
      body.querySelector<HTMLElement>("input:not([disabled]), button[data-autofocus]")?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [view, screen, titleRef]);

  // Phones: a failed submit brings what explains it into view - the first
  // red field (focused, centred in the sheet) or the server alert (focused,
  // the sheet back at the top). Desktop keeps its rest state (the master
  // error frames show no focused field).
  const [focusReq, setFocusReq] = useState<{ kind: "invalid" | "alert"; n: number } | null>(null);
  const requestFocus = (kind: "invalid" | "alert") => setFocusReq((r) => ({ kind, n: (r?.n ?? 0) + 1 }));
  useEffect(() => {
    if (!focusReq || window.matchMedia(DESKTOP_QUERY).matches) return;
    const body = bodyRef.current;
    const scroller = body?.closest<HTMLElement>("[data-auth-sheet]");
    const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    if (focusReq.kind === "alert") {
      body?.querySelector<HTMLElement>("[data-auth-alert]")?.focus({ preventScroll: true });
      scroller?.scrollTo({ top: 0, behavior });
      return;
    }
    const field = body?.querySelector<HTMLElement>('input[aria-invalid="true"]');
    field?.focus({ preventScroll: true });
    field?.scrollIntoView({ block: "center", behavior });
  }, [focusReq]);

  const startTimer = (seconds: number) => {
    const t = Date.now();
    setNow(t);
    setResendAt(t + seconds * 1000);
  };

  // A screen switch keeps the typed values but drops every error, so a
  // round trip (sign in -> forgot -> sign in) never shows stale red.
  const goTo = (next: Screen) => {
    setSigninAlert(false);
    setSignupAlert(false);
    setNewPasswordAlert(false);
    setSigninErrors({});
    setForgotError(undefined);
    setSignupErrors({});
    setNewPasswordErrors({});
    setScreen(next);
  };

  // --- sign in ---------------------------------------------------------
  const submitSignin = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const errors = validateSignIn({ login, password });
    setSigninErrors(errors);
    setSigninAlert(false);
    if (hasErrors(errors)) {
      requestFocus("invalid");
      return;
    }
    setBusy(true);
    try {
      const result = await api.signIn(login, password);
      if (result.ok) {
        // The drawer closes; a partner goes to the dashboard (unless the
        // page opened the drawer) and a first login opens «Вітаємо на
        // платформі» there (AuthProvider.signedIn).
        signedIn(result.account);
      } else if (result.error === "empty") {
        setSigninErrors(result.fields);
        requestFocus("invalid");
      } else {
        setSigninAlert(true);
        requestFocus("alert");
      }
    } finally {
      setBusy(false);
    }
  };

  // --- forgot password -------------------------------------------------
  const submitForgot = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!login.trim()) {
      setForgotError(COPY.errors.login);
      requestFocus("invalid");
      return;
    }
    setBusy(true);
    try {
      const result = await api.sendResetLink(login);
      if (!result.ok) {
        setForgotError(result.message);
        requestFocus("invalid");
        return;
      }
      startTimer(result.resendAfter);
      goTo("linkSent");
    } finally {
      setBusy(false);
    }
  };

  const resendLink = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await api.sendResetLink(login);
      if (result.ok) startTimer(result.resendAfter);
    } finally {
      setBusy(false);
    }
  };

  // --- set new password ------------------------------------------------
  const submitNewPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const errors = validateSetPassword(newPassword);
    setNewPasswordErrors(errors);
    setNewPasswordAlert(false);
    if (hasErrors(errors)) {
      requestFocus("invalid");
      return;
    }
    setBusy(true);
    try {
      const result = await api.setPassword(
        resetToken ?? "",
        newPassword.password,
        newPassword.repeat,
      );
      if (result.ok) {
        // Back to «Вхід» with the login filled in: the new password
        // proves itself on the first sign-in.
        setLogin(result.login);
        setPassword("");
        goTo("signin");
      } else if (result.error === "fields") {
        setNewPasswordErrors(result.fields);
        requestFocus("invalid");
      } else {
        setNewPasswordAlert(true);
        requestFocus("alert");
      }
    } finally {
      setBusy(false);
    }
  };

  // --- sign up ---------------------------------------------------------
  const submitSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const errors = validateSignUp(signup);
    setSignupErrors(errors);
    setSignupAlert(false);
    if (hasErrors(errors)) {
      requestFocus("invalid");
      return;
    }
    setBusy(true);
    try {
      const result = await api.signUp(signup);
      if (result.ok) {
        closeAuth();
      } else if (result.error === "fields") {
        setSignupErrors(result.fields);
        requestFocus("invalid");
      } else {
        setSignupAlert(true);
        requestFocus("alert");
      }
    } finally {
      setBusy(false);
    }
  };

  // Editing either password clears «паролі не збігаються» from both.
  const editSignup = (key: keyof SignUpFields) => (v: string) => {
    setSignup((f) => ({ ...f, [key]: v }));
    const clearMismatch = key === "password" && isMismatch(signupErrors);
    if (signupErrors[key] || clearMismatch) {
      setSignupErrors((errs) => ({
        ...errs,
        [key]: undefined,
        ...(clearMismatch ? { repeat: undefined } : {}),
      }));
    }
  };
  const editNewPassword = (key: keyof SetPasswordFields) => (v: string) => {
    setNewPassword((f) => ({ ...f, [key]: v }));
    const clearMismatch = key === "password" && isMismatch(newPasswordErrors);
    if (newPasswordErrors[key] || clearMismatch) {
      setNewPasswordErrors((errs) => ({
        ...errs,
        [key]: undefined,
        ...(clearMismatch ? { repeat: undefined } : {}),
      }));
    }
  };

  return (
    <div data-screen={screen} className="flex flex-col">
      {/* The dialog's name follows the screen (aria-labelledby). */}
      <span id={labelId} hidden>
        {DIALOG_LABEL[screen]}
      </span>
      {/* Phones: the sheet bar, sticky at the top of the one scroller. */}
      <SheetBar
        title={BAR_TITLE[screen]}
        shortTitle={BAR_SHORT[screen]}
        titleRef={titleRef}
        closeRef={closeRef}
        onClose={closeAuth}
        closeLabel={screen === "account" ? COPY.sheet.closeAccount : COPY.sheet.close}
        sticky
        className="-mx-6 lg:hidden"
      />
      <div ref={bodyRef} className="pt-6 lg:pt-0">
        {screen === "signin" && (
          <form onSubmit={submitSignin} noValidate aria-busy={busy} className="flex flex-col gap-6 lg:gap-10">
            <TitleBlock title={COPY.signin.title} subtitle={COPY.signin.subtitle} />
            <div className="flex flex-col gap-8 lg:gap-10">
              <div className="flex flex-col gap-6">
                {signinAlert && <Alert>{COPY.signin.invalid}</Alert>}
                {/* 5420:38180 names the empty-login field in full while its
                    error shows; it drops back with the error (first key).
                    Phones keep the short label (the long one never fits a
                    phone field; the helper line explains). */}
                <LoginField
                  label={signinErrors.login && !phone ? COPY.labels.loginError : undefined}
                  value={login}
                  onChange={(v) => {
                    setLogin(v);
                    if (signinErrors.login) setSigninErrors((p) => ({ ...p, login: undefined }));
                  }}
                  error={signinErrors.login}
                  enterKeyHint="next"
                />
                <PasswordField
                  label={COPY.labels.password}
                  value={password}
                  onChange={(v) => {
                    setPassword(v);
                    if (signinErrors.password) setSigninErrors((p) => ({ ...p, password: undefined }));
                  }}
                  error={signinErrors.password}
                  name="current-password"
                  autoComplete="current-password"
                  enterKeyHint="go"
                />
                <div className="flex h-5 justify-end max-lg:-mt-2 lg:h-[22px]">
                  <button
                    type="button"
                    onClick={() => goTo("forgot")}
                    className="-my-3 cursor-pointer whitespace-nowrap py-3 text-[14px] font-medium leading-5 text-neutral-800 underline decoration-from-font [text-underline-position:from-font] transition-colors duration-200 hover:text-brand lg:my-0 lg:py-0 lg:leading-[22px]"
                  >
                    {COPY.signin.forgot}
                  </button>
                </div>
                {/* Phones: the pair sits 48 under the link, 8 apart; desktop
                    dissolves the wrapper into the 24-px stack. */}
                <div className="flex flex-col gap-2 max-lg:mt-6 lg:contents">
                  <WideButton type="submit" aria-disabled={busy || undefined} className={BUSY}>
                    {COPY.signin.submit}
                  </WideButton>
                  <GoogleButton label={COPY.signin.google} />
                </div>
              </div>
              <PromptRow
                text={COPY.signin.prompt}
                action={COPY.signin.promptAction}
                onAction={() => goTo("signup")}
              />
            </div>
          </form>
        )}

        {screen === "forgot" && (
          <form onSubmit={submitForgot} noValidate aria-busy={busy} className="flex flex-col gap-6 lg:gap-10">
            <TitleBlock title={COPY.forgot.title} subtitle={COPY.forgot.subtitle} />
            <LoginField
              value={login}
              onChange={(v) => {
                setLogin(v);
                if (forgotError) setForgotError(undefined);
              }}
              error={forgotError}
              enterKeyHint="send"
            />
            <WideButton type="submit" aria-disabled={busy || undefined} className={BUSY} wrapClassName="max-lg:mt-6">
              {COPY.forgot.submit}
            </WideButton>
            {/* Phones only (no frame draws it): the way back to "Вхід"
                without closing the sheet. */}
            <div className="flex justify-center max-lg:mt-2 lg:hidden">
              <button
                type="button"
                onClick={() => goTo("signin")}
                className="-my-2.5 cursor-pointer whitespace-nowrap py-2.5 text-[16px] font-bold leading-6 text-neutral-900 underline decoration-from-font [text-underline-position:from-font]"
              >
                {COPY.linkSent.back}
              </button>
            </div>
          </form>
        )}

        {screen === "linkSent" && (
          <div className="flex flex-col gap-6 lg:gap-10">
            {timerOn ? (
              <>
                <SuccessTitle
                  title={
                    <>
                      {/* Phones: one balanced run (2 lines from 360, 1 at
                          600). Desktop: the layer ends line 1 with a space
                          before the break and Figma centres it with that
                          space; an NBSP survives the line end, so the line
                          sits 3 px left like the master (ctx 5420-38217). */}
                      <span className="lg:hidden">
                        {COPY.linkSent.titleTimer[0]} {COPY.linkSent.titleTimer[1]}
                      </span>
                      <span className="max-lg:hidden">
                        {COPY.linkSent.titleTimer[0]}&nbsp;
                        <br />
                        {COPY.linkSent.titleTimer[1]}
                      </span>
                    </>
                  }
                  body={COPY.linkSent.body}
                />
                {/* 5410:64934: #f8f8f8 r24 p-16, 14/22 Medium #343435 with
                    the time in Bold; on the 436-px column the three runs
                    sit 4 px apart on one line (flex, so the space below
                    is not rendered). Phones get one wrapping, centred
                    sentence at 14/20: «...через 0:59.» with the time and
                    dot kept together. */}
                <p
                  data-countdown
                  className="w-full rounded-3xl bg-bg-subtle p-4 text-[14px] font-medium leading-5 text-neutral-800 max-lg:text-center lg:flex lg:flex-wrap lg:items-center lg:gap-1 lg:leading-[22px]"
                >
                  <span className="lg:whitespace-nowrap">{COPY.linkSent.timer}</span>{" "}
                  <span className="whitespace-nowrap font-bold">{formatTimer(secondsShown)}</span>
                  <span>.</span>
                </p>
                <WideButton variant="outlinedDark" onClick={() => goTo("signin")} data-autofocus wrapClassName="max-lg:mt-2">
                  {COPY.linkSent.back}
                </WideButton>
              </>
            ) : (
              <>
                <SuccessTitle title={COPY.linkSent.titleAgain} body={COPY.linkSent.body} />
                {/* Phones (D8): the way back first, the primary last. */}
                <div className="flex flex-col gap-2 max-lg:mt-2 lg:gap-6">
                  <WideButton onClick={resendLink} aria-disabled={busy || undefined} className={BUSY} data-autofocus>
                    {COPY.linkSent.again}
                  </WideButton>
                  <WideButton variant="outlinedDark" onClick={() => goTo("signin")} wrapClassName="max-lg:order-first">
                    {COPY.linkSent.back}
                  </WideButton>
                </div>
              </>
            )}
          </div>
        )}

        {screen === "setPassword" && (
          <form onSubmit={submitNewPassword} noValidate aria-busy={busy} className="flex flex-col gap-6 lg:gap-10">
            <TitleBlock title={COPY.setPassword.title} subtitle={COPY.setPassword.subtitle} />
            <div className="flex flex-col gap-6">
              {newPasswordAlert && <Alert>{COPY.requestFailed}</Alert>}
              <PasswordField
                label={COPY.labels.password}
                value={newPassword.password}
                onChange={editNewPassword("password")}
                error={newPasswordErrors.password}
                invalid={isMismatch(newPasswordErrors)}
                describedBy={isMismatch(newPasswordErrors) ? mismatchHintId : undefined}
                name="new-password"
                autoComplete="new-password"
                enterKeyHint="next"
              />
              <PasswordField
                label={COPY.labels.repeat}
                value={newPassword.repeat}
                onChange={editNewPassword("repeat")}
                error={newPasswordErrors.repeat}
                hintId={mismatchHintId}
                name="confirm-password"
                autoComplete="new-password"
                enterKeyHint="go"
              />
            </div>
            <WideButton type="submit" aria-disabled={busy || undefined} className={BUSY} wrapClassName="max-lg:mt-6">
              {COPY.setPassword.submit}
            </WideButton>
          </form>
        )}

        {screen === "signup" && (
          <form onSubmit={submitSignup} noValidate aria-busy={busy} className="flex flex-col gap-6 lg:gap-10">
            <TitleBlock title={COPY.signup.title} subtitle={COPY.signup.subtitle} />
            <div className="flex flex-col gap-8 lg:gap-10">
              <div className="flex flex-col gap-6">
                {signupAlert && <Alert>{COPY.requestFailed}</Alert>}
                <TextField
                  label={COPY.labels.firstName}
                  value={signup.firstName}
                  onChange={editSignup("firstName")}
                  error={signupErrors.firstName}
                  name="given-name"
                  autoComplete="given-name"
                  enterKeyHint="next"
                  muiHelper
                />
                <TextField
                  label={COPY.labels.lastName}
                  value={signup.lastName}
                  onChange={editSignup("lastName")}
                  error={signupErrors.lastName}
                  name="family-name"
                  autoComplete="family-name"
                  enterKeyHint="next"
                  muiHelper
                />
                <LoginField
                  value={signup.login}
                  onChange={editSignup("login")}
                  error={signupErrors.login}
                  helper={COPY.signup.loginHelper}
                  enterKeyHint="next"
                />
                <PasswordField
                  label={COPY.labels.password}
                  value={signup.password}
                  onChange={editSignup("password")}
                  error={signupErrors.password}
                  invalid={isMismatch(signupErrors)}
                  describedBy={isMismatch(signupErrors) ? mismatchHintId : undefined}
                  name="new-password"
                  autoComplete="new-password"
                  enterKeyHint="next"
                />
                <PasswordField
                  label={COPY.labels.repeat}
                  value={signup.repeat}
                  onChange={editSignup("repeat")}
                  error={signupErrors.repeat}
                  hintId={mismatchHintId}
                  name="confirm-password"
                  autoComplete="new-password"
                  enterKeyHint="go"
                />
              </div>
              <div className="flex flex-col gap-2 max-lg:mt-4 lg:gap-6">
                <WideButton type="submit" aria-disabled={busy || undefined} className={BUSY}>
                  {COPY.signup.submit}
                </WideButton>
                <GoogleButton label={COPY.signup.google} />
              </div>
              <PromptRow
                text={COPY.signup.prompt}
                action={COPY.signup.promptAction}
                onAction={() => goTo("signin")}
              />
            </div>
          </form>
        )}

        {screen === "account" && user && <AccountScreen user={user} onSignOut={signOut} phone={phone} />}
      </div>
    </div>
  );
}

// The retail customer's signed-in summary in the drawer's own typography:
// they have no company, no profile page and no cabinet (no retail design),
// so the contact rows and «Вийти» (their only sign-out) are all it holds.
// Partners never get here (designer, 2026-11-13): «Увійти» leads them to
// the dashboard, «Мій профіль» / «Вийти» live in the cabinet header menu.
// Phones (no master): the filled card r32 (3085:3974) with key / value
// rows between 1-px #d2d2d2 lines (14/20 Medium label, 8, 16/24 value),
// empty rows left out.
function AccountScreen({
  user,
  onSignOut,
  phone,
}: {
  user: Account;
  onSignOut: () => void;
  phone: boolean;
}) {
  const t = COPY.account;
  const rows: [string, string][] = [
    [t.phone, formatPhone(user.person.phone || user.phone)],
    [t.email, user.person.email],
  ];
  const shown = phone ? rows.filter(([, value]) => value) : rows;
  return (
    <div className="flex flex-col gap-6 lg:gap-10">
      <TitleBlock title={t.title} subtitle={`${t.signedInAs} ${user.person.fullName}`} />
      <div className="rounded-[32px] bg-bg-subtle p-6 lg:rounded-3xl">
        <dl className="flex flex-col max-lg:divide-y max-lg:divide-stroke-subtle lg:gap-4">
          {shown.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 lg:gap-0.5 lg:py-0">
              <dt className="text-[14px] font-medium leading-5 text-neutral-500 lg:font-normal lg:leading-6">
                {label}
              </dt>
              <dd className="text-[16px] leading-6 text-neutral-900 lg:text-body-sm lg:font-medium">
                {value || "-"}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <WideButton variant="outlinedDark" onClick={onSignOut} data-autofocus wrapClassName="max-lg:mt-2">
        {t.signOut}
      </WideButton>
    </div>
  );
}

// --- shell -------------------------------------------------------------

export function AuthDrawer() {
  const { open, openCount, entry, user, resetToken, closeAuth } = useAuth();
  const asideRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const focusRef = useRef<HTMLElement | null>(null);
  const labelId = useId();
  // The 930-px master panel is zoomed to the space under the header on
  // shorter desktop windows (the cart drawer's rule), never scaled up.
  const fit = useFitZoom(DRAWER_DESIGN_H, DESKTOP_HEADER_H);
  const fitted = fit < 1;

  // Initial focus. Desktop: the dialog itself (no field, no control
  // focused - the master's rest state on every screen). Phones (the sheet
  // bar is rendered): the bar title on touch (no keyboard pops up), the
  // cross with a mouse. Picked before useModalBehavior's effect reads it.
  useLayoutEffect(() => {
    if (!open) return;
    const title = titleRef.current;
    const phoneBar = title !== null && title.offsetParent !== null;
    focusRef.current = phoneBar ? (window.matchMedia(COARSE).matches ? title : closeRef.current) : null;
  }, [open, openCount]);

  useModalBehavior({
    open,
    onClose: closeAuth,
    container: asideRef,
    initial: focusRef,
    inertSelector: OVERLAY_INERT,
  });

  // After closing, focus normally returns to the opener (useModalBehavior,
  // whose cleanup runs first). A sign-in from the cabinet SignInPrompt
  // swaps the page under the sheet and the opener is gone: focus would
  // drop to <body>, so the page title (CabinetPageHead h1, tabIndex -1)
  // takes it, else the header logo; no scroll. A welcome card opening in
  // the same commit keeps its own focus.
  useEffect(() => {
    if (!open) return;
    return () => {
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (active && active !== document.body && !active.closest("[inert]")) return;
        const target =
          document.querySelector<HTMLElement>("main h1[tabindex='-1']") ??
          document.querySelector<HTMLElement>("body > header a");
        target?.focus({ preventScroll: true });
      });
    };
  }, [open]);

  const initial = entryScreen(entry, Boolean(user));

  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={`fixed inset-0 z-[60] lg:z-40 ${open ? "" : "pointer-events-none"}`}
    >
      {/* Desktop scrim; phones have none (the sheet covers the screen). */}
      <div
        aria-hidden
        onClick={closeAuth}
        className={`absolute inset-0 bg-[#343435]/50 backdrop-blur-[4px] transition-opacity duration-300 max-lg:hidden ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Desktop: the 576 drawer under the header, sliding in from the
          right. Phones: the full-screen sheet (100dvh), fading and dropping
          12 px in like the phone menu. */}
      <aside
        ref={asideRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        tabIndex={-1}
        data-auth-drawer
        style={fitted ? { width: DRAWER_W * fit } : undefined}
        className={`absolute bottom-0 right-0 top-0 flex h-dvh w-full flex-col overflow-hidden outline-none transition-[translate,opacity] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[translate] max-lg:motion-reduce:transition-none lg:top-[var(--site-header-h,92px)] lg:h-auto lg:w-[576px] lg:max-w-[92vw] lg:transition-[translate] ${
          open
            ? "translate-y-0 opacity-100 lg:translate-x-0"
            : "-translate-y-3 opacity-0 lg:translate-x-full lg:translate-y-0 lg:opacity-100"
        }`}
      >
        {/* The sheet in the master's px; on short windows it is the
            576 x 930 design box zoomed into the space under the header
            (CSS zoom keeps text crisp and hit-testing exact). Phones: one
            scroller from the sticky bar to the last action. */}
        <div
          data-auth-sheet
          style={{
            ...DRAWER_STYLE,
            ...(fitted ? { zoom: fit, width: DRAWER_W, height: DRAWER_DESIGN_H, flex: "none" } : undefined),
          }}
          className="scrollbar-hidden relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-white px-6 pb-6 max-lg:scroll-pt-24 lg:rounded-tl-[48px] lg:border lg:border-stroke-default lg:pb-[39px] lg:pl-[59px] lg:pr-[79px] lg:pt-[59px]"
        >
          {/* Remounts on every open so each visit starts at the entry
              screen with empty fields. */}
          <Screens key={openCount} initial={initial} resetToken={resetToken} labelId={labelId} titleRef={titleRef} closeRef={closeRef} />
        </div>
      </aside>
    </div>
  );
}
