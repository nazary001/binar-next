"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { isValidEmail, phoneDigits } from "@/components/auth/data";
import { TextField } from "@/components/checkout/fields";
import {
  ConfirmModal,
  KebabMenu,
  MailIcon,
  Modal718,
  ModalActions,
  PhoneIcon,
  StatusPill,
  TableEmptyState,
} from "@/components/platform/ui";
import { Button } from "@/components/ui/Button";
import { inviteEmployee, removeEmployee, resendInvite, updateEmployee } from "./actions";
import {
  COPY,
  EMAIL_EXISTS_ERROR,
  PHONE_ERROR,
  formatEmployeePhone,
  inviteNote,
  inviteUrl,
  nationalPhone,
  type Employee,
} from "./data";
import { SubmitButton } from "./shared";

// «Співробітники» tab - Figma 4868:31433 inside the 1144 card: py-24;
// the section head (p-24: «Співробітники» + Button/Small «Запросити
// співробітника» 243 x 42) and the cards 4868:31439 (flex-wrap gap 24,
// px-24): 536 x 163 #f8f8f8 r24 cards of the set 4262:39231 (Default =
// active) / 4628:6563 (Variant2 = invited). Empty: the 200-px row
// 4990:72320 «Співробітників ще не запрошено» + Button 243 x 42.

// A minute clock for «Запрошення дійсне N год» (server snapshot 0 =
// nothing time-based in the server HTML).
function subscribeMinute(cb: () => void) {
  const id = window.setInterval(cb, 60_000);
  return () => window.clearInterval(id);
}
function useNow(): number {
  return useSyncExternalStore(
    subscribeMinute,
    () => Math.floor(Date.now() / 60_000) * 60_000,
    () => 0,
  );
}

