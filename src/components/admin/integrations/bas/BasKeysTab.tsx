"use client";

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  NoSymbolIcon,
  PencilSquareIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useState, type FormEvent } from "react";
import { useStaff } from "../../shell/StaffProvider";
import { adminApi, type ApiFailure } from "../../lib/api";
import { cx, formatDate, formatDateTime, kyivDay } from "../../lib/format";
import { invalidate, useAdminQuery } from "../../lib/query";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { CheckboxGroup } from "../../ui/Checkbox";
import { confirmDialog, promptDialog } from "../../ui/ConfirmDialog";
import { DataTable, TwoLineCell, type Column } from "../../ui/DataTable";
import { DateInput } from "../../ui/DateInput";
import { KebabMenu, type MenuItem } from "../../ui/DropdownMenu";
import { Input } from "../../ui/Input";
import { CopyButton } from "../../ui/KeyValue";
import { Modal, ModalFooter } from "../../ui/Modal";
import { PageSection } from "../../ui/Page";
import { EmptyState } from "../../ui/States";
import { toast, toastError } from "../../ui/Toast";
import { SURFACE, TEXT, type Tone } from "../../ui/tokens";
import { Notice } from "../shared";
import {
  API_KEY_SCOPES,
  API_KEY_SCOPE_BADGES,
  API_KEY_STATE_LABELS,
  type ApiKeyAnswer,
  type ApiKeyCreatedAnswer,
  type ApiKeyDto,
  type ApiKeyScope,
  type ApiKeyState,
  type ListAnswer,
} from "../types";
import { basTabHref } from "./links";

// "Ключі доступу": the keys BAS signs its calls with. A new key is shown
// once, in a dialog with a copy button; afterwards only its first
// characters are known. A key can be renamed, given other scopes, switched
// off and on, or deleted.

const STATE_TONE: Record<ApiKeyState, Tone> = { active: "green", revoked: "neutral", expired: "amber" };
const SCOPE_TONE: Record<ApiKeyScope, Tone> = { "bas:read": "blue", "bas:write": "indigo" };

const SCOPE_OPTIONS = API_KEY_SCOPES.map((scope) => ({
  value: scope.value,
  label: API_KEY_SCOPE_BADGES[scope.value],
  hint: scope.hint,
}));

const KEY_ERRORS: Record<string, string> = {
  fields: "Перевірте дату: ключ має діяти хоча б до завтра і не довше 5 років.",
};

function ScopeBadges({ scopes }: { scopes: ApiKeyScope[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {scopes.map((scope) => (
        <Badge key={scope} tone={SCOPE_TONE[scope]}>
          {API_KEY_SCOPE_BADGES[scope]}
        </Badge>
      ))}
    </span>
  );
}

// --- create ------------------------------------------------------------------------------

function CreateKeyModal({
  open,
  minDay,
  onClose,
  onCreated,
}: {
  open: boolean;
  // The earliest expiry the server accepts (tomorrow), read when the dialog was opened.
  minDay: string;
  onClose: () => void;
  onCreated: (answer: ApiKeyCreatedAnswer) => void;
}) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ApiKeyScope[]>(["bas:read", "bas:write"]);
  const [expires, setExpires] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (busy) return;
    onClose();
    setName("");
    setScopes(["bas:read", "bas:write"]);
    setExpires("");
    setErrors({});
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!name.trim()) found.name = "Назвіть ключ: наприклад, «BAS, основна база»";
    if (scopes.length === 0) found.scopes = "Оберіть хоча б один дозвіл";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    const answer = await adminApi<ApiKeyCreatedAnswer>("/integrations/keys", {
      method: "POST",
      body: { name: name.trim(), scopes, expiresAt: expires || null },
    });
    setBusy(false);
    if (!answer.ok) {
      if (answer.error === "fields") setErrors({ expires: KEY_ERRORS.fields });
      toastError(answer, KEY_ERRORS);
      return;
    }
    onCreated(answer.data);
    setName("");
    setScopes(["bas:read", "bas:write"]);
    setExpires("");
    setErrors({});
  };

  return (
    <Modal
      open={open}
      onClose={close}
      busy={busy}
      title="Новий ключ доступу"
      description="Ключ передають розробнику BAS. Його покажуть лише один раз, одразу після створення."
      footer={<ModalFooter onCancel={close} confirmLabel="Створити ключ" form="bas-key-form" busy={busy} />}
    >
      <form id="bas-key-form" onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Input label="Назва" placeholder="BAS, основна база" value={name} onChange={setName} error={errors.name} required maxLength={120} autoFocus />
        <CheckboxGroup label="Дозволи" value={scopes} onChange={setScopes} options={SCOPE_OPTIONS} error={errors.scopes} />
        <DateInput
          label="Діє до"
          optional
          hint="Порожнє поле: ключ діє, доки його не вимкнуть."
          value={expires}
          onChange={setExpires}
          min={minDay || undefined}
          clearable
          error={errors.expires}
        />
      </form>
    </Modal>
  );
}

