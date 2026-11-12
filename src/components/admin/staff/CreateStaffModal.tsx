"use client";

import { useState, type FormEvent } from "react";
import { adminApi } from "../lib/api";
import { OWNER_ROLE_ID } from "../lib/permissions";
import { invalidate } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal, ModalFooter } from "../ui/Modal";
import { Select, type SelectOption } from "../ui/Select";
import { toast } from "../ui/Toast";
import { AccessMailNote, AccessMailSwitch, useMailReady } from "./accessMail";
import { fieldCodes, toastStaffError } from "./messages";
import { withinActor } from "./rules";
import { OneTimePassword, signInAddress } from "./shared";
import {
  STAFF_EMAIL_MAX,
  STAFF_NAME_MAX,
  type RoleRow,
  type StaffAccessMailAnswer,
  type StaffCreateAnswer,
  type StaffCreateBody,
} from "./types";

// "Додати співробітника": name, e-mail and role, then the same dialog shows
// the generated password once, with the address to sign in at. The person
// signs in at /admin and is asked for an own password at once. While the
// site sends mail, a switch also sends the access to the person's e-mail.
//
// Rendered with a new `key` each time it opens, so its state starts fresh.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = { name?: string; email?: string; roleId?: string };
type Created = {
  id: string;
  name: string;
  roleName: string;
  email: string;
  password: string;
  signInUrl: string;
  mail: StaffAccessMailAnswer;
};

export function CreateStaffModal({
  open,
  onClose,
  roles,
  onOpenAccount,
}: {
  open: boolean;
  onClose: () => void;
  roles: RoleRow[] | undefined;
  onOpenAccount: (id: string) => void;
}) {
  const { me } = useStaff();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const mailReady = useMailReady();
  const [notify, setNotify] = useState(false);

  const meOwner = me.roleId === OWNER_ROLE_ID;
  const options: SelectOption<string>[] = (roles ?? []).map((role) => {
    const ownerOnly = !meOwner && role.id === OWNER_ROLE_ID;
    const beyond = !meOwner && !ownerOnly && !withinActor(me.roleId, me.permissions, role.permissions);
    return {
      value: role.id,
      label: role.name,
      hint: ownerOnly ? "Надати роль власника може лише власник" : beyond ? "Має права, яких немає у вашої ролі" : role.description || undefined,
      disabled: ownerOnly || beyond,
    };
  });
  const chosen = roles?.find((role) => role.id === roleId);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (busy) return;
    const next: Errors = {};
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanName) next.name = "Вкажіть ім'я";
    if (!cleanEmail) next.email = "Вкажіть e-mail";
    else if (!EMAIL.test(cleanEmail)) next.email = "Перевірте e-mail: схоже, в адресі помилка";
    if (!roleId) next.roleId = "Оберіть роль";
    setErrors(next);
    if (Object.keys(next).length > 0 || !roleId) return;

    setBusy(true);
    const body: StaffCreateBody = { name: cleanName, email: cleanEmail, roleId, ...(mailReady && notify ? { notify: true } : {}) };
    const result = await adminApi<StaffCreateAnswer>("/staff", { method: "POST", body });
    setBusy(false);
    if (!result.ok) {
      const fields = fieldCodes(result);
      if (fields.email === "taken" || result.error === "exists") {
        setErrors({ email: "Цей e-mail уже має акаунт у панелі" });
        return;
      }
      if (fields.email) {
        setErrors({ email: "Перевірте e-mail: схоже, в адресі помилка" });
        return;
      }
      if (fields.roleId) setErrors({ roleId: "Цієї ролі вже немає. Оберіть іншу." });
      toastStaffError(result);
      return;
    }
    const staff = result.data.staff;
    setCreated({
      id: staff.id,
      name: staff.name,
      roleName: staff.roleName,
      email: staff.email,
      password: result.data.password,
      signInUrl: signInAddress(),
      mail: { mailed: result.data.mailed, mailError: result.data.mailError },
    });
    invalidate("/staff");
    invalidate("/roles");
    toast.success("Акаунт створено");
  };

  if (created) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        closeOnScrim={false}
        title="Акаунт створено"
        description={`${created.name} (${created.roleName}) може увійти в панель із цими даними.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenAccount(created.id)}>
              Відкрити картку
            </Button>
            <Button onClick={onClose}>Готово</Button>
          </>
        }
      >
        {created.mail.mailed === undefined ? (
          <OneTimePassword email={created.email} password={created.password} signInUrl={created.signInUrl} />
        ) : (
          <div className="flex flex-col gap-4">
            <AccessMailNote email={created.email} mail={created.mail} />
            <OneTimePassword email={created.email} password={created.password} signInUrl={created.signInUrl} />
          </div>
        )}
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Додати співробітника"
      description="Панель згенерує тимчасовий пароль. При першому вході людина задасть власний."
      footer={<ModalFooter onCancel={onClose} confirmLabel="Створити акаунт" form="staff-create-form" busy={busy} />}
    >
      <form id="staff-create-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input
          label="Ім'я"
          value={name}
          onChange={(next) => {
            setName(next);
            setErrors((current) => ({ ...current, name: undefined }));
          }}
          error={errors.name}
          placeholder="Олена Коваль"
          maxLength={STAFF_NAME_MAX}
          autoComplete="off"
          required
        />
        <Input
          label="E-mail"
          type="email"
          value={email}
          onChange={(next) => {
            setEmail(next);
            setErrors((current) => ({ ...current, email: undefined }));
          }}
          error={errors.email}
          placeholder="olena@binar2000.com"
          hint="З ним людина входитиме в панель"
          maxLength={STAFF_EMAIL_MAX}
          autoComplete="off"
          required
        />
        <Select
          label="Роль"
          value={roleId}
          onChange={(next) => {
            setRoleId(next);
            setErrors((current) => ({ ...current, roleId: undefined }));
          }}
          options={options}
          placeholder="Оберіть роль"
          error={errors.roleId}
          hint={chosen ? chosen.description || "Без опису" : "Роль визначає, що людина бачитиме і що зможе змінювати"}
          required
        />
        {mailReady && (
          <AccessMailSwitch
            checked={notify}
            onChange={setNotify}
            hint="Лист із тимчасовим паролем і адресою для входу піде на цей e-mail. Пароль ми однаково покажемо тут один раз."
          />
        )}
      </form>
    </Modal>
  );
}
