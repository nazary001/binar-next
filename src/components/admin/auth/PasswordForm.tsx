"use client";

import { useId, useState, type FormEvent } from "react";
import { adminApi, errorMessage } from "../lib/api";
import { AUTH_ERROR, AUTH_INPUT, AUTH_LABEL, AUTH_SUBMIT, AuthFrame } from "./AuthFrame";

// The first thing a member of staff does with a generated password:
// replace it. Shown instead of the panel until it is done.

const MIN = 10;

const OWN_ERRORS = {
  current: "Поточний пароль введено невірно.",
  fields: `Новий пароль має містити щонайменше ${MIN} символів і відрізнятися від поточного.`,
};

export function PasswordForm({ name, forced }: { name: string; forced: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentId = useId();
  const nextId = useId();
  const repeatId = useId();
  const hintId = useId();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!current || !next) return setError("Заповніть усі поля.");
    if (next.length < MIN) return setError(`Новий пароль має містити щонайменше ${MIN} символів.`);
    if (next !== repeat) return setError("Паролі не збігаються.");
    if (next === current) return setError("Новий пароль має відрізнятися від поточного.");
    setBusy(true);
    setError(null);
    const result = await adminApi("/auth/password", { body: { current, next } });
    if (!result.ok) {
      setBusy(false);
      setError(errorMessage(result, OWN_ERRORS));
      return;
    }
    window.location.assign("/admin");
  };

  return (
    <AuthFrame
      title="Створіть свій пароль"
      lead={
        forced
          ? `${name}, зараз у вас тимчасовий пароль. Замініть його своїм, щоб відкрити панель.`
          : "Після зміни пароля інші ваші сеанси буде завершено."
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div>
          <label htmlFor={currentId} className={AUTH_LABEL}>
            {forced ? "Тимчасовий пароль" : "Поточний пароль"}
          </label>
          <input
            id={currentId}
            type="password"
            autoComplete="current-password"
            autoFocus
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            className={AUTH_INPUT}
          />
        </div>
        <div>
          <label htmlFor={nextId} className={AUTH_LABEL}>
            Новий пароль
          </label>
          <input
            id={nextId}
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            aria-describedby={hintId}
            className={AUTH_INPUT}
          />
          <p id={hintId} className="mt-1.5 text-[12px] leading-4 text-neutral-500">
            Щонайменше {MIN} символів. Довга фраза надійніша за короткий набір знаків.
          </p>
        </div>
        <div>
          <label htmlFor={repeatId} className={AUTH_LABEL}>
            Новий пароль ще раз
          </label>
          <input
            id={repeatId}
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(event) => setRepeat(event.target.value)}
            className={AUTH_INPUT}
          />
        </div>

        {error && (
          <p role="alert" className={AUTH_ERROR}>
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className={AUTH_SUBMIT}>
          {busy ? "Зберігаємо" : "Зберегти пароль"}
        </button>
      </form>
    </AuthFrame>
  );
}
