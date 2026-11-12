"use client";

import { useState, type FormEvent } from "react";
import { adminApi } from "../lib/api";
import { Button } from "../ui/Button";
import { RadioGroup } from "../ui/Checkbox";
import { PasswordInput } from "../ui/Input";
import { Modal, ModalFooter } from "../ui/Modal";
import { toast, toastError } from "../ui/Toast";
import { reloadCustomer } from "./cache";
import { CUSTOMER_ERRORS, OneTimeSecret, accountName, fieldErrors } from "./parts";
import { CUSTOMER_PASSWORD_MIN, type CustomerDetail, type SetCustomerPasswordAnswer } from "./types";

// "Скинути пароль": the dialog is the question itself (it says what
// happens and asks how), then shows a generated password once. A typed
// password is not shown back: the manager already knows it.
//
// Rendered with a new `key` each time it opens, so its state starts fresh.

type Mode = "generate" | "manual";

const MODES = [
  { value: "generate" as const, label: "Згенерувати пароль", hint: "Надійний пароль покажемо один раз: передайте його людині." },
  { value: "manual" as const, label: "Ввести самостійно", hint: "Якщо пароль уже погоджено з людиною." },
];

export function PasswordModal({ customer, open, onClose }: { customer: CustomerDetail; open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("generate");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<string | null>(null);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (busy) return;
    if (mode === "manual" && password.length < CUSTOMER_PASSWORD_MIN) {
      setError(`Щонайменше ${CUSTOMER_PASSWORD_MIN} символів`);
      return;
    }
    setBusy(true);
    const result = await adminApi<SetCustomerPasswordAnswer>(`/customers/${encodeURIComponent(customer.id)}/password`, {
      method: "POST",
      body: mode === "manual" ? { password } : {},
    });
    setBusy(false);
    if (!result.ok) {
      const fields = fieldErrors(result, { password: { short: `Щонайменше ${CUSTOMER_PASSWORD_MIN} символів` } });
      if (fields.password) setError(fields.password);
      toastError(result, CUSTOMER_ERRORS);
      return;
    }
    reloadCustomer(customer.id);
    if (result.data.password) {
      setShown(result.data.password);
      toast.success("Новий пароль встановлено, усі сеанси завершено");
      return;
    }
    toast.success("Пароль змінено, усі сеанси завершено");
    onClose();
  };

  if (shown) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        closeOnScrim={false}
        title="Новий пароль"
        description={`Передайте пароль людині: ${accountName(customer)} увійде з ним на сайт.`}
        footer={<Button onClick={onClose}>Готово</Button>}
      >
        <OneTimeSecret login={customer.login} password={shown} />
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Скинути пароль"
      description="Старий пароль перестане діяти, а людина вийде з усіх пристроїв. Увійти можна буде лише з новим паролем."
      footer={<ModalFooter onCancel={onClose} confirmLabel="Скинути пароль" form="customer-password-form" busy={busy} />}
    >
      <form id="customer-password-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <RadioGroup
          aria-label="Як задати пароль"
          value={mode}
          onChange={(next) => {
            setMode(next);
            setError(null);
          }}
          options={MODES}
          variant="tiles"
        />
        {mode === "manual" && (
          <PasswordInput
            label="Новий пароль"
            value={password}
            onChange={(next) => {
              setPassword(next);
              setError(null);
            }}
            error={error}
            hint={`Щонайменше ${CUSTOMER_PASSWORD_MIN} символів`}
            generate
            autoFocus
          />
        )}
      </form>
    </Modal>
  );
}
