"use client";
/* eslint-disable @next/next/no-img-element */
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/Button";
import { XMarkIcon } from "@/components/catalog/icons";
import { TextField } from "@/components/checkout/fields";
import { useFitZoom } from "@/components/cart/useFitZoom";
import { useModalBehavior } from "@/components/cart/useModalBehavior";
import * as api from "./api";
import { useAuth, type AuthEntry } from "./AuthProvider";
import {
  COPY,
  PROFILE_HREF,
  REGIONS,
  formatPhone,
  formatTimer,
  hasErrors,
  isMismatch,
  roleLabel,
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
//   account      the signed-in summary (no master; kept from the first
//                build): a partner gets «Перейти в профіль» -> /profile,
//                and «Вийти» is the site's only sign-out for everyone
// Every field is the checkout «<TextField>» with the Figma FormHelperText
// box (`muiHelper`): 46 tall, 65 with one message line, 81 with two.
// No frame draws a close control: on desktop the drawer closes on the
// scrim and Esc only, and opening focuses the dialog itself. Code-only
// extra: phones (no master; the scrim there is an 8vw strip) keep a
// 32-px X in the top-right corner.
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

// Title (24/28 Bold -0.48 #1d1d1f, pt-4 pb-16 = a 48-px row) over the
// Body/Medium 16/24 #777779 subtitle.
function TitleBlock({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center pb-4 pt-1">
        <h2 className="min-w-0 flex-1 text-[24px] font-bold leading-7 tracking-[-0.48px] text-neutral-900">
          {title}
        </h2>
      </div>
      <p className="text-body-sm text-neutral-500">{subtitle}</p>
    </div>
  );
}

// Link-sent title block (5410:61014): the 48-px «Checkmark» centred over
// the title (gap 16), everything centred.
function SuccessTitle({ title, body }: { title: ReactNode; body: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full flex-col items-center gap-4 pb-4 pt-1">
        <CheckmarkCircleIcon className="size-12 shrink-0 text-positive" />
        <h2 className="w-full text-center text-[24px] font-bold leading-7 tracking-[-0.48px] text-neutral-900">
          {title}
        </h2>
      </div>
      <p className="w-full text-center text-body-sm text-neutral-500">{body}</p>
    </div>
  );
}

// The error alert (layer «Платіж»): #ffe7e5 r24 p-16, the 24-px red
// «warning» and 16/24 Regular #1d1d1f text 16 px apart, centred.
function Alert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex w-full items-center gap-4 rounded-3xl bg-[#ffe7e5] p-4">
      <WarningIcon className="size-6 shrink-0 text-negative" />
      <p className="min-w-0 flex-1 text-[16px] font-normal leading-6 text-neutral-900">{children}</p>
    </div>
  );
}

// Phones (no master): the full-width pills keep their 42-px height but
// give the label more room - 12-px side padding (11 + the 1-px ring)
// below sm and 14-px type under 360 px, so «Отримати посилання ще раз»
// and «Зареєструватись з Google» fit a 244-px column at 320. The pills
// are full width, so the padding only matters once a label is too long.
const PHONE_PILL = "max-sm:[&>span]:px-[11px] max-[360px]:[&>span]:text-[14px]";

// Button/Small, full column width: the orange «Button» (accent) or the
// #343435-outlined one. 42 tall.
function WideButton({
  children,
  variant = "accent",
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: "accent" | "outlinedDark";
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  "aria-disabled"?: boolean;
  "data-autofocus"?: boolean;
}) {
  return (
    <div className="flex w-full">
      <Button size="small" variant={variant} fullWidth className={`${PHONE_PILL} ${className}`} {...rest}>
        {children}
      </Button>
    </div>
  );
}

