"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { EntityHistory } from "../common/EntityHistory";
import { adminApi, type ApiFailure } from "../lib/api";
import { countOf, cx } from "../lib/format";
import { ALL_PERMISSIONS, OWNER_ROLE_ID, PERMISSION_GROUPS } from "../lib/permissions";
import { invalidate, setQueryData } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";
import { confirmDialog } from "../ui/ConfirmDialog";
import { Drawer } from "../ui/Drawer";
import { useDirty, useUnsavedWarning } from "../ui/Form";
import { Input, Textarea } from "../ui/Input";
import { SkeletonText } from "../ui/Skeleton";
import { ErrorState, NotFoundState } from "../ui/States";
import { COLOR_TRANSITION, FOCUS_RING, TEXT } from "../ui/tokens";
import { toast } from "../ui/Toast";
import { fieldCodes, toastStaffError } from "./messages";
import { joinWords, summarize, TOTAL_PERMISSIONS } from "./permissionWords";
import { groupOf, isChangePermission, viewPermissionOf, withImpliedViews, withinActor } from "./rules";
import { Note } from "./shared";
import { ROLE_DESCRIPTION_MAX, ROLE_NAME_MAX, type RoleAnswer, type RoleRow, type RolesAnswer, type RolePatchBody } from "./types";

// One role in a wide drawer (/admin/staff?tab=roles&id=<role id>, or
// id=new): its name, description and the permission matrix, a group of
// boxes per section of the panel, with a live summary in plain words.
//
// The matrix keeps two rules of the panel visible:
// - a permission that changes something brings the section's view
//   permission with it (ticked and locked while it is on);
// - a member of staff who is not an owner hands out only permissions they
//   hold, never edits the role they hold, and only views a role that has
//   more than they do (rules.ts; the API refuses the same).

type Form = { name: string; description: string; permissions: string[] };

const EMPTY: Form = { name: "", description: "", permissions: [] };
const MEMBER_FORMS = ["співробітник", "співробітники", "співробітників"] as const;
const CLOSE_MS = 450;

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((key) => set.has(key));
}

function Summary({ permissions, owner }: { permissions: string[]; owner: boolean }) {
  const { granted, missing } = summarize(permissions, owner);
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-bg-subtle p-4" aria-live="polite">
      <div>
        <p className={TEXT.cardTitle}>Ця роль може</p>
        <p className={cx(TEXT.caption, "mt-0.5 tabular-nums")}>
          {permissions.length} з {TOTAL_PERMISSIONS} прав
        </p>
      </div>
      {granted.length === 0 ? (
        <p className={TEXT.muted}>Поки нічого: позначте потрібні права.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {granted.map((group) => (
            <li key={group.key} className="text-[13px] leading-[18px] text-neutral-800">
              <span className="font-semibold text-neutral-900">{group.label}:</span> {joinWords(group.verbs)}
            </li>
          ))}
        </ul>
      )}
      {owner && <p className={TEXT.caption}>А також усе, що з{"'"}явиться в панелі пізніше.</p>}
      {missing.length > 0 && (
        <p className="border-t border-stroke-subtle pt-3 text-[13px] leading-[18px] text-neutral-500">
          <span className="font-semibold text-neutral-700">Без доступу:</span> {joinWords(missing)}
        </p>
      )}
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6">{children}</div>;
}

