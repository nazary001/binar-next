// "Change password" of the profile page: the copy and the field rules. Pure
// (no browser or store imports), so POST /api/account/password checks a
// request with exactly the rules and messages the modal shows; api.ts
// re-exports everything for the page.
import { PASSWORD_MIN } from "@/components/auth/data";

export type PasswordFields = { current: string; next: string; repeat: string };
export type PasswordErrors = Partial<Record<keyof PasswordFields, string>>;

export const PASSWORD_COPY = {
  title: "Змінити пароль",
  current: "Поточний пароль",
  next: "Новий пароль",
  repeat: "Повторіть пароль",
  submit: "Зберегти пароль",
  done: "Пароль змінено",
  errors: {
    current: "Введіть поточний пароль",
    wrong: "Неправильний поточний пароль",
    next: "Введіть новий пароль",
    short: `Пароль має містити щонайменше ${PASSWORD_MIN} символів`,
    repeat: "Повторіть пароль",
    mismatch: "Паролі не збігаються",
  },
} as const;

export function validatePassword(f: PasswordFields): PasswordErrors {
  const e = PASSWORD_COPY.errors;
  return {
    current: f.current ? undefined : e.current,
    next: !f.next ? e.next : f.next.length < PASSWORD_MIN ? e.short : undefined,
    repeat: !f.repeat ? e.repeat : f.repeat !== f.next ? e.mismatch : undefined,
  };
}
