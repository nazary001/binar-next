"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { REGIONS, ROLES, formatPhone, isValidEmail, roleLabel, type Account } from "@/components/auth/data";
import { EyeIcon, EyeSlashIcon } from "@/components/auth/icons";
import { TextField } from "@/components/checkout/fields";
import { Modal718, ModalActions, StatusPill } from "@/components/platform/ui";
import { CABINET_SECTION_TITLE } from "@/components/platform/ui/CabinetPageHead";
import { Button } from "@/components/ui/Button";
import { usePhone } from "@/components/ui/useMediaQuery";
import {
  PASSWORD_COPY,
  changePassword,
  saveCompany,
  savePerson,
  type PasswordErrors,
  type PasswordFields,
} from "./api";
import { COPY, PHONE_ERROR, isValidEdrpou, nationalPhone } from "./data";
import { CardTitle, SubmitButton } from "./shared";

// The account part of «Мій профіль» (4868:31376 / 4868:30958): «Ваші
// дані» in the left column, «Дані компанії» and «Безпека» at the top of
// the 1144 card. Every field is the outlined-small <TextField> (46 tall,
// 1-px #d2d2d2 ring, r24) - empty in the frames, so here the label floats
// once the account has a value. Edits save when the field loses focus
// (the masters have no save button); an invalid value keeps its draft
// and shows the field's helper line instead.
// Phones (the "Дані" group, profile spec 2.3): `onSaved` reports a real
// save (the page shows the "Збережено" toast); Enter moves to the next
// enabled field of the same card (the last one closes the keyboard),
// which also saves through the blur.

// Enter -> the next enabled input of the same <section>, or blur on the
// last one.
function focusNextField(e: KeyboardEvent<HTMLInputElement>) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const input = e.currentTarget;
  const scope = input.closest("section");
  const inputs = scope ? [...scope.querySelectorAll<HTMLInputElement>("input:not([disabled]):not([type=file])")] : [];
  const next = inputs[inputs.indexOf(input) + 1];
  if (next) next.focus();
  else input.blur();
}

