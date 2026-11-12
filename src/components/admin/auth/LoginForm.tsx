"use client";

import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useId, useState, type FormEvent } from "react";
import { api } from "@/lib/api/client";
import { ADMIN_API, errorMessage } from "../lib/api";
import type { StaffMe } from "../lib/permissions";
import { AUTH_ERROR, AUTH_INPUT, AUTH_LABEL, AUTH_SUBMIT, AuthFrame } from "./AuthFrame";

// The sign-in form of the panel. `next` is where to go afterwards (a path
// under /admin, checked on the server).

const OWN_ERRORS = {
  invalid: "Невірний e-mail або пароль.",
  empty: "Введіть e-mail і пароль.",
  "bad-request": "Введіть e-mail і пароль.",
};

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) {
      setError(OWN_ERRORS.empty);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await api<{ me: StaffMe }>(`${ADMIN_API}/auth/sign-in`, {
      body: { email: email.trim(), password, remember },
    });
    if (!result.ok) {
      setBusy(false);
      setError(errorMessage(result, OWN_ERRORS));
      return;
    }
    // A full load: the server renders the panel with the new session.
    window.location.assign(result.data.me.mustChangePassword ? "/admin/password" : next);
  };

  return (
    <AuthFrame title="Вхід до панелі" lead="Тільки для співробітників Binar 2000.">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div>
          <label htmlFor={emailId} className={AUTH_LABEL}>
            E-mail
          </label>
          <input
            id={emailId}
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={AUTH_INPUT}
          />
        </div>
        <div>
          <label htmlFor={passwordId} className={AUTH_LABEL}>
            Пароль
          </label>
          <div className="relative">
            <input
              id={passwordId}
              type={show ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={`${AUTH_INPUT} pr-14`}
            />
            <button
              type="button"
              onClick={() => setShow((value) => !value)}
              aria-label={show ? "Сховати пароль" : "Показати пароль"}
              aria-pressed={show}
              className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-neutral-500 transition-colors duration-200 hover:bg-bg-subtle hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {show ? (
                <EyeSlashIcon aria-hidden className="size-5" strokeWidth={1.7} />
              ) : (
                <EyeIcon aria-hidden className="size-5" strokeWidth={1.7} />
              )}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3 text-[14px] leading-5 text-neutral-800">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="size-[18px] cursor-pointer rounded-[5px] accent-[#f85a0b]"
          />
          {"Запам'ятати мене на цьому пристрої"}
        </label>

        {error && (
          <p id={errorId} role="alert" className={AUTH_ERROR}>
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className={AUTH_SUBMIT}>
          {busy ? "Входимо" : "Увійти"}
        </button>
      </form>
    </AuthFrame>
  );
}