export function RoleEditor({
  roleId,
  open,
  onClose,
  onCreated,
  answer,
  loadError,
  onRetry,
}: {
  roleId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  answer: RolesAnswer | undefined;
  loadError: ApiFailure | null;
  onRetry: () => void;
}) {
  const { me } = useStaff();
  const isNew = roleId === "new";
  const roles = answer?.items;
  const groups = answer?.groups ?? PERMISSION_GROUPS;
  const role = isNew ? null : (roles?.find((item) => item.id === roleId) ?? null);
  const initial: Form | null = isNew ? EMPTY : role ? { name: role.name, description: role.description, permissions: [...role.permissions] } : null;

  // The form starts from the role and starts over when the role itself
  // changes (after a save, after "new" became a real role).
  const sourceKey = isNew ? "new" : role ? `${role.id}|${role.name}|${role.description}|${role.permissions.join(",")}` : "";
  const [seen, setSeen] = useState("");
  const [form, setForm] = useState<Form>(EMPTY);
  const [nameError, setNameError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "save" | "delete">(null);
  if (initial && seen !== sourceKey) {
    setSeen(sourceKey);
    setForm(initial);
    setNameError(null);
  }
  const ready = initial !== null && seen === sourceKey;
  const dirty = useDirty(ready ? initial : null, form);
  useUnsavedWarning(open && dirty);

  const meOwner = me.roleId === OWNER_ROLE_ID;
  const readOnly: null | "locked" | "own-role" | "beyond-own" = !role
    ? null
    : role.locked
      ? "locked"
      : !meOwner && role.id === me.roleId
        ? "own-role"
        : !withinActor(me.roleId, me.permissions, role.permissions)
          ? "beyond-own"
          : null;
  const held = new Set(form.permissions);
  const own = new Set<string>(me.permissions);
  const reachable = (key: string) => meOwner || own.has(key);

  const setPermissions = (next: Set<string>) => setForm((current) => ({ ...current, permissions: ALL_PERMISSIONS.filter((key) => next.has(key)) }));

  const toggle = (key: string, on: boolean) => {
    const next = new Set(held);
    if (on) {
      next.add(key);
      // Changing a section needs seeing it.
      if (isChangePermission(key)) {
        const view = viewPermissionOf(groupOf(key));
        if (view) next.add(view);
      }
    } else {
      next.delete(key);
    }
    setPermissions(next);
  };

  const setGroup = (keys: string[], on: boolean) => {
    const next = new Set(held);
    for (const key of keys) {
      if (on) next.add(key);
      else next.delete(key);
    }
    setPermissions(new Set(withImpliedViews([...next])));
  };

  const requestClose = async () => {
    if (busy) return;
    if (dirty) {
      const leave = await confirmDialog({
        title: "Закрити без збереження?",
        text: "Зміни в ролі буде втрачено.",
        confirmLabel: "Закрити без збереження",
        tone: "danger",
      });
      if (!leave) return;
      setSeen("");
    }
    onClose();
  };

  const putRole = (saved: RoleRow) => {
    if (!answer) return;
    const items = answer.items.some((item) => item.id === saved.id)
      ? answer.items.map((item) => (item.id === saved.id ? saved : item))
      : [...answer.items, saved];
    setQueryData("/roles", { ...answer, ok: true, items });
  };

  const save = async () => {
    if (busy || readOnly) return;
    const name = form.name.trim();
    if (!name) {
      setNameError("Вкажіть назву ролі");
      return;
    }
    const permissions = withImpliedViews(form.permissions);
    const description = form.description.trim();
    setBusy("save");
    let result;
    if (isNew) {
      result = await adminApi<RoleAnswer>("/roles", { method: "POST", body: { name, description, permissions } });
    } else {
      if (!role) return setBusy(null);
      const body: RolePatchBody = {};
      if (name !== role.name) body.name = name;
      if (description !== role.description) body.description = description;
      if (!sameSet(permissions, role.permissions)) body.permissions = permissions;
      if (Object.keys(body).length === 0) {
        setBusy(null);
        setForm({ name: role.name, description: role.description, permissions: [...role.permissions] });
        return;
      }
      result = await adminApi<RoleAnswer>(`/roles/${encodeURIComponent(role.id)}`, { method: "PATCH", body });
    }
    setBusy(null);
    if (!result.ok) {
      if (result.error === "exists" || fieldCodes(result).name === "taken") {
        setNameError("Роль з такою назвою вже є");
        return;
      }
      toastStaffError(result);
      return;
    }
    const saved = result.data.role;
    putRole(saved);
    invalidate("/roles");
    // Account rows show the role's name.
    invalidate("/staff");
    if (isNew) {
      toast.success("Роль створено");
      onCreated(saved.id);
    } else {
      toast.success("Зміни збережено");
    }
  };

  const remove = async () => {
    if (!role || busy) return;
    const ok = await confirmDialog({
      title: `Видалити роль «${role.name}»?`,
      text: "Роль зникне зі списку. Її ніхто не має, тож нічий доступ не зміниться.",
      confirmLabel: "Видалити роль",
      tone: "danger",
    });
    if (!ok) return;
    setBusy("delete");
    const result = await adminApi(`/roles/${encodeURIComponent(role.id)}`, { method: "DELETE" });
    setBusy(null);
    if (!result.ok) return toastStaffError(result);
    onClose();
    toast.success("Роль видалено");
    // After the drawer has slid out, so it never shows the role as gone.
    window.setTimeout(() => invalidate("/roles"), CLOSE_MS);
  };

  // --- the body ------------------------------------------------------------------

  let body: ReactNode;
  if (!initial || !ready) {
    if (!isNew && roles && !role) {
      body = (
        <NotFoundState title="Роль не знайдено" text="Можливо, її вже видалили." backHref="/admin/staff?tab=roles" backLabel="До списку ролей" />
      );
    } else if (loadError && !roles) {
      body = <ErrorState failure={loadError} onRetry={onRetry} />;
    } else {
      body = (
        <Shell>
          <SkeletonText lines={2} />
          <SkeletonText lines={6} />
          <SkeletonText lines={6} />
        </Shell>
      );
    }
  } else {
    const locked = readOnly !== null;
    body = (
      <div className="grid gap-6 min-[1024px]:grid-cols-[minmax(0,1fr)_288px]">
        <div className="flex min-w-0 flex-col gap-6">
          {readOnly === "locked" && (
            <Note>Власник завжди має всі права, зокрема ті, що з{"'"}являться в панелі пізніше. Цю роль не можна змінити чи видалити.</Note>
          )}
          {readOnly === "own-role" && (
            <Note>Це ваша роль. Змінити її може власник або інший співробітник, який керує командою: так ніхто не розширює права сам собі.</Note>
          )}
          {readOnly === "beyond-own" && (
            <Note>Ця роль має права, яких немає у вашої ролі, тому її можна лише переглянути. Змінити її може власник.</Note>
          )}
          {role?.system && !locked && <Note>Вбудована роль: її права можна змінити, але саму роль видалити не можна.</Note>}
          {!locked && !meOwner && (
            <Note>Ви можете надати ролі лише ті права, які має ваша власна роль. Решту показано, але позначити їх не вийде.</Note>
          )}

          <div className="grid gap-4">
            <Input
              label="Назва"
              value={form.name}
              onChange={(name) => {
                setForm((current) => ({ ...current, name }));
                setNameError(null);
              }}
              error={nameError}
              placeholder="Наприклад, Склад і логістика"
              maxLength={ROLE_NAME_MAX}
              disabled={locked}
              required={!locked}
              autoComplete="off"
            />
            <Textarea
              label="Опис"
              value={form.description}
              onChange={(description) => setForm((current) => ({ ...current, description }))}
              placeholder="Для кого ця роль і що вона дає"
              maxLength={ROLE_DESCRIPTION_MAX}
              rows={2}
              autoGrow
              showCount={!locked}
              disabled={locked}
              optional={!locked}
            />
            {role && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] leading-5">
                <span className="text-neutral-500">Співробітники з цією роллю:</span>
                {role.members > 0 ? (
                  <Link
                    href={`/admin/staff?role=${encodeURIComponent(role.id)}`}
                    className={cx("rounded-md font-semibold tabular-nums text-neutral-900 underline underline-offset-4 hover:text-brand", FOCUS_RING, COLOR_TRANSITION)}
                  >
                    {countOf(role.members, MEMBER_FORMS)}
                  </Link>
                ) : (
                  <span className="font-semibold text-neutral-900">нікого</span>
                )}
                {!role.system && !locked && role.members > 0 && (
                  <span className={cx(TEXT.caption, "basis-full")}>Щоб видалити роль, спершу призначте цим співробітникам іншу.</span>
                )}
              </div>
            )}
          </div>

          <section className="flex flex-col gap-3" aria-label="Права">
            <div>
              <h3 className={TEXT.cardTitle}>Права</h3>
              <p className={cx(TEXT.muted, "mt-0.5")}>
                {locked
                  ? "Що дозволено цій ролі в кожному розділі панелі."
                  : "Позначте, що роль може робити в кожному розділі. Перегляд розділу вмикається сам, коли роль може щось у ньому змінювати."}
              </p>
            </div>
            <div className="grid gap-3 min-[640px]:grid-cols-2">
              {groups.map((group) => {
                const keys: string[] = group.permissions.map((permission) => permission.key);
                const selectable = locked ? [] : keys.filter(reachable);
                // A section the actor has nothing of says so once, not under every box.
                const wholeBeyond = !locked && selectable.length === 0;
                const onCount = keys.filter((key) => held.has(key)).length;
                const allOn = selectable.length > 0 && selectable.every((key) => held.has(key));
                return (
                  <div key={group.key} className="flex flex-col gap-3 rounded-2xl border border-stroke-subtle p-4" data-group={group.key}>
                    <div className="flex min-h-8 items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={TEXT.bodyStrong}>{group.label}</span>
                        <Badge tone={onCount > 0 ? "green" : "neutral"}>
                          {onCount} з {keys.length}
                        </Badge>
                      </span>
                      {wholeBeyond && <span className={cx(TEXT.caption, "text-right")}>Немає у вашої ролі</span>}
                      {selectable.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`${allOn ? "Зняти все" : "Обрати все"} в групі «${group.label}»`}
                          onClick={() => setGroup(selectable, !allOn)}
                        >
                          {allOn ? "Зняти все" : "Обрати все"}
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-col gap-3">
                      {group.permissions.map((permission) => {
                        const key: string = permission.key;
                        const lockedByChange =
                          key.endsWith(".view") && keys.some((other) => other !== key && isChangePermission(other) && held.has(other));
                        const beyond = !reachable(key);
                        return (
                          <Checkbox
                            key={key}
                            checked={held.has(key)}
                            onChange={(on) => toggle(key, on)}
                            label={permission.label}
                            disabled={locked || beyond || lockedByChange}
                            hint={
                              locked || wholeBeyond
                                ? undefined
                                : beyond
                                  ? "Цього права немає у вашої ролі"
                                  : lockedByChange
                                    ? "Увімкнено, поки роль може змінювати цей розділ"
                                    : undefined
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {role && <EntityHistory type="role" id={role.id} bare refreshKey={sourceKey} />}
        </div>
        <aside className="min-w-0 min-[1024px]:sticky min-[1024px]:top-0 min-[1024px]:self-start">
          <Summary permissions={withImpliedViews(form.permissions)} owner={role?.locked === true} />
        </aside>
      </div>
    );
  }

  const editable = ready && readOnly === null;
  const footer = editable ? (
    <>
      {role && !role.system && (
        <Button
          variant="dangerGhost"
          className="min-[640px]:mr-auto"
          disabled={role.members > 0 || busy === "save"}
          loading={busy === "delete"}
          onClick={() => void remove()}
        >
          Видалити роль
        </Button>
      )}
      {isNew ? (
        <Button variant="secondary" onClick={() => void requestClose()}>
          Скасувати
        </Button>
      ) : (
        <Button variant="secondary" disabled={!dirty || busy !== null} onClick={() => initial && setForm(initial)}>
          Скасувати
        </Button>
      )}
      <Button disabled={!isNew && !dirty} loading={busy === "save"} onClick={() => void save()}>
        {isNew ? "Створити роль" : "Зберегти зміни"}
      </Button>
    </>
  ) : ready ? (
    <Button variant="secondary" onClick={() => void requestClose()}>
      Закрити
    </Button>
  ) : undefined;

  return (
    <Drawer
      open={open}
      onClose={() => void requestClose()}
      title={isNew ? "Нова роль" : role ? role.name : "Роль"}
      description={
        isNew
          ? "Назвіть роль і позначте, що вона дозволяє."
          : role
            ? role.locked
              ? "Повний доступ до всього"
              : role.system
                ? "Вбудована роль"
                : "Власна роль"
            : undefined
      }
      width={1040}
      busy={busy !== null}
      footer={footer}
    >
      {body}
    </Drawer>
  );
}