// Phones (below 640): a resting field label longer than the room inside
// the ring's 24-px sides ends in an ellipsis on one line; it shows in
// full once it floats. «Електронна пошта або телефон» (249 px) only
// overflows the 320-px field, but the empty-field error label
// «Електронна пошта або номер телефону» (311.7 px) overflows every phone
// width up to about 420, so the cap covers the whole phone range. Labels
// that fit are untouched (truncate only clips what overflows); the
// desktop drawer (>= 640) never gets it.
const PHONE_FIELD_LABEL =
  "max-lg:[&_input:placeholder-shown:not(:focus)+span]:max-w-[calc(100%-48px)] max-lg:[&_input:placeholder-shown:not(:focus)+span]:truncate";

// An aria-disabled placeholder keeps the master's resting look: no
// hover inversion, no pointer (the label span carries both in Button).
const INERT_PILL =
  "[&>span]:cursor-default [&>span:hover]:border-neutral-800 [&>span:hover]:bg-transparent [&>span:hover]:text-neutral-900";

// «Увійти з Google» / «Зареєструватись з Google» (5258:5093): outlined
// Button/Small with the 24-px G 10 px before the label, centred. Visual
// only until Google sign-in exists: aria-disabled, no action, no hover.
function GoogleButton({ label }: { label: string }) {
  return (
    <WideButton variant="outlinedDark" title={COPY.google} aria-disabled className={INERT_PILL}>
      {/* The 24-px logo overhangs the 22-px label line by 1 px each side,
          as in the master (logo y 9 in the 42-px box); phones close the
          gap to 8. */}
      <span className="flex h-[22px] items-center gap-[10px] max-sm:gap-2">
        <GoogleGIcon className="size-6 shrink-0" />
        {label}
      </span>
    </WideButton>
  );
}

// «Ще не зареєстровані? Зареєструватись» (5254:85725): 16/22, Regular
// #777779 + Bold #1d1d1f underlined action, 4 px apart, centred.
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
    <div className="flex flex-wrap justify-center gap-x-1 text-[16px] leading-[22px]">
      <span className="whitespace-nowrap text-neutral-500">{text}</span>
      <button
        type="button"
        onClick={onAction}
        className="cursor-pointer whitespace-nowrap font-bold text-neutral-900 underline decoration-from-font [text-underline-position:from-font] transition-colors duration-200 hover:text-brand"
      >
        {action}
      </button>
    </div>
  );
}

// Password «<TextField>» with the eye «AdornmentEnd»: hidden = eye,
// visible = eye-slash. The toggle keeps the caret in the field; it is a
// toggle button with a constant name («Показати пароль», pressed or not).
// `hintId` / `describedBy` tie the «паролі не збігаються» line under the
// repeat field to the first field as well.
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
      muiHelper
      trailing={
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setVisible((v) => !v)}
          aria-label="Показати пароль"
          aria-pressed={visible}
          data-eye
          className="flex size-6 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 hover:text-brand"
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
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  helper?: string;
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
      muiHelper
    />
  );
}

// --- screens -----------------------------------------------------------