function AutoSaveField({
  label,
  value,
  onSave,
  validate,
  type,
  inputMode,
  autoComplete,
  maxLength,
  className,
  onSaved,
  last = false,
}: {
  label: string;
  // The stored value as the field shows it (parents key the field by it,
  // so a save elsewhere resets the draft).
  value: string;
  onSave: (draft: string) => void;
  validate?: (draft: string) => string | undefined;
  type?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  autoComplete?: string;
  maxLength?: number;
  className?: string;
  onSaved?: () => void;
  // The card's last field: the keyboard's Enter key reads "done".
  last?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | undefined>();
  return (
    <TextField
      label={label}
      value={draft}
      type={type}
      inputMode={inputMode}
      autoComplete={autoComplete}
      maxLength={maxLength}
      onChange={(v) => {
        setDraft(v);
        if (error) setError(undefined);
      }}
      onBlur={() => {
        if (draft.trim() === value.trim()) return;
        const message = validate?.(draft);
        if (message) {
          setError(message);
          return;
        }
        onSave(draft.trim());
        onSaved?.();
      }}
      onKeyDown={focusNextField}
      enterKeyHint={last ? "done" : "next"}
      error={error}
      muiHelper
      className={className}
    />
  );
}

const required = (message: string) => (v: string) => (v.trim() ? undefined : message);

// The «Роль» field shows the sign-up role's label (auth ROLES) and saves
// a typed label back as its key, anything else as free text (roleLabel
// falls back to the text).
function roleValue(text: string): string {
  const t = text.trim().toLowerCase();
  return ROLES.find((r) => r.label.toLowerCase() === t || r.value === t)?.value ?? text.trim();
}

// «Ваші дані» - each tab draws its own frame's card (the Empty copies
// repeat the split):
//   Співробітники 4868:31397 / 4929:64685 (364 x 356): white r24, gap 16;
//     head h-60 px-24 pt-24 pb-8 with Title/Medium 22/28 and the brand
//     «Адміністратор» pill (sm, 122 x 30); four fields 316 wide (ПІБ,
//     Посада, Номер телефону, Електронна пошта), gap 24, pb-24;
//   Контрагенти 4868:30978 / 4929:64216 (364 x 426): the same head with
//     the title only and five fields - «Роль» (4868:30983) between ПІБ
//     and Посада.
// Phones (variant "account"): one fixed card for every group - white r32,
// the title (Title Large) with the pill (wrapping under it at 320) AND the
// "Роль" field.
export function YouCard({
  account,
  variant,
  onSaved,
}: {
  account: Account;
  variant: "counterparties" | "employees" | "account";
  onSaved?: () => void;
}) {
  const p = account.person;
  const phone = variant === "account";
  const withRole = variant !== "employees";
  const withPill = variant !== "counterparties";
  return (
    <section
      aria-labelledby="profile-you"
      data-profile="you-card"
      className={`flex flex-col gap-4 overflow-clip bg-white ${phone ? "rounded-[32px]" : "rounded-3xl"}`}
    >
      <div
        className={
          phone
            ? "flex flex-wrap items-center gap-x-4 gap-y-2 px-6 pb-2 pt-6"
            : "flex items-start justify-between gap-4 px-6 pb-2 pt-6 lg:h-[60px]"
        }
      >
        <h2
          id="profile-you"
          className={phone ? CABINET_SECTION_TITLE : "text-[22px] font-bold leading-7 tracking-[-0.44px] text-neutral-900"}
        >
          {COPY.you.title}
        </h2>
        {withPill && (
          <StatusPill tone="brand" size="sm">
            {COPY.you.role}
          </StatusPill>
        )}
      </div>
      <div className="flex flex-col gap-6 px-6 pb-6">
        <AutoSaveField
          key={`n:${p.fullName}`}
          label={COPY.you.fullName}
          value={p.fullName}
          autoComplete="name"
          validate={required(COPY.errors.fullName)}
          onSave={(v) => savePerson({ fullName: v })}
          onSaved={onSaved}
        />
        {withRole && (
          <AutoSaveField
            key={`r:${p.role}`}
            label={COPY.you.roleField}
            value={roleLabel(p.role)}
            onSave={(v) => savePerson({ role: roleValue(v) })}
            onSaved={onSaved}
          />
        )}
        <AutoSaveField
          key={`p:${p.position}`}
          label={COPY.you.position}
          value={p.position}
          autoComplete="organization-title"
          onSave={(v) => savePerson({ position: v })}
          onSaved={onSaved}
        />
        <AutoSaveField
          key={`t:${p.phone}`}
          label={COPY.you.phone}
          value={formatPhone(p.phone)}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          validate={(v) => (nationalPhone(v) ? undefined : PHONE_ERROR)}
          onSave={(v) => savePerson({ phone: nationalPhone(v) ?? v })}
          onSaved={onSaved}
        />
        <AutoSaveField
          key={`e:${p.email}`}
          label={COPY.you.email}
          value={p.email}
          type="email"
          inputMode="email"
          autoComplete="email"
          validate={(v) => (isValidEmail(v) ? undefined : COPY.errors.email)}
          onSave={(v) => savePerson({ email: v.toLowerCase() })}
          onSaved={onSaved}
          last
        />
      </div>
    </section>
  );
}

// Two 535-px fields per row at 1710 (flex-wrap gap 24 in a 1096 row,
// 2 px left over): each takes half of the row minus 26.
const HALF = "w-full lg:w-[calc((100%-26px)/2)] lg:shrink-0";

// «Область» is a plain outlined TextField in both page frames (4868:30996
// / 4868:31416: no chevron, no menu), so it is typed like «Місто»: the
// stored region key (auth REGIONS, «Київ») shows as its label («м.
// Київ»), and a typed label or bare name («Львівська») is saved back as
// the key; anything else is kept as typed.
function regionLabel(value: string): string {
  return REGIONS.find((r) => r.value === value)?.label ?? value;
}

function regionValue(text: string): string {
  const t = text.trim().replace(/\s+/g, " ").toLowerCase();
  return REGIONS.find((r) => r.label.toLowerCase() === t || r.value.toLowerCase() === t)?.value ?? text.trim();
}

// «Дані компанії» - 4868:30988 (1144 x 220): head 80, then the 2 x 2
// fields (gap 24, px-24), pb-24.
export function CompanyBlock({ account, onSaved }: { account: Account; onSaved?: () => void }) {
  const c = account.company;
  return (
    <section aria-labelledby="profile-company" data-profile="company" className="flex flex-col pb-6">
      <CardTitle id="profile-company">{COPY.company.title}</CardTitle>
      <div className="flex flex-wrap gap-6 px-6">
        <AutoSaveField
          key={`cn:${c.name}`}
          label={COPY.company.name}
          value={c.name}
          autoComplete="organization"
          validate={required("Введіть назву компанії")}
          onSave={(v) => saveCompany({ name: v })}
          onSaved={onSaved}
          className={HALF}
        />
        <AutoSaveField
          key={`ce:${c.edrpou}`}
          label={COPY.company.edrpou}
          value={c.edrpou}
          inputMode="numeric"
          maxLength={8}
          validate={(v) => (isValidEdrpou(v) ? undefined : "ЄДРПОУ складається з 8 цифр")}
          onSave={(v) => saveCompany({ edrpou: v })}
          onSaved={onSaved}
          className={HALF}
        />
        <AutoSaveField
          key={`cr:${c.region}`}
          label={COPY.company.region}
          value={regionLabel(c.region)}
          autoComplete="address-level1"
          onSave={(v) => saveCompany({ region: regionValue(v) })}
          onSaved={onSaved}
          className={HALF}
        />
        <AutoSaveField
          key={`cc:${c.city}`}
          label={COPY.company.city}
          value={c.city}
          autoComplete="address-level2"
          onSave={(v) => saveCompany({ city: v })}
          onSaved={onSaved}
          last
          className={HALF}
        />
      </div>
    </section>
  );
}

// «Безпека» - 4868:31418 (1144 x 150): head 80, then «Логін» (535,
// disabled with the login as value, 4130:38613) and a row (flex-1, gap
// 26) of «Пароль» (disabled, «********») + Button/Small outlined
// «Змінити пароль» (169 x 42, centred on the 46-px row), pb-24.
// Frame conflict: the Контрагенти frame's «Пароль» (4868:31006) is the
// empty State=Default instance; Співробітники 4868:31426 draws it
// disabled with «********» (ctx 4868-31380). Both tabs keep the disabled
// one: the password only changes through «Змінити пароль», an enabled
// empty field would accept typing that goes nowhere.
// Phones: `onNotice` gets "Пароль змінено" (the page toast) instead of the
// grey helper under "Пароль"; 48 from the last field to the button.
export function SecurityBlock({ account, onNotice }: { account: Account; onNotice?: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <section aria-labelledby="profile-security" data-profile="security" className="flex flex-col pb-6">
      <CardTitle id="profile-security">{COPY.security.title}</CardTitle>
      <div className="flex flex-col gap-6 px-6 lg:flex-row lg:items-start">
        <TextField label={COPY.security.login} value={account.login} onChange={() => {}} disabled className={HALF} />
        <div className="flex min-w-0 flex-1 flex-col gap-6 sm:flex-row sm:items-start sm:gap-[26px]">
          <TextField
            label={COPY.security.password}
            value="********"
            onChange={() => {}}
            disabled
            helper={notice ?? undefined}
            muiHelper
            className="min-w-0 flex-1"
          />
          <Button
            type="button"
            size="small"
            variant="outlinedDark"
            onClick={() => {
              setNotice(null);
              setOpen(true);
            }}
            className="self-start max-lg:mt-6 sm:mt-[2px]"
          >
            {COPY.security.change}
          </Button>
        </div>
      </div>
      <ChangePasswordModal
        open={open}
        onClose={() => setOpen(false)}
        onDone={() => {
          setOpen(false);
          if (onNotice) onNotice(PASSWORD_COPY.done);
          else setNotice(PASSWORD_COPY.done);
        }}
      />
    </section>
  );
}

// «Змінити пароль» - not drawn in Figma: the profile modal shell (718,
// Caption/Large title + close) with the three password fields of the
// account drawer and a full-width Button/Large.
function ChangePasswordModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  return (
    <Modal718 open={open} onClose={onClose} title={PASSWORD_COPY.title} align="top" className="[--field-surface:#fff]">
      {open && <ChangePasswordForm onDone={onDone} />}
    </Modal718>
  );
}