// Called from a click handler, never while rendering. The Kyiv day after
// today by the calendar (a clock-change day is 23 or 25 hours long).
function tomorrow(): string {
  const [year, month, day] = kyivDay(Date.now()).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

function CreatedKeyModal({ created, onClose }: { created: ApiKeyCreatedAnswer | null; onClose: () => void }) {
  return (
    <Modal
      open={created !== null}
      onClose={onClose}
      closeOnScrim={false}
      title="Ключ створено"
      description={created ? `«${created.record.name}»` : undefined}
      footer={
        <Button onClick={onClose} iconLeft={CheckCircleIcon}>
          Я зберіг ключ
        </Button>
      }
    >
      {created && (
        <div className="flex flex-col gap-4">
          <Notice tone="amber" icon={<ExclamationTriangleIcon />} title="Скопіюйте ключ зараз">
            Його більше не буде показано. Якщо ключ загубиться, створіть новий, а цей вимкніть.
          </Notice>
          <div className={cx(SURFACE.inset, "flex items-center gap-2 py-2 pl-4 pr-2")}>
            <KeyIcon aria-hidden className="size-5 shrink-0 text-neutral-500" />
            <span data-testid="new-api-key" className="min-w-0 flex-1 select-all break-all text-[15px] font-semibold leading-6 tracking-[0.02em] text-neutral-900">
              {created.key}
            </span>
            <CopyButton text={created.key} label="Ключ доступу" />
          </div>
          <p className={TEXT.caption}>
            Передайте ключ розробнику BAS разом з описом обміну з вкладки «Для розробника BAS». Ключ вставляють у заголовок кожного запиту:
            Authorization: Bearer і далі ключ.
          </p>
        </div>
      )}
    </Modal>
  );
}

// --- scopes ----------------------------------------------------------------------------------

function ScopesModal({ record, onClose }: { record: ApiKeyDto | null; onClose: () => void }) {
  const [scopes, setScopes] = useState<ApiKeyScope[]>([]);
  const [seen, setSeen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  // The ticks start from the key that was opened (render-phase reset).
  const id = record?.id ?? null;
  if (id !== seen) {
    setSeen(id);
    setScopes(record?.scopes ?? []);
    setError(undefined);
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!record) return;
    if (scopes.length === 0) {
      setError("Оберіть хоча б один дозвіл");
      return;
    }
    setBusy(true);
    const answer = await adminApi<ApiKeyAnswer>(`/integrations/keys/${encodeURIComponent(record.id)}`, { method: "PATCH", body: { scopes } });
    setBusy(false);
    if (!answer.ok) {
      toastError(answer);
      return;
    }
    toast.success("Дозволи ключа змінено");
    invalidate("/integrations/keys");
    invalidate("/integrations/bas/status");
    onClose();
  };

  return (
    <Modal
      open={record !== null}
      onClose={onClose}
      busy={busy}
      size="sm"
      title="Дозволи ключа"
      description={record ? `«${record.name}». Нові дозволи діють з наступного виклику BAS.` : undefined}
      footer={<ModalFooter onCancel={onClose} confirmLabel="Зберегти дозволи" form="bas-scopes-form" busy={busy} />}
    >
      <form id="bas-scopes-form" onSubmit={submit} noValidate>
        <CheckboxGroup aria-label="Дозволи" value={scopes} onChange={setScopes} options={SCOPE_OPTIONS} error={error} />
      </form>
    </Modal>
  );
}

// --- the list ----------------------------------------------------------------------------------

function refusal(answer: ApiFailure) {
  toastError(answer, { "not-found": "Цього ключа вже немає: можливо, його видалили." });
  invalidate("/integrations/keys");
}

export function BasKeysTab() {
  const { can } = useStaff();
  const canEdit = can("integrations.edit");
  const keys = useAdminQuery<ListAnswer<ApiKeyDto>>("/integrations/keys?limit=100&sort=-createdAt");
  const [creating, setCreating] = useState(false);
  const [minDay, setMinDay] = useState("");
  const startCreate = () => {
    setMinDay(tomorrow());
    setCreating(true);
  };
  const [created, setCreated] = useState<ApiKeyCreatedAnswer | null>(null);
  const [scoping, setScoping] = useState<ApiKeyDto | null>(null);

  const refresh = () => {
    invalidate("/integrations/keys");
    invalidate("/integrations/bas/status");
  };

  const rename = async (record: ApiKeyDto) => {
    const name = await promptDialog({
      title: "Перейменувати ключ",
      label: "Назва",
      initial: record.name,
      required: true,
      maxLength: 120,
      confirmLabel: "Зберегти назву",
    });
    if (name === null || name === record.name) return;
    const answer = await adminApi<ApiKeyAnswer>(`/integrations/keys/${encodeURIComponent(record.id)}`, { method: "PATCH", body: { name } });
    if (!answer.ok) return refusal(answer);
    toast.success("Ключ перейменовано");
    refresh();
  };

  const toggle = async (record: ApiKeyDto) => {
    if (record.isActive) {
      const yes = await confirmDialog({
        title: `Вимкнути ключ «${record.name}»?`,
        text: "BAS одразу отримуватиме відмову на виклики з цим ключем. Ключ можна буде увімкнути знову.",
        confirmLabel: "Вимкнути ключ",
        tone: "danger",
      });
      if (!yes) return;
    }
    const answer = await adminApi<ApiKeyAnswer>(`/integrations/keys/${encodeURIComponent(record.id)}`, {
      method: "PATCH",
      body: { isActive: !record.isActive },
    });
    if (!answer.ok) return refusal(answer);
    toast.success(answer.data.record.isActive ? "Ключ увімкнено" : "Ключ вимкнено");
    refresh();
  };

  const remove = async (record: ApiKeyDto) => {
    const yes = await confirmDialog({
      title: `Видалити ключ «${record.name}»?`,
      text: "BAS більше не зможе звертатися до сайту з цим ключем, і повернути його не вийде.",
      confirmLabel: "Видалити ключ",
      tone: "danger",
    });
    if (!yes) return;
    const answer = await adminApi(`/integrations/keys/${encodeURIComponent(record.id)}`, { method: "DELETE" });
    if (!answer.ok) return refusal(answer);
    toast.success("Ключ видалено");
    refresh();
  };

  const columns: Column<ApiKeyDto>[] = [
    {
      key: "name",
      header: "Ключ",
      cell: (record) => <TwoLineCell title={record.name} subtitle={`${record.prefix}...`} />,
    },
    {
      key: "scopes",
      header: "Дозволи",
      width: 250,
      hideBelow: 1024,
      cell: (record) => <ScopeBadges scopes={record.scopes} />,
    },
    {
      key: "state",
      header: "Стан",
      width: 170,
      cell: (record) => (
        <span className="flex flex-col items-start gap-1">
          <Badge tone={STATE_TONE[record.state]} dot>
            {API_KEY_STATE_LABELS[record.state]}
          </Badge>
          {record.expiresAt && (
            <span className={TEXT.caption}>
              {record.state === "expired" ? "з" : "до"} {formatDate(record.expiresAt)}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "created",
      header: "Створено",
      width: 170,
      hideBelow: 1280,
      cell: (record) => <TwoLineCell title={formatDate(record.createdAt)} subtitle={record.createdByName ?? undefined} />,
    },
    {
      key: "used",
      header: "Останнє використання",
      width: 200,
      hideBelow: 640,
      cell: (record) =>
        record.lastUsedAt ? (
          <TwoLineCell title={formatDateTime(record.lastUsedAt)} subtitle={record.lastUsedIp ? `з адреси ${record.lastUsedIp}` : undefined} />
        ) : (
          <span className="text-neutral-400">Ще не використовувався</span>
        ),
    },
  ];
  if (canEdit) {
    columns.push({
      key: "menu",
      header: <span className="sr-only">Дії</span>,
      width: 64,
      align: "right",
      interactive: true,
      cell: (record) => {
        const items: MenuItem[] = [
          { key: "rename", label: "Перейменувати", icon: PencilSquareIcon, onSelect: () => void rename(record) },
          { key: "scopes", label: "Змінити дозволи", icon: ShieldCheckIcon, onSelect: () => setScoping(record) },
          record.isActive
            ? { key: "off", label: "Вимкнути", icon: NoSymbolIcon, onSelect: () => void toggle(record) }
            : { key: "on", label: "Увімкнути", icon: CheckCircleIcon, onSelect: () => void toggle(record) },
          { key: "sep", divider: true },
          { key: "delete", label: "Видалити", icon: TrashIcon, tone: "danger", onSelect: () => void remove(record) },
        ];
        return <KebabMenu label={`Дії з ключем «${record.name}»`} items={items} />;
      },
    });
  }

  return (
    <PageSection
      title="Ключі доступу"
      description="BAS підписує кожен виклик ключем. Видно лише перші символи ключа: сам ключ показують один раз, під час створення."
      actions={
        canEdit ? (
          <Button iconLeft={PlusIcon} onClick={startCreate}>
            Створити ключ
          </Button>
        ) : undefined
      }
    >
      <DataTable
        caption="Ключі доступу BAS"
        columns={columns}
        rows={keys.data?.items}
        rowKey={(record) => record.id}
        loading={keys.loading}
        stale={keys.stale}
        error={keys.error}
        onRetry={keys.reload}
        empty={
          <EmptyState
            icon={<KeyIcon className="size-6" strokeWidth={1.6} />}
            title="Ключів ще немає"
            text="Ключ потрібен, щоб BAS міг звертатися до сайту. Створіть його і передайте розробнику BAS разом з описом обміну."
            action={
              canEdit ? (
                <Button iconLeft={PlusIcon} onClick={startCreate}>
                  Створити ключ
                </Button>
              ) : (
                <Button variant="secondary" href={basTabHref("dev")}>
                  Опис обміну для розробника
                </Button>
              )
            }
          />
        }
      />
      <CreateKeyModal
        open={creating}
        minDay={minDay}
        onClose={() => setCreating(false)}
        onCreated={(answer) => {
          setCreating(false);
          setCreated(answer);
          refresh();
        }}
      />
      <CreatedKeyModal created={created} onClose={() => setCreated(null)} />
      <ScopesModal record={scoping} onClose={() => setScoping(null)} />
    </PageSection>
  );
}
