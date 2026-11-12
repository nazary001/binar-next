"use client";

import { ArrowRightEndOnRectangleIcon, ComputerDesktopIcon, KeyIcon } from "@heroicons/react/24/outline";
import { useState, type FormEvent, type ReactNode } from "react";
import { adminApi } from "../lib/api";
import { countOf, cx, formatDate } from "../lib/format";
import { invalidate, setQueryData, useAdminQuery } from "../lib/query";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { confirmDialog } from "../ui/ConfirmDialog";
import { useUnsavedWarning } from "../ui/Form";
import { Input } from "../ui/Input";
import { KeyValueList } from "../ui/KeyValue";
import { Page, PageHeader } from "../ui/Page";
import { Skeleton, SkeletonText } from "../ui/Skeleton";
import { ErrorState } from "../ui/States";
import { TEXT } from "../ui/tokens";
import { toast } from "../ui/Toast";
import { toastStaffError } from "./messages";
import { RoleBadge, SessionList, SignInList } from "./shared";
import { STAFF_NAME_MAX, type AccountAnswer, type AccountPatchAnswer, type SignOutAnswer, type StaffSessionDto } from "./types";
import { useNow } from "./useNow";

// /admin/account: the signed-in member of staff. The own name, the
// password (changed on /admin/password with the current one), the live
// sessions with "this device" marked, and the last sign-ins with the
// refused attempts. Open to every member of staff, whatever the role.

const PATH = "/account";
const SESSION_FORMS = ["сеанс", "сеанси", "сеансів"] as const;

function QuietEmpty({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-stroke-default text-neutral-800">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={TEXT.bodyStrong}>{title}</span>
        <span className={TEXT.muted}>{text}</span>
      </span>
    </div>
  );
}