function Screens({ initial, resetToken }: { initial: Screen; resetToken: string | null }) {
  const { user, closeAuth, signOut, finishRegistration } = useAuth();
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

  // Focus follows the view: the first field (or the marked button) of
  // every screen the visitor moves to. The entry screen keeps the
  // dialog's own initial focus so it opens in the master's rest state
  // (compared by value, so the dev double-run of effects cannot skip it).
  // The link-sent screen swaps its whole body when the countdown ends
  // and again after «Отримати посилання ще раз»; such a swap inside one
  // screen moves focus only when the focused control went away with the
  // old state (otherwise e.g. the close X keeps it).
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
      body.querySelector<HTMLElement>("input:not([disabled]), button[data-autofocus]")?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [view, screen]);

  const startTimer = (seconds: number) => {
    const t = Date.now();
    setNow(t);
    setResendAt(t + seconds * 1000);
  };

  const goTo = (next: Screen) => {
    setSigninAlert(false);
    setSignupAlert(false);
    setNewPasswordAlert(false);
    setScreen(next);
  };

  // --- sign in ---------------------------------------------------------
  const submitSignin = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const errors = validateSignIn({ login, password });
    setSigninErrors(errors);
    setSigninAlert(false);
    if (hasErrors(errors)) return;
    setBusy(true);
    try {
      const result = await api.signIn(login, password);
      if (result.ok) {
        // A partner's first login (CRM account not yet welcomed) opens
        // «Вітаємо на платформі» instead of just closing the drawer.
        if (result.account.type === "b2b" && !result.account.welcomed) finishRegistration();
        else closeAuth();
      } else if (result.error === "empty") {
        setSigninErrors(result.fields);
      } else {
        setSigninAlert(true);
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
      return;
    }
    setBusy(true);
    try {
      const result = await api.sendResetLink(login);
      if (!result.ok) {
        setForgotError(result.message);
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
    if (hasErrors(errors)) return;
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
        setSigninErrors({});
        goTo("signin");
      } else if (result.error === "fields") {
        setNewPasswordErrors(result.fields);
      } else {
        setNewPasswordAlert(true);
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
    if (hasErrors(errors)) return;
    setBusy(true);
    try {
      const result = await api.signUp(signup);
      if (result.ok) {
        closeAuth();
      } else if (result.error === "fields") {
        setSignupErrors(result.fields);
      } else {
        setSignupAlert(true);
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
    <div ref={bodyRef} data-screen={screen} className={`flex flex-col ${PHONE_FIELD_LABEL}`}>
      {screen === "signin" && (
        <form onSubmit={submitSignin} noValidate className="flex flex-col gap-6 lg:gap-10">
          <TitleBlock title={COPY.signin.title} subtitle={COPY.signin.subtitle} />
          <div className="flex flex-col gap-6 lg:gap-10">
            <div className="flex flex-col gap-6">
              {signinAlert && <Alert>{COPY.signin.invalid}</Alert>}
              {/* 5420:38180 names the empty-login field in full while its
                  error shows; it drops back with the error (first key). */}
              <LoginField
                label={signinErrors.login ? COPY.labels.loginError : undefined}
                value={login}
                onChange={(v) => {
                  setLogin(v);
                  if (signinErrors.login) setSigninErrors((p) => ({ ...p, login: undefined }));
                }}
                error={signinErrors.login}
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
              />
              <div className="flex h-[22px] justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setForgotError(undefined);
                    goTo("forgot");
                  }}
                  className="cursor-pointer whitespace-nowrap text-[14px] font-medium leading-[22px] text-neutral-800 underline decoration-from-font [text-underline-position:from-font] transition-colors duration-200 hover:text-brand"
                >
                  {COPY.signin.forgot}
                </button>
              </div>
              <WideButton type="submit" disabled={busy}>
                {COPY.signin.submit}
              </WideButton>
              <GoogleButton label={COPY.signin.google} />
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
        <form onSubmit={submitForgot} noValidate className="flex flex-col gap-6 lg:gap-10">
          <TitleBlock title={COPY.forgot.title} subtitle={COPY.forgot.subtitle} />
          <LoginField
            value={login}
            onChange={(v) => {
              setLogin(v);
              if (forgotError) setForgotError(undefined);
            }}
            error={forgotError}
          />
          <WideButton type="submit" disabled={busy}>
            {COPY.forgot.submit}
          </WideButton>
        </form>
      )}

      {screen === "linkSent" && (
        <div className="flex flex-col gap-6 lg:gap-10">
          {timerOn ? (
            <>
              <SuccessTitle
                title={
                  <>
                    {/* The layer ends line 1 with a space before the
                        break and Figma centres it with that space; an
                        NBSP survives the line end, so the line sits 3 px
                        left like the master (ctx 5420-38217). */}
                    {COPY.linkSent.titleTimer[0]}&nbsp;
                    <br />
                    {COPY.linkSent.titleTimer[1]}
                  </>
                }
                body={COPY.linkSent.body}
              />
              {/* 5410:64934: #f8f8f8 r24 p-16, 14/22 Medium #343435 with
                  the time in Bold; on the 436-px column the three runs
                  sit 4 px apart on one line (flex, so the space below
                  is not rendered). Phones get one wrapping sentence:
                  «...через 0:59.» with the time and dot kept together. */}
              <p
                data-countdown
                className="w-full rounded-3xl bg-bg-subtle p-4 text-[14px] font-medium leading-[22px] text-neutral-800 lg:flex lg:flex-wrap lg:items-center lg:gap-1"
              >
                <span className="lg:whitespace-nowrap">{COPY.linkSent.timer}</span>{" "}
                <span className="whitespace-nowrap font-bold">{formatTimer(secondsShown)}</span>
                <span>.</span>
              </p>
              <WideButton variant="outlinedDark" onClick={() => goTo("signin")} data-autofocus>
                {COPY.linkSent.back}
              </WideButton>
            </>
          ) : (
            <>
              <SuccessTitle title={COPY.linkSent.titleAgain} body={COPY.linkSent.body} />
              <div className="flex flex-col gap-6">
                <WideButton onClick={resendLink} disabled={busy} data-autofocus>
                  {COPY.linkSent.again}
                </WideButton>
                <WideButton variant="outlinedDark" onClick={() => goTo("signin")}>
                  {COPY.linkSent.back}
                </WideButton>
              </div>
            </>
          )}
        </div>
      )}

      {screen === "setPassword" && (
        <form onSubmit={submitNewPassword} noValidate className="flex flex-col gap-6 lg:gap-10">
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
            />
            <PasswordField
              label={COPY.labels.repeat}
              value={newPassword.repeat}
              onChange={editNewPassword("repeat")}
              error={newPasswordErrors.repeat}
              hintId={mismatchHintId}
              name="confirm-password"
              autoComplete="new-password"
            />
          </div>
          <WideButton type="submit" disabled={busy}>
            {COPY.setPassword.submit}
          </WideButton>
        </form>
      )}

      {screen === "signup" && (
        <form onSubmit={submitSignup} noValidate className="flex flex-col gap-6 lg:gap-10">
          <TitleBlock title={COPY.signup.title} subtitle={COPY.signup.subtitle} />
          <div className="flex flex-col gap-6 lg:gap-10">
            <div className="flex flex-col gap-6">
              {signupAlert && <Alert>{COPY.requestFailed}</Alert>}
              <TextField
                label={COPY.labels.firstName}
                value={signup.firstName}
                onChange={editSignup("firstName")}
                error={signupErrors.firstName}
                name="given-name"
                autoComplete="given-name"
                muiHelper
              />
              <TextField
                label={COPY.labels.lastName}
                value={signup.lastName}
                onChange={editSignup("lastName")}
                error={signupErrors.lastName}
                name="family-name"
                autoComplete="family-name"
                muiHelper
              />
              <LoginField
                value={signup.login}
                onChange={editSignup("login")}
                error={signupErrors.login}
                helper={COPY.signup.loginHelper}
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
              />
              <PasswordField
                label={COPY.labels.repeat}
                value={signup.repeat}
                onChange={editSignup("repeat")}
                error={signupErrors.repeat}
                hintId={mismatchHintId}
                name="confirm-password"
                autoComplete="new-password"
              />
            </div>
            <div className="flex flex-col gap-6">
              <WideButton type="submit" disabled={busy}>
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

      {screen === "account" && user && (
        <AccountScreen user={user} onSignOut={signOut} onLeave={closeAuth} />
      )}
    </div>
  );
}

// Signed-in summary in the drawer's own typography. A partner's full
// profile is the «Мій профіль» page, linked first; «Вийти» stays here for
// everyone (no other screen signs out). A retail customer has no company
// and no profile page, so only the contact rows and «Вийти» show. The
// two buttons stack 24 apart like «send again» (5420:38222).
function AccountScreen({
  user,
  onSignOut,
  onLeave,
}: {
  user: Account;
  onSignOut: () => void;
  onLeave: () => void;
}) {
  // «м. Київ» already names the city: the city joins the region label
  // only when it is a different place («Львівська область, Дрогобич»).
  const { region, city } = user.company;
  const companyRows: [string, string][] =
    user.type === "b2b"
      ? [
          ["Компанія", user.company.name],
          ["ЄДРПОУ", user.company.edrpou],
          [
            "Регіон",
            [REGIONS.find((r) => r.value === region)?.label, city !== region ? city : null]
              .filter(Boolean)
              .join(", "),
          ],
          [
            "Роль",
            `${roleLabel(user.person.role)}${user.person.position ? `, ${user.person.position}` : ""}`,
          ],
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
          <img src={user.logo} alt="Лого компанії" className="size-16 rounded-xl object-cover" />
        )}
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-[14px] leading-6 text-neutral-500">{label}</span>
            <span className="text-body-sm font-medium text-neutral-900">{value || "-"}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-6">
        {user.type === "b2b" && (
          <div className="flex w-full">
            <Button
              href={PROFILE_HREF}
              size="small"
              variant="accent"
              fullWidth
              className={PHONE_PILL}
              onClick={onLeave}
              data-autofocus
            >
              Перейти в профіль
            </Button>
          </div>
        )}
        <WideButton
          variant="outlinedDark"
          onClick={onSignOut}
          data-autofocus={user.type !== "b2b" || undefined}
        >
          Вийти
        </WideButton>
      </div>
    </div>
  );
}

// --- shell -------------------------------------------------------------

export function AuthDrawer() {
  const { open, openCount, entry, user, resetToken, closeAuth } = useAuth();
  const asideRef = useRef<HTMLElement | null>(null);
  // The 930-px master panel is zoomed to the space under the header on
  // shorter desktop windows (the cart drawer's rule), never scaled up.
  const fit = useFitZoom(DRAWER_DESIGN_H, DESKTOP_HEADER_H);
  const fitted = fit < 1;

  useModalBehavior({
    open,
    onClose: closeAuth,
    // Focus lands on the dialog (no field, no control focused): the
    // master's rest state on every screen.
    container: asideRef,
    inertSelector: "body > header",
  });

  const initial = entryScreen(entry, Boolean(user));

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
        data-auth-drawer
        style={{
          top: "var(--site-header-h, 92px)",
          ...(fitted ? { width: DRAWER_W * fit } : undefined),
        }}
        className={`absolute bottom-0 right-0 flex w-[576px] max-w-[92vw] flex-col overflow-hidden outline-none transition-[translate] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[translate] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* The sheet in the master's px; on short windows it is the
            576 x 930 design box zoomed into the space under the header
            (CSS zoom keeps text crisp and hit-testing exact). */}
        <div
          data-auth-sheet
          style={{
            ...DRAWER_STYLE,
            ...(fitted ? { zoom: fit, width: DRAWER_W, height: DRAWER_DESIGN_H, flex: "none" } : undefined),
          }}
          className="scrollbar-hidden relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain rounded-tl-[32px] border border-stroke-default bg-white px-6 pb-6 pt-14 lg:rounded-tl-[48px] lg:pb-[39px] lg:pl-[59px] lg:pr-[79px] lg:pt-[59px]"
        >
          {/* Phones only (see the header note): no frame draws it. */}
          <button
            type="button"
            onClick={closeAuth}
            aria-label="Закрити"
            className="absolute right-4 top-4 z-[1] flex size-8 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 hover:text-brand lg:hidden"
          >
            <XMarkIcon className="size-8" />
          </button>
          {/* Remounts on every open so each visit starts at the entry
              screen with empty fields. */}
          <Screens key={openCount} initial={initial} resetToken={resetToken} />
        </div>
      </aside>
    </div>
  );
}
