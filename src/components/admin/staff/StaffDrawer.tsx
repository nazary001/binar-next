"use client";

import { ArrowTopRightOnSquareIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { adminApi } from "../lib/api";
import { countOf, cx, formatDate, formatDateTime, formatRelative } from "../lib/format";
import { OWNER_ROLE_ID } from "../lib/permissions";
import { invalidate, setQueryData, useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { confirmDialog } from "../ui/ConfirmDialog";
import { Drawer } from "../ui/Drawer";
import { useUnsavedWarning } from "../ui/Form";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select, type SelectOption } from "../ui/Select";
import { Skeleton, SkeletonText } from "../ui/Skeleton";
import { ErrorState, NotFoundState } from "../ui/States";
import { Timeline, type TimelineItem } from "../ui/Timeline";
import { COLOR_TRANSITION, FOCUS_RING, TEXT, type Tone } from "../ui/tokens";
import { toast } from "../ui/Toast";
import { fieldCodes, toastStaffError } from "./messages";
import { withinActor } from "./rules";
import { Note, OneTimePassword, RoleBadge, SessionList, StaffStateBadge, signInAddress } from "./shared";
import {
  STAFF_NAME_MAX,
  type RoleRow,
  type SignOutAnswer,
  type StaffDetailAnswer,
  type StaffJournalLine,
  type StaffListAnswer,
  type StaffPasswordAnswer,
  type StaffPatchAnswer,
  type StaffPatchBody,
  type StaffSessionDto,
} from "./types";
import { useNow } from "./useNow";

// One member of staff in a drawer (/admin/staff?id=<staff id>): the
// profile (name and role), the password and the block switch, the live
// sessions, the person's last actions and the removal. Every control the
// API would refuse is disabled with the reason next to it: the own role,
// the own block and removal, the last active owner, an owner's account for
// a non-owner, and an account whose role has more than the signed-in
// person (rules.ts).

const SESSION_FORMS = ["сеанс", "сеанси", "сеансів"] as const;
const JOURNAL_COLLAPSED = 6;

type Busy = null | "save" | "password" | "block" | "sign-out" | "delete" | `session:${string}`;
type Secret = { email: string; password: string; signInUrl: string };

function journalTone(line: StaffJournalLine): Tone {
  if (line.action === "staff.sign-in") return "green";
  if (line.action === "staff.sign-in-refused" || line.action === "staff.block" || line.action === "staff.delete") return "red";
  if (line.action === "staff.create" || line.action === "staff.unblock") return "blue";
  return "neutral";
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-stroke-subtle pt-5" aria-label={title}>
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h3 className={TEXT.cardTitle}>{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

// A thing one can do to the account: what it is, what follows, the button.
function ActionRow({ title, text, action }: { title: string; text: ReactNode; action: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stroke-subtle p-4 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between min-[640px]:gap-6">
      <div className="min-w-0">
        <p className={TEXT.bodyStrong}>{title}</p>
        <p className={cx(TEXT.muted, "mt-0.5")}>{text}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">{action}</div>
    </div>
  );
}

function DrawerSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex items-center gap-4">
        <Skeleton shape="circle" className="size-14" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-40" shape="pill" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <SkeletonText lines={4} />
      <SkeletonText lines={3} />
      <SkeletonText lines={3} />
    </div>
  );
}

export function StaffDrawer({
  staffId,
  open,
  onClose,
  roles,
}: {
  staffId: string;
  open: boolean;
  onClose: () => void;
  roles: RoleRow[] | undefined;
}) {
  const { me, can } = useStaff();
  const now = useNow();
  const path = `/staff/${encodeURIComponent(staffId)}`;
  // Nothing is fetched while the drawer is closed: the panel keeps showing
  // its last content while it slides out.
  const detail = useAdminQuery<StaffDetailAnswer>(open ? path : null);
  const answer = detail.data && detail.data.staff.id === staffId ? detail.data : null;
  const row = answer?.staff ?? null;
  const owners = useAdminQuery<StaffListAnswer>(open && row?.roleId === OWNER_ROLE_ID ? "/staff?active=true&limit=1&role=owner" : null);

  // The form starts from the loaded record and starts over when the record
  // itself changes (after a save, or somebody else's change).
  const sourceKey = row ? `${row.id}|${row.name}|${row.roleId}` : "";
  const [seen, setSeen] = useState("");
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  if (row && seen !== sourceKey) {
    setSeen(sourceKey);
    setName(row.name);
    setRoleId(row.roleId);
    setNameError(null);
    setRoleError(null);
  }
  const dirty = row !== null && seen === sourceKey && (name !== row.name || roleId !== row.roleId);
  useUnsavedWarning(open && dirty);

  const [busy, setBusy] = useState<Busy>(null);
  const [expanded, setExpanded] = useState(false);
  const [secret, setSecret] = useState<Secret | null>(null);
  const [secretOpen, setSecretOpen] = useState(false);

  const meOwner = me.roleId === OWNER_ROLE_ID;
  const self = row !== null && row.id === me.id;
  const targetRole = row ? roles?.find((role) => role.id === row.roleId) : undefined;
  const viewOnly: "owner-only" | "beyond-own" | null =
    !row || meOwner || self
      ? null
      : row.roleId === OWNER_ROLE_ID
        ? "owner-only"
        : targetRole && !withinActor(me.roleId, me.permissions, targetRole.permissions)
          ? "beyond-own"
          : null;
  const lastOwner = row !== null && row.roleId === OWNER_ROLE_ID && row.isActive && owners.data?.total === 1;
  const editable = row !== null && viewOnly === null;

  const refresh = () => {
    invalidate("/staff");
    invalidate("/roles");
  };

  const requestClose = async () => {
    if (busy) return;
    if (dirty) {
      const leave = await confirmDialog({
        title: "Закрити без збереження?",
        text: "Зміни імені чи ролі буде втрачено.",
        confirmLabel: "Закрити без збереження",
        tone: "danger",
      });
      if (!leave) return;
      // The next opening starts from the saved record.
      setSeen("");
    }
    onClose();
  };

  const save = async () => {
    if (!row || busy) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Вкажіть ім'я");
      return;
    }
    const body: StaffPatchBody = {};
    if (trimmed !== row.name) body.name = trimmed;
    if (roleId !== row.roleId) body.roleId = roleId;
    if (Object.keys(body).length === 0) {
      setName(row.name);
      return;
    }
    setBusy("save");
    const result = await adminApi<StaffPatchAnswer>(path, { method: "PATCH", body });
    setBusy(null);
    if (!result.ok) {
      if (fieldCodes(result).roleId) setRoleError("Цієї ролі вже немає. Оберіть іншу.");
      toastStaffError(result);
      return;
    }
    if (answer) setQueryData(path, { ...answer, staff: result.data.staff });
    refresh();
    toast.success("Зміни збережено");
  };

  const setActive = async (isActive: boolean) => {
    if (!row || busy) return;
    if (!isActive) {
      const ok = await confirmDialog({
        title: `Заблокувати ${row.name}?`,
        text: "Людина не зможе увійти в панель, а всі її сеанси буде завершено одразу. Розблокувати можна будь-коли.",
        confirmLabel: "Заблокувати",
        tone: "danger",
      });
      if (!ok) return;
    }
    setBusy("block");
    const result = await adminApi<StaffPatchAnswer>(path, { method: "PATCH", body: { isActive } });
    setBusy(null);
    if (!result.ok) return toastStaffError(result);
    refresh();
    toast.success(isActive ? "Співробітника розблоковано" : "Співробітника заблоковано, усі його сеанси завершено");
  };

  const resetPassword = async () => {
    if (!row || busy) return;
    const ok = await confirmDialog({
      title: "Скинути пароль?",
      text: `${row.name} вийде з усіх пристроїв, а поточний пароль перестане діяти. Ми згенеруємо тимчасовий пароль і покажемо його один раз.`,
      confirmLabel: "Скинути пароль",
      tone: "danger",
    });
    if (!ok) return;
    setBusy("password");
    const result = await adminApi<StaffPasswordAnswer>(`${path}/password`, { method: "POST", body: {} });
    setBusy(null);
    if (!result.ok) return toastStaffError(result);
    setSecret({ email: row.email, password: result.data.password, signInUrl: signInAddress() });
    setSecretOpen(true);
    refresh();
  };

  const endSession = async (session: StaffSessionDto) => {
    if (busy) return;
    setBusy(`session:${session.id}`);
    const result = await adminApi(`${path}/sessions/${session.id}`, { method: "DELETE" });
    setBusy(null);
    if (!result.ok) return toastStaffError(result);
    refresh();
    toast.success("Сеанс завершено");
  };

  const signOutAll = async () => {
    if (!row || busy) return;
    const ok = await confirmDialog({
      title: self ? "Завершити інші ваші сеанси?" : `Завершити всі сеанси ${row.name}?`,
      text: self
        ? "Ви вийдете з панелі на всіх інших пристроях. Цей пристрій залишиться в панелі."
        : "Людина вийде з панелі на всіх пристроях і зможе увійти знову зі своїм паролем.",
      confirmLabel: "Завершити",
      tone: "danger",
    });
    if (!ok) return;
    setBusy("sign-out");
    const result = await adminApi<SignOutAnswer>(`${path}/sign-out`, { method: "POST", body: {} });
    setBusy(null);
    if (!result.ok) return toastStaffError(result);
    refresh();
    toast.success(`Завершено ${countOf(result.data.ended, SESSION_FORMS)}`);
  };

  const remove = async () => {
    if (!row || busy) return;
    const ok = await confirmDialog({
      title: `Видалити акаунт ${row.name}?`,
      text: "Акаунт буде видалено назавжди, і людина одразу вийде з панелі. Записи журналу про її дії залишаться. Якщо людина лише тимчасово не працює, краще заблокувати акаунт.",
      confirmLabel: "Видалити акаунт",
      tone: "danger",
    });
    if (!ok) return;
    setBusy("delete");
    const result = await adminApi(path, { method: "DELETE" });
    setBusy(null);
    if (!result.ok) return toastStaffError(result);
    onClose();
    // The list and the counts only: this drawer's own address is gone.
    invalidate("/staff?");
    invalidate("/staff/options");
    invalidate("/roles");
    toast.success("Акаунт видалено");
  };

  // --- the body ------------------------------------------------------------------

  let body: ReactNode;
  if (!row) {
    if (detail.error?.status === 404 || detail.error?.error === "not-found") {
      body = (
        <NotFoundState
          title="Співробітника не знайдено"
          text="Можливо, акаунт уже видалили."
          backHref="/admin/staff"
          backLabel="До списку співробітників"
        />
      );
    } else if (detail.error) {
      body = <ErrorState failure={detail.error} onRetry={detail.reload} />;
    } else {
      body = <DrawerSkeleton />;
    }
  } else {
    const sessions = answer?.sessions ?? [];
    const journal = answer?.journal ?? [];
    const others = sessions.filter((session) => !session.current).length;

    const roleOptions: SelectOption<string>[] = (roles ?? []).map((role) => {
      const ownerOnly = !meOwner && role.id === OWNER_ROLE_ID;
      const beyond = !meOwner && !ownerOnly && !withinActor(me.roleId, me.permissions, role.permissions);
      return {
        value: role.id,
        label: role.name,
        hint: ownerOnly ? "Надати роль власника може лише власник" : beyond ? "Має права, яких немає у вашої ролі" : role.description || undefined,
        disabled: (ownerOnly || beyond) && role.id !== row.roleId,
      };
    });
    if (!roleOptions.some((option) => option.value === row.roleId)) {
      roleOptions.unshift({ value: row.roleId, label: row.roleName, hint: "Цієї ролі вже немає" });
    }
    const chosen = roles?.find((role) => role.id === roleId);
    const roleHint = self
      ? "Свою роль змінити не можна: це робить інший співробітник, який керує командою."
      : lastOwner
        ? "Це єдиний активний власник: панель не може лишитися без власника. Спершу надайте роль власника комусь іншому."
        : chosen?.description || undefined;

    const blockReason = self ? "Себе заблокувати не можна." : lastOwner ? "Єдиного активного власника заблокувати не можна." : null;
    const deleteReason = self ? "Свій акаунт видалити не можна." : lastOwner ? "Єдиного активного власника видалити не можна." : null;

    const items: TimelineItem[] = (expanded ? journal : journal.slice(0, JOURNAL_COLLAPSED)).map((line) => ({
      id: line.id,
      at: line.at,
      title: <span className="font-normal">{line.summary}</span>,
      actor: line.actor.name || "Система",
      tone: journalTone(line),
    }));

    body = (
      <div className="flex flex-col gap-5">
        {/* Who it is, at a glance. */}
        <div className="flex items-start gap-4">
          <Avatar name={row.name} size="xl" decorative />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <RoleBadge roleId={row.roleId} name={row.roleName} size="md" />
              <StaffStateBadge row={row} size="md" />
              {self && (
                <Badge tone="blue" size="md">
                  Ви
                </Badge>
              )}
              {row.test && (
                <Badge tone="neutral" size="md">
                  Тестовий
                </Badge>
              )}
            </div>
            <p className={cx(TEXT.caption, "tabular-nums")}>
              {row.lastLoginAt ? (
                <span title={formatDateTime(row.lastLoginAt)}>Останній вхід {formatRelative(row.lastLoginAt, now || undefined)}</span>
              ) : (
                "Ще не входив у панель"
              )}
              , у панелі з {formatDate(row.createdAt)}
            </p>
            {can("orders.view") && (
              <Link
                href={`/admin/orders?managerId=${encodeURIComponent(row.id)}`}
                className={cx(
                  "inline-flex w-fit items-center gap-1.5 rounded-md text-[13px] font-medium leading-[18px] text-neutral-800 underline-offset-4 hover:underline",
                  FOCUS_RING,
                  COLOR_TRANSITION,
                )}
              >
                <ShoppingBagIcon aria-hidden className="size-4" strokeWidth={1.7} />
                Замовлення, де відповідальний
              </Link>
            )}
          </div>
        </div>

        {viewOnly === "owner-only" && <Note>Акаунтами власників керує лише власник. Тут його можна тільки переглянути.</Note>}
        {viewOnly === "beyond-own" && (
          <Note>
            У цього співробітника є права, яких немає у вашої ролі, тому його акаунт можна лише переглянути. Змінити його може
            власник.
          </Note>
        )}
        {!row.isActive && <Note tone="danger">Акаунт заблоковано: людина не може увійти в панель.</Note>}
        {row.isActive && row.mustChangePassword && (
          <Note tone="warning">Людина ще не задала власний пароль: панель попросить про це при першому вході з тимчасовим паролем.</Note>
        )}

        <Section title="Профіль">
          <div className="grid gap-4 min-[640px]:grid-cols-2">
            <Input
              label="Ім'я"
              value={name}
              onChange={(next) => {
                setName(next);
                setNameError(null);
              }}
              error={nameError}
              maxLength={STAFF_NAME_MAX}
              disabled={!editable}
              required={editable}
              autoComplete="off"
            />
            <Select
              label="Роль"
              value={roleId}
              onChange={(next) => {
                setRoleId(next);
                setRoleError(null);
              }}
              options={roleOptions}
              disabled={!editable || self || lastOwner}
              error={roleError}
              hint={roleHint}
            />
          </div>
          {editable && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {dirty && <span className={cx(TEXT.caption, "mr-auto")}>Є незбережені зміни</span>}
              <Button
                variant="secondary"
                disabled={!dirty || busy === "save"}
                onClick={() => {
                  setName(row.name);
                  setRoleId(row.roleId);
                  setNameError(null);
                  setRoleError(null);
                }}
              >
                Скасувати
              </Button>
              <Button disabled={!dirty} loading={busy === "save"} onClick={() => void save()}>
                Зберегти зміни
              </Button>
            </div>
          )}
        </Section>

        <Section title="Доступ">
          {self ? (
            <ActionRow
              title="Пароль"
              text="Свій пароль ви змінюєте самі, з поточним паролем. Інші ваші сеанси після цього завершаться."
              action={
                <Button variant="secondary" size="sm" href="/admin/password">
                  Змінити свій пароль
                </Button>
              }
            />
          ) : (
            <ActionRow
              title="Пароль"
              text="Новий тимчасовий пароль: людина вийде з усіх пристроїв і при вході задасть власний."
              action={
                <Button variant="secondary" size="sm" disabled={!editable} loading={busy === "password"} onClick={() => void resetPassword()}>
                  Скинути пароль
                </Button>
              }
            />
          )}
          {row.isActive ? (
            <ActionRow
              title="Блокування"
              text={blockReason ?? "Заблокований співробітник не може увійти, а всі його сеанси завершуються одразу."}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!editable || blockReason !== null}
                  loading={busy === "block"}
                  onClick={() => void setActive(false)}
                >
                  Заблокувати
                </Button>
              }
            />
          ) : (
            <ActionRow
              title="Блокування"
              text="Після розблокування людина знову зможе увійти зі своїм паролем."
              action={
                <Button variant="secondary" size="sm" disabled={!editable} loading={busy === "block"} onClick={() => void setActive(true)}>
                  Розблокувати
                </Button>
              }
            />
          )}
        </Section>

        <Section
          title="Сеанси"
          aside={
            editable && others > 0 ? (
              <Button variant="secondary" size="sm" loading={busy === "sign-out"} onClick={() => void signOutAll()}>
                {self ? "Завершити всі інші" : "Завершити всі"}
              </Button>
            ) : undefined
          }
        >
          {sessions.length === 0 ? (
            <p className={TEXT.muted}>Відкритих сеансів немає: людина зараз не в панелі.</p>
          ) : (
            <>
              <p className={TEXT.muted}>Відкрито на {countOf(Math.max(row.sessions, sessions.length), ["пристрої", "пристроях", "пристроях"])}</p>
              <SessionList
                sessions={sessions}
                total={row.sessions}
                now={now}
                onEnd={editable ? (session) => void endSession(session) : null}
                ending={busy?.startsWith("session:") ? busy.slice("session:".length) : null}
                label={`Сеанси: ${row.name}`}
              />
            </>
          )}
        </Section>

        <Section
          title="Останні дії"
          aside={
            can("audit.view") ? (
              <Link
                href={`/admin/audit?actorId=${encodeURIComponent(row.id)}`}
                className={cx(
                  "inline-flex items-center gap-1 rounded-md text-[13px] font-medium leading-[18px] text-neutral-800 underline-offset-4 hover:underline",
                  FOCUS_RING,
                  COLOR_TRANSITION,
                )}
              >
                Усі дії в журналі
                <ArrowTopRightOnSquareIcon aria-hidden className="size-4" strokeWidth={1.7} />
              </Link>
            ) : undefined
          }
        >
          <p className={TEXT.muted}>Що людина робила в панелі і що змінювали в її акаунті.</p>
          <Timeline items={items} empty="Дій ще не було" />
          {journal.length > JOURNAL_COLLAPSED && (
            <div>
              <Button variant="ghost" size="sm" onClick={() => setExpanded((value) => !value)}>
                {expanded ? "Згорнути" : `Показати всі (${journal.length})`}
              </Button>
            </div>
          )}
        </Section>

        <Section title="Видалення">
          <ActionRow
            title="Видалити акаунт"
            text={
              deleteReason ??
              "Акаунт зникне назавжди, записи журналу про дії людини залишаться. Якщо людина лише тимчасово не працює, краще заблокувати."
            }
            action={
              <Button
                variant="dangerGhost"
                size="sm"
                disabled={!editable || deleteReason !== null}
                loading={busy === "delete"}
                onClick={() => void remove()}
              >
                Видалити акаунт
              </Button>
            }
          />
        </Section>
      </div>
    );
  }

  return (
    <>
      <Drawer
        open={open}
        onClose={() => void requestClose()}
        title={row ? row.name : "Співробітник"}
        description={row ? row.email : undefined}
        width={640}
        busy={busy === "delete"}
      >
        {body}
      </Drawer>
      <Modal
        open={secretOpen}
        onClose={() => setSecretOpen(false)}
        closeOnScrim={false}
        title="Новий тимчасовий пароль"
        description={row ? `Передайте ці дані: ${row.name} увійде з ними в панель.` : undefined}
        footer={<Button onClick={() => setSecretOpen(false)}>Готово</Button>}
      >
        {secret && <OneTimePassword email={secret.email} password={secret.password} signInUrl={secret.signInUrl} />}
      </Modal>
    </>
  );
}