function ProfileCard({ data }: { data: AccountAnswer }) {
  const me = data.me;
  const [name, setName] = useState(me.name);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = name !== me.name;
  useUnsavedWarning(dirty);

  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Вкажіть ім'я");
      return;
    }
    if (trimmed === me.name) {
      setName(me.name);
      return;
    }
    setBusy(true);
    const result = await adminApi<AccountPatchAnswer>(PATH, { method: "PATCH", body: { name: trimmed } });
    setBusy(false);
    if (!result.ok) return toastStaffError(result);
    setQueryData(PATH, { ...data, me: result.data.me });
    invalidate(PATH);
    invalidate("/staff");
    toast.success("Ім'я змінено");
  };

  return (
    <Card title="Профіль" subtitle="Так вас бачать колеги в журналі дій і в списках відповідальних">
      <form onSubmit={save} noValidate className="flex flex-col gap-5">
        <Input
          label="Ім'я"
          value={name}
          onChange={(next) => {
            setName(next);
            setError(null);
          }}
          error={error}
          maxLength={STAFF_NAME_MAX}
          autoComplete="name"
          required
        />
        <KeyValueList
          columns={2}
          items={[
            { label: "E-mail", value: me.email, hint: "З ним ви входите в панель", copy: me.email },
            {
              label: "Роль",
              value: <RoleBadge roleId={me.roleId} name={me.roleName} size="md" />,
              hint: "Роль змінює співробітник, який керує командою",
            },
          ]}
        />
        <div className="flex flex-wrap items-center justify-end gap-2">
          {dirty && <span className={cx(TEXT.caption, "mr-auto")}>Є незбережені зміни</span>}
          <Button
            variant="secondary"
            disabled={!dirty || busy}
            onClick={() => {
              setName(me.name);
              setError(null);
            }}
          >
            Скасувати
          </Button>
          <Button type="submit" disabled={!dirty} loading={busy}>
            Зберегти зміни
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function AccountScreen() {
  const now = useNow();
  const account = useAdminQuery<AccountAnswer>(PATH);
  const data = account.data;
  const [ending, setEnding] = useState<string | null>(null);

  const endSession = async (session: StaffSessionDto) => {
    if (ending) return;
    setEnding(session.id);
    const result = await adminApi(`${PATH}/sessions/${session.id}`, { method: "DELETE" });
    setEnding(null);
    if (!result.ok) return toastStaffError(result);
    invalidate(PATH);
    toast.success("Сеанс завершено");
  };

  const endOthers = async () => {
    if (ending) return;
    const ok = await confirmDialog({
      title: "Завершити всі інші сеанси?",
      text: "Ви вийдете з панелі на всіх інших пристроях. Цей пристрій залишиться в панелі.",
      confirmLabel: "Завершити",
      tone: "danger",
    });
    if (!ok) return;
    setEnding("others");
    const result = await adminApi<SignOutAnswer>(`${PATH}/sessions/sign-out-others`, { method: "POST", body: {} });
    setEnding(null);
    if (!result.ok) return toastStaffError(result);
    invalidate(PATH);
    toast.success(`Завершено ${countOf(result.data.ended, SESSION_FORMS)}`);
  };

  if (!data) {
    return (
      <Page width="narrow">
        <PageHeader title="Мій акаунт" subtitle="Ваші дані в панелі, пароль і пристрої, з яких ви входили" />
        {account.error ? (
          <div className="rounded-3xl bg-white">
            <ErrorState failure={account.error} onRetry={account.reload} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {[5, 3, 4].map((lines, index) => (
              <div key={index} className="flex flex-col gap-4 rounded-3xl bg-white p-6">
                <Skeleton className="h-5 w-40" shape="pill" />
                <SkeletonText lines={lines} />
              </div>
            ))}
          </div>
        )}
      </Page>
    );
  }

  const me = data.me;
  const others = data.sessions.filter((session) => !session.current).length;

  return (
    <Page width="narrow">
      <PageHeader
        title="Мій акаунт"
        subtitle="Ваші дані в панелі, пароль і пристрої, з яких ви входили"
        meta={
          <>
            <Avatar name={me.name} size="sm" decorative />
            <span className={TEXT.bodyStrong}>{me.name}</span>
            <RoleBadge roleId={me.roleId} name={me.roleName} />
            <span className={TEXT.caption}>у панелі з {formatDate(me.createdAt)}</span>
          </>
        }
      />
      <div className="flex flex-col gap-4">
        {/* Keyed by the saved name: a save (or a change elsewhere) starts the form over. */}
        <ProfileCard key={`${me.id}|${me.name}`} data={data} />

        <Card title="Пароль" subtitle="Пароль змінюється з поточним паролем">
          <div className="flex flex-col gap-4 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between min-[640px]:gap-6">
            <p className={cx(TEXT.muted, "flex items-start gap-3")}>
              <KeyIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-neutral-800" strokeWidth={1.7} />
              <span>Після зміни пароля всі інші ваші сеанси буде завершено. На цьому пристрої ви залишитеся в панелі.</span>
            </p>
            <Button variant="secondary" href="/admin/password" className="shrink-0">
              Змінити пароль
            </Button>
          </div>
        </Card>

        <Card
          title="Сеанси"
          subtitle={`Відкрито на ${countOf(Math.max(data.sessionsTotal ?? 0, data.sessions.length), ["пристрої", "пристроях", "пристроях"])}`}
          actions={
            others > 0 ? (
              <Button variant="secondary" size="sm" loading={ending === "others"} onClick={() => void endOthers()}>
                Завершити всі інші
              </Button>
            ) : undefined
          }
        >
          {data.sessions.length === 0 ? (
            <QuietEmpty
              icon={<ComputerDesktopIcon className="size-5" strokeWidth={1.7} />}
              title="Відкритих сеансів немає"
              text="Тут з'являться пристрої, з яких ви входите в панель."
            />
          ) : (
            <SessionList
              sessions={data.sessions}
              total={data.sessionsTotal}
              now={now}
              onEnd={(session) => void endSession(session)}
              ending={ending}
              label="Мої сеанси"
            />
          )}
        </Card>

        <Card title="Останні входи" subtitle="Входи в панель і невдалі спроби з вашим e-mail">
          {data.recent.length === 0 ? (
            <QuietEmpty
              icon={<ArrowRightEndOnRectangleIcon className="size-5" strokeWidth={1.7} />}
              title="Входів ще немає"
              text="Тут з'являться ваші входи в панель і спроби увійти з неправильним паролем."
            />
          ) : (
            <SignInList lines={data.recent} now={now} />
          )}
        </Card>
      </div>
    </Page>
  );
}