// Phone-only show / hide toggle of a password field (the account drawer's
// eye, auth/AuthDrawer PasswordField): desktop passes no `trailing`.
function EyeToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onToggle}
      aria-label="Показати пароль"
      aria-pressed={visible}
      className="-m-2.5 flex size-11 cursor-pointer items-center justify-center text-neutral-900 transition-colors duration-200 motion-reduce:transition-none active:text-brand"
    >
      {visible ? <EyeSlashIcon className="size-6" /> : <EyeIcon className="size-6" />}
    </button>
  );
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const phone = usePhone();
  const [shown, setShown] = useState<Partial<Record<keyof PasswordFields, boolean>>>({});
  const [fields, setFields] = useState<PasswordFields>({ current: "", next: "", repeat: "" });
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [busy, setBusy] = useState(false);
  const set = (key: keyof PasswordFields) => (v: string) => {
    setFields((f) => ({ ...f, [key]: v }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const submit = async () => {
    setBusy(true);
    const result = await changePassword(fields);
    setBusy(false);
    if (result.ok) onDone();
    else setErrors(result.errors);
  };
  const complete = Boolean(fields.current && fields.next && fields.repeat);
  const row = (key: keyof PasswordFields, label: string, autoComplete: string): ReactNode => (
    <TextField
      label={label}
      type={phone && shown[key] ? "text" : "password"}
      value={fields[key]}
      onChange={set(key)}
      error={errors[key]}
      autoComplete={autoComplete}
      muiHelper
      trailing={
        phone ? (
          <EyeToggle visible={Boolean(shown[key])} onToggle={() => setShown((v) => ({ ...v, [key]: !v[key] }))} />
        ) : undefined
      }
    />
  );
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (complete && !busy) void submit();
      }}
    >
      {row("current", PASSWORD_COPY.current, "current-password")}
      {row("next", PASSWORD_COPY.next, "new-password")}
      {row("repeat", PASSWORD_COPY.repeat, "new-password")}
      <div className="lg:pt-4">
        <ModalActions>
          <SubmitButton type="submit" disabled={!complete || busy}>
            {PASSWORD_COPY.submit}
          </SubmitButton>
        </ModalActions>
      </div>
    </form>
  );
}