// Card head: p-24, gap 16; the name (Title/Small ExtraBold 18/24 -2 %)
// over the position (Medium 14/24 #777779, gap 2) or the invited e-mail
// alone; right group (gap 12): the sm status pill + «more» (#777779,
// brand while its menu is open; menu 6 px under the glyph). Then the
// 0.5-px #d2d2d2 divider 24 px in from both sides, and the bottom row
// pt-16 pb-24 px-24: phone + mail (20-px glyphs, gap 10, Regular 14/24,
// 40 apart) or «Запрошення дійсне 48 год» + outlined Button/Small
// «Надіслати повторно» (justify-between). The master closes the card
// with an invisible 0.5-px divider; the invited variant is fixed at 163.
// Phones (no master): the 294-px card cannot give the name the 150-190
// px it needs next to the pill, so the head wraps - pill + «more» on
// the first line (pill left, glyph right), the name / e-mail full width
// under it, breaking instead of truncating.
function EmployeeCard({
  employee,
  now,
  onEdit,
  onRemove,
  onResend,
}: {
  employee: Employee;
  now: number;
  onEdit: () => void;
  onRemove: () => void;
  onResend: () => void;
}) {
  const invited = employee.status === "invited";
  const title = invited ? employee.email : employee.fullName;
  return (
    <article
      data-profile="employee-card"
      className="flex w-full flex-col overflow-visible rounded-3xl bg-bg-subtle lg:h-[163px] lg:w-[calc((100%-24px)/2)]"
    >
      <div className="flex min-h-0 flex-1 items-start gap-4 p-6 max-sm:flex-wrap max-sm:gap-y-3">
        <div className="flex min-w-0 flex-1 flex-col gap-[2px] max-sm:basis-full">
          <h3 className="text-[18px] font-extrabold leading-6 tracking-[-0.36px] text-neutral-900 max-sm:[overflow-wrap:anywhere] sm:truncate">
            {title}
          </h3>
          {!invited && employee.position && (
            <p className="text-[14px] font-medium leading-6 text-neutral-500 max-sm:[overflow-wrap:anywhere] sm:truncate">
              {employee.position}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3 max-sm:order-first max-sm:w-full max-sm:justify-between">
          <StatusPill tone={invited ? "blue" : "green"} size="sm">
            {invited ? COPY.employees.invited : COPY.employees.active}
          </StatusPill>
          <KebabMenu
            label={`Дії: ${title}`}
            items={[
              { key: "edit", label: COPY.employees.edit, onSelect: onEdit },
              { key: "remove", label: COPY.employees.remove, onSelect: onRemove },
            ]}
          />
        </div>
      </div>
      <div aria-hidden className="mx-6 h-[0.5px] shrink-0 bg-stroke-subtle" />
      {invited ? (
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 pb-6 pt-4">
          <p className="text-[14px] leading-6 text-neutral-900">{inviteNote(employee.invitedAt, now)}</p>
          <Button type="button" size="small" variant="outlinedDark" onClick={onResend}>
            {COPY.employees.resend}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-x-10 gap-y-2 px-6 pb-6 pt-4">
          {employee.phone && (
            <a
              href={`tel:+38${phoneDigits(employee.phone)}`}
              className="flex items-center gap-[10px] text-[14px] leading-6 text-neutral-900 transition-colors duration-200 hover:text-brand"
            >
              <PhoneIcon className="size-5 shrink-0" />
              {formatEmployeePhone(employee.phone)}
            </a>
          )}
          {employee.email && (
            <a
              href={`mailto:${employee.email}`}
              className="flex min-w-0 items-center gap-[10px] text-[14px] leading-6 text-neutral-900 transition-colors duration-200 hover:text-brand"
            >
              <MailIcon className="size-5 shrink-0" />
              <span className="truncate">{employee.email}</span>
            </a>
          )}
        </div>
      )}
      <div aria-hidden className="h-[0.5px] shrink-0" />
    </article>
  );
}

// «Запросити співробітника» 4868:31473 (718 x 633): Body/Large intro;
// the #f8f8f8 r24 link card (72-px head p-24 with «Посилання-запрошення»
// Title/Small, invisible 0.5-px dividers, the read-only link field
// (white/70, value 16/24 Medium) + outlined Button/Small «Копіювати»
// 129 x 42, gap 24, px-24 pb-24); 40 px lower «або надішліть на пошту»
// (Regular 16/24 #777779, centred) + 24 + the e-mail field; the submit
// stays grey until the e-mail is valid. An address that is already on
// the list (invited or active) is refused with a helper line instead of
// adding a second card («Надіслати повторно» on its card resends).
function InviteModal({
  open,
  token,
  taken,
  onClose,
  onInvite,
}: {
  open: boolean;
  token: string;
  // Lower-cased e-mails already on the list.
  taken: string[];
  onClose: () => void;
  onInvite: (email: string) => void;
}) {
  return (
    <Modal718
      open={open}
      onClose={onClose}
      title={COPY.invite.title}
      description={COPY.invite.text}
      className="[--field-surface:#fff]"
    >
      {open && <InviteForm token={token} taken={taken} onInvite={onInvite} />}
    </Modal718>
  );
}

function InviteForm({
  token,
  taken,
  onInvite,
}: {
  token: string;
  taken: string[];
  onInvite: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const link = inviteUrl(token);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${link}`);
      setCopied(true);
    } catch {
      // No clipboard permission: select the text so Ctrl+C works.
      const input = document.getElementById("profile-invite-link");
      if (input instanceof HTMLInputElement) input.select();
    }
  };
  const exists = taken.includes(email.trim().toLowerCase());
  const valid = isValidEmail(email) && !exists;
  return (
    <form
      className="flex flex-col gap-10"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onInvite(email);
      }}
    >
      <div data-profile="invite-card" className="flex flex-col overflow-clip rounded-3xl bg-bg-subtle">
        <div className="flex h-[72px] items-start p-6">
          <p className="text-[18px] font-extrabold leading-6 tracking-[-0.36px] text-neutral-900">{COPY.invite.link}</p>
        </div>
        <div aria-hidden className="h-[0.5px]" />
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-start sm:gap-6">
          <input
            id="profile-invite-link"
            readOnly
            value={link}
            aria-label={COPY.invite.link}
            onFocus={(e) => e.currentTarget.select()}
            className="h-[46px] w-full min-w-0 rounded-3xl sm:w-auto sm:flex-1 border border-stroke-subtle bg-white/70 px-6 text-[16px] font-medium leading-6 tracking-[0.15px] text-neutral-900 outline-none focus:border-brand"
          />
          <Button
            type="button"
            size="small"
            variant="outlinedDark"
            onClick={() => void copy()}
            className="self-start"
            aria-live="polite"
          >
            {copied ? COPY.invite.copied : COPY.invite.copy}
          </Button>
        </div>
        <div aria-hidden className="h-[0.5px]" />
      </div>
      <div className="flex flex-col gap-6">
        <p className="text-center text-[16px] leading-6 text-neutral-500">{COPY.invite.or}</p>
        <TextField
          label={COPY.invite.email}
          value={email}
          onChange={setEmail}
          type="email"
          inputMode="email"
          autoComplete="email"
          error={exists ? EMAIL_EXISTS_ERROR : undefined}
          muiHelper
        />
      </div>
      <SubmitButton type="submit" disabled={!valid} variant="solid">
        {COPY.invite.submit}
      </SubmitButton>
    </form>
  );
}

// «Редагувати» - not drawn in Figma: the profile modal shell with the
// employee's fields (an invitation only has its e-mail).
function EditEmployeeModal({
  employee,
  onClose,
  onSave,
}: {
  employee: Employee | undefined;
  onClose: () => void;
  onSave: (patch: Partial<Pick<Employee, "fullName" | "position" | "phone" | "email">>) => void;
}) {
  return (
    <Modal718
      open={Boolean(employee)}
      onClose={onClose}
      title="Редагувати співробітника"
      className="[--field-surface:#fff]"
    >
      {employee && <EditEmployeeForm key={employee.id} employee={employee} onSave={onSave} />}
    </Modal718>
  );
}

function EditEmployeeForm({
  employee,
  onSave,
}: {
  employee: Employee;
  onSave: (patch: Partial<Pick<Employee, "fullName" | "position" | "phone" | "email">>) => void;
}) {
  const invited = employee.status === "invited";
  const [fullName, setFullName] = useState(employee.fullName);
  const [position, setPosition] = useState(employee.position);
  const [phone, setPhone] = useState(employee.phone ? formatEmployeePhone(employee.phone) : "");
  const [email, setEmail] = useState(employee.email);
  const [phoneTouched, setPhoneTouched] = useState(false);
  // An empty phone is allowed (the card then shows the e-mail only); any
  // other entry must be a full UA number, checked on the raw digits.
  const digits = nationalPhone(phone);
  const phoneOk = !phone.trim() || digits !== null;
  const ready = isValidEmail(email) && (invited || (fullName.trim() !== "" && phoneOk));
  return (
    <form
      className="flex flex-col gap-10"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        onSave(
          invited
            ? { email: email.trim().toLowerCase() }
            : {
                fullName: fullName.trim(),
                position: position.trim(),
                phone: digits ?? "",
                email: email.trim().toLowerCase(),
              },
        );
      }}
    >
      <div className="flex flex-col gap-6">
        {!invited && (
          <>
            <TextField label={COPY.you.fullName} value={fullName} onChange={setFullName} autoComplete="off" />
            <TextField label={COPY.you.position} value={position} onChange={setPosition} autoComplete="off" />
            <TextField
              label={COPY.you.phone}
              value={phone}
              onChange={setPhone}
              onBlur={() => setPhoneTouched(true)}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              error={phoneTouched && !phoneOk ? PHONE_ERROR : undefined}
              muiHelper
            />
          </>
        )}
        <TextField label={COPY.you.email} value={email} onChange={setEmail} type="email" inputMode="email" autoComplete="off" />
      </div>
      <ModalActions>
        <SubmitButton type="submit" disabled={!ready} variant="solid">
          Зберегти
        </SubmitButton>
      </ModalActions>
    </form>
  );
}

type ModalState =
  | { kind: "invite" }
  | { kind: "edit"; id: string }
  | { kind: "remove"; id: string }
  | null;

export function EmployeesPanel({
  accountId,
  list,
  inviteToken,
}: {
  accountId: string;
  list: Employee[];
  inviteToken: string;
}) {
  const [modal, setModal] = useState<ModalState>(null);
  const now = useNow();
  const target = modal && "id" in modal ? list.find((e) => e.id === modal.id) : undefined;
  const close = () => setModal(null);
  const inviteButton = (
    <Button type="button" size="small" onClick={() => setModal({ kind: "invite" })}>
      {COPY.employees.invite}
    </Button>
  );
  return (
    <div className="flex flex-col py-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-6">
        <h2 className="text-[22px] font-bold leading-7 tracking-[-0.44px] text-neutral-900">{COPY.employees.title}</h2>
        {inviteButton}
      </div>
      {list.length === 0 ? (
        <TableEmptyState
          title={COPY.employees.emptyTitle}
          text={COPY.employees.emptyText}
          actions={
            <Button type="button" size="small" variant="accent" onClick={() => setModal({ kind: "invite" })}>
              {COPY.employees.invite}
            </Button>
          }
        />
      ) : (
        <div data-profile="employee-grid" className="flex flex-wrap items-start gap-6 px-6">
          {list.map((e) => (
            <EmployeeCard
              key={e.id}
              employee={e}
              now={now}
              onEdit={() => setModal({ kind: "edit", id: e.id })}
              onRemove={() => setModal({ kind: "remove", id: e.id })}
              onResend={() => resendInvite(accountId, e.id)}
            />
          ))}
        </div>
      )}

      <InviteModal
        open={modal?.kind === "invite"}
        token={inviteToken}
        taken={list.map((e) => e.email.toLowerCase())}
        onClose={close}
        onInvite={(email) => {
          inviteEmployee(accountId, email);
          close();
        }}
      />
      <EditEmployeeModal
        employee={modal?.kind === "edit" ? target : undefined}
        onClose={close}
        onSave={(patch) => {
          if (target) updateEmployee(accountId, target.id, patch);
          close();
        }}
      />
      <ConfirmModal
        open={modal?.kind === "remove" && Boolean(target)}
        onClose={close}
        onConfirm={() => {
          if (target) removeEmployee(accountId, target.id);
          close();
        }}
        title="Видалити співробітника?"
        body={`Ви впевнені, що хочете видалити ${
          target?.status === "invited" ? `запрошення для ${target.email}` : `співробітника ${target?.fullName ?? ""}`
        }? Цю дію неможливо скасувати.`}
      />
    </div>
  );
}
