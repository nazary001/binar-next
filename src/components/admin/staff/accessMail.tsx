"use client";

import { useState } from "react";
import { MAIL_ERROR_LABELS, type MailSettingsAnswer } from "../mail/types";
import { useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Switch } from "../ui/Checkbox";
import { Modal, ModalFooter } from "../ui/Modal";
import { Note } from "./shared";
import type { StaffAccessMailAnswer } from "./types";

// "Надіслати доступ на e-mail": a generated password (a new account, a
// reset) can also go to the person by mail. The switch is offered only
// while the site really sends mail (a provider is set up on the mail
// page); the one-time password is shown on screen either way, and the note
// under it says whether the mail went out.

// Whether the site sends mail now. Asked only of a role that may read the
// mail settings; a refusal (403) or a failure reads as "no", and the
// dialogs then look as they did before the option existed.
export function useMailReady(): boolean {
  const { can } = useStaff();
  const settings = useAdminQuery<MailSettingsAnswer>(can("integrations.view") ? "/integrations/mail/settings" : null);
  return settings.data?.status?.configured === true;
}

export function AccessMailSwitch({ checked, onChange, hint }: { checked: boolean; onChange: (next: boolean) => void; hint: string }) {
  return <Switch checked={checked} onChange={onChange} label="Надіслати доступ на e-mail" hint={hint} />;
}

// The words of a refusal, as the mail page shows them.
function mailErrorWords(code: string | undefined): string {
  if (!code) return "сервіс надсилання не відповів";
  const known = MAIL_ERROR_LABELS[code];
  if (known) return known.charAt(0).toLowerCase() + known.slice(1);
  return code.replace(/^http-(\d{3}):\s*/, "сервіс відповів $1: ");
}

// Above the one-time password: what happened to the mail. Nothing when it
// was not asked for.
export function AccessMailNote({ email, mail }: { email: string; mail: StaffAccessMailAnswer | undefined }) {
  if (!mail || mail.mailed === undefined) return null;
  if (mail.mailed) return <Note tone="info">Лист із паролем і адресою для входу надіслано на {email}.</Note>;
  return (
    <Note tone="warning">
      Лист не надіслано: {mailErrorWords(mail.mailError)}. Передайте пароль людині самостійно.
    </Note>
  );
}

// "Скинути пароль?" with the switch: the question the drawer asks through
// confirmDialog when the site sends no mail, with the same words and the
// same red button. Rendered with a new `key` each time it opens, so the
// switch starts off.
export function ResetPasswordModal({
  open,
  name,
  email,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  name: string;
  email: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (notify: boolean) => void;
}) {
  const [notify, setNotify] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onCancel}
      busy={busy}
      role="alertdialog"
      size="sm"
      title="Скинути пароль?"
      description={`${name} вийде з усіх пристроїв, а поточний пароль перестане діяти. Ми згенеруємо тимчасовий пароль і покажемо його один раз.`}
      footer={<ModalFooter onCancel={onCancel} onConfirm={() => onConfirm(notify)} confirmLabel="Скинути пароль" tone="danger" busy={busy} />}
    >
      <AccessMailSwitch checked={notify} onChange={setNotify} hint={`Лист із новим тимчасовим паролем піде на ${email}.`} />
    </Modal>
  );
}
