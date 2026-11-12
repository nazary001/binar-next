"use client";

import { CheckCircleIcon, EnvelopeIcon, ExclamationTriangleIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { useState, type FormEvent } from "react";
import { useStaff } from "../shell/StaffProvider";
import { adminApi, type ApiFailure } from "../lib/api";
import { countOf, cx, formatDateTime, formatNumber } from "../lib/format";
import { invalidate, useAdminQuery } from "../lib/query";
import { Notice, SecretField, StatePill, withoutErrors } from "../integrations/shared";
import { mailState } from "../integrations/state";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { RadioGroup, Switch } from "../ui/Checkbox";
import { promptDialog } from "../ui/ConfirmDialog";
import { DataTable, DateCell, TwoLineCell, type Column } from "../ui/DataTable";
import { FilterBar } from "../ui/FilterBar";
import { FormActions, FormGrid, FormSection, useDirty, useUnsavedWarning } from "../ui/Form";
import { Input, SearchInput } from "../ui/Input";
import { Page, PageHeader, PageSection } from "../ui/Page";
import { Pagination } from "../ui/Pagination";
import { Select } from "../ui/Select";
import { Skeleton, SkeletonText } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/States";
import { Tabs } from "../ui/Tabs";
import { toast, toastError } from "../ui/Toast";
import { TEXT } from "../ui/tokens";
import { useListParams } from "../ui/useListParams";
import { OutboxDrawer, mailErrorText } from "./OutboxDrawer";
import {
  MAIL_AUTO_MAX_AGE_DAYS,
  MAIL_FIELD_ERRORS,
  MAIL_MAX_ATTEMPTS,
  MAIL_MISSING_LABELS,
  OUTBOX_AUTO_SEND_LABELS,
  OUTBOX_KINDS,
  OUTBOX_KIND_LABELS,
  type DeliverAnswer,
  type MailProvider,
  type MailSettingsDto,
  type MailSettingsInput,
  type MailSettingsView,
  type MailStatusDto,
  type MailTestAnswer,
  type OutboxKind,
  type OutboxListAnswer,
  type OutboxRow,
  type OutboxState,
} from "./types";

// /admin/integrations/mail: which service delivers the site's mail and
// what is mailed, a test message, and the outbox (every message the site
// wrote, by state; a row opens it in a drawer, also from ?id=<message>).

// --- provider settings -------------------------------------------------------------------

type MailForm = Pick<
  MailSettingsDto,
  "provider" | "from" | "replyTo" | "webhookUrl" | "notifyNewOrder" | "notifyNewLead" | "confirmOrderToCustomer"
>;

function formOf(settings: MailSettingsDto): MailForm {
  return {
    provider: settings.provider,
    from: settings.from,
    replyTo: settings.replyTo,
    webhookUrl: settings.webhookUrl,
    notifyNewOrder: settings.notifyNewOrder,
    notifyNewLead: settings.notifyNewLead,
    confirmOrderToCustomer: settings.confirmOrderToCustomer,
  };
}

const PROVIDER_OPTIONS: { value: MailProvider; label: string; hint: string }[] = [
  { value: "none", label: "Не надсилати", hint: "Листи збираються в черзі нижче: їх можна переглянути й опрацювати вручну." },
  {
    value: "resend",
    label: "Resend",
    hint: "Сервіс розсилки resend.com. Потрібні ключ API і підтверджений у Resend домен адреси відправника.",
  },
  {
    value: "webhook",
    label: "Webhook",
    hint: "Сайт передає кожен лист у JSON на вашу адресу: для власного поштового сервера чи сервісу автоматизації.",
  },
];

function fieldErrors(failure: ApiFailure): Record<string, string> {
  const fields = failure.data.fields;
  if (!fields || typeof fields !== "object") return {};
  const out: Record<string, string> = {};
  for (const [name, code] of Object.entries(fields as Record<string, unknown>)) {
    out[name] = typeof code === "string" ? (MAIL_FIELD_ERRORS[code] ?? code) : MAIL_FIELD_ERRORS.format;
  }
  return out;
}

type TestOutcome = { to: string; ok: true; id: string | null } | { to: string; ok: false; error: string };

// The origin a stored key belongs to (the server's rule,
// src/server/mail/provider.ts webhookOrigin).
function originOf(value: string): string {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : "";
  } catch {
    return "";
  }
}

function MailSettingsForm({ view }: { view: MailSettingsView }) {
  const { can, me } = useStaff();
  const canEdit = can("integrations.edit");
  const settings = view.settings;
  const [initial] = useState(() => formOf(settings));
  const [form, setForm] = useState(initial);
  const [apiKey, setApiKey] = useState("");
  const [removeKey, setRemoveKey] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<TestOutcome | null>(null);

  const dirty = useDirty(initial, form) || apiKey.trim() !== "" || removeKey;
  useUnsavedWarning(dirty);
  // The stored key belongs to the service and the webhook address it was
  // typed for: the server removes it when either changes and no new key is
  // typed in the same save.
  const keyWillDrop =
    settings.hasKey &&
    !apiKey.trim() &&
    !removeKey &&
    (form.provider !== initial.provider || (form.provider === "webhook" && originOf(form.webhookUrl) !== originOf(initial.webhookUrl)));
  const set = (patch: Partial<MailForm>) => {
    setForm((current) => ({ ...current, ...patch }));
    setErrors((current) => withoutErrors(current, Object.keys(patch)));
  };
  const provider = form.provider;

  const reset = () => {
    setForm(initial);
    setApiKey("");
    setRemoveKey(false);
    setErrors({});
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (provider === "webhook" && !form.webhookUrl.trim()) found.webhookUrl = "Вкажіть адресу, на яку сайт надсилатиме листи";
    if (provider !== "none" && !form.from.trim()) found.from = "Вкажіть відправника: без нього листи не надсилаються";
    if (provider === "resend" && !settings.hasKey && !apiKey.trim()) found.apiKey = "Вставте ключ API з кабінету Resend";
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error("Перевірте виділені поля.");
      return;
    }
    const body: MailSettingsInput = {
      ...form,
      from: form.from.trim(),
      replyTo: form.replyTo.trim(),
      webhookUrl: form.webhookUrl.trim(),
    };
    if (apiKey.trim()) body.apiKey = apiKey.trim();
    else if (removeKey) body.apiKey = "";
    setSaving(true);
    const answer = await adminApi<MailSettingsView>("/integrations/mail/settings", { method: "PUT", body });
    setSaving(false);
    if (!answer.ok) {
      setErrors(fieldErrors(answer));
      toastError(answer);
      return;
    }
    const saved = answer.data.status.configured ? "Налаштування пошти збережено: листи надсилаються" : "Налаштування пошти збережено";
    if (answer.data.keyDropped) {
      toast.show({
        tone: "success",
        title: saved,
        text: "Збережений ключ видалено, бо змінився сервіс або адреса webhook. Якщо новий сервіс потребує ключа, введіть його.",
      });
    } else {
      toast.success(saved);
    }
    setTest(null);
    invalidate("/integrations/mail");
    invalidate("/outbox");
  };

  const sendTest = async () => {
    const to = await promptDialog({
      title: "Надіслати тестовий лист",
      text: "Лист піде через збережений сервіс. Відповідь сервісу з'явиться під кнопкою.",
      label: "Адреса e-mail",
      placeholder: "name@example.com",
      initial: me.email,
      required: true,
      maxLength: 254,
      confirmLabel: "Надіслати",
    });
    if (to === null) return;
    setTesting(true);
    const answer = await adminApi<MailTestAnswer>("/integrations/mail/test", { method: "POST", body: { to } });
    setTesting(false);
    if (!answer.ok) {
      toastError(answer, { "bad-request": "Перевірте адресу e-mail." });
      return;
    }
    const result = answer.data.result;
    setTest(result.ok ? { to, ok: true, id: result.id } : { to, ok: false, error: result.error });
    invalidate("/integrations/log");
  };

  const keyNouns = {
    what: "ключ",
    replace: "Замінити ключ",
    remove: "Видалити ключ",
    removeQuestion: "Видалити ключ?",
    removeText:
      provider === "resend"
        ? "Після збереження листи перестануть надсилатися, доки не буде введено новий ключ."
        : "Після збереження сайт надсилатиме листи на адресу webhook без ключа.",
  };

  const inboxes = view.inboxes;
  const ordersInbox = inboxes.orders.filter(Boolean);
  const missing = view.status.missing.filter((item) => item !== "provider");
  const testBlocked = dirty ? "Спершу збережіть зміни." : settings.provider === "none" ? "Спершу оберіть сервіс і збережіть." : null;

  return (
    <form onSubmit={save} noValidate className="flex min-w-0 flex-col gap-4">
      <FormSection
        title="Сервіс надсилання"
        description="Через що сайт надсилає листи. Без сервісу листи лише збираються в черзі нижче."
      >
        <div className="flex flex-col gap-5">
          <RadioGroup
            aria-label="Сервіс надсилання"
            variant="tiles"
            direction="horizontal"
            value={provider}
            onChange={(next) => set({ provider: next })}
            options={PROVIDER_OPTIONS}
            disabled={!canEdit}
          />
          {provider !== "none" && (
            <FormGrid>
              {provider === "webhook" && (
                <Input
                  label="Адреса webhook"
                  type="url"
                  inputMode="url"
                  placeholder="https://mail.example.com/hooks/binar"
                  value={form.webhookUrl}
                  onChange={(webhookUrl) => set({ webhookUrl })}
                  error={errors.webhookUrl}
                  disabled={!canEdit}
                  required
                  hint="Сайт надсилає сюди JSON: to, subject, html, text, from, replyTo."
                  className="col-span-full"
                />
              )}
              <div className="col-span-full">
                <SecretField
                  label={provider === "resend" ? "Ключ API" : "Ключ доступу до webhook"}
                  hint={
                    provider === "resend"
                      ? "Створюється в кабінеті Resend, розділ API Keys; починається з re_."
                      : "Необов'язково: якщо вказати, сайт додає його в заголовок Authorization: Bearer."
                  }
                  stored={{ has: settings.hasKey, hint: settings.keyHint, readable: !view.status.missing.includes("secretsKey") }}
                  value={apiKey}
                  onChange={(value) => {
                    setApiKey(value);
                    setErrors((current) => withoutErrors(current, ["apiKey"]));
                  }}
                  removing={removeKey}
                  onRemovingChange={setRemoveKey}
                  canEdit={canEdit}
                  error={errors.apiKey}
                  placeholder={provider === "resend" ? "re_..." : "Ключ доступу"}
                  nouns={keyNouns}
                  disabled={!view.secretsAvailable}
                />
                {keyWillDrop && (
                  <Notice tone="amber" icon={<ExclamationTriangleIcon />} title="Збережений ключ буде видалено" className="mt-3">
                    {form.provider !== initial.provider
                      ? "Ключ належить попередньому сервісу: щоб він не пішов іншому, сайт видалить його під час збереження."
                      : "Адреса webhook веде на інший сервер, а ключ належить попередній адресі: сайт видалить його під час збереження."}{" "}
                    Якщо потрібен ключ, введіть його в полі вище.
                  </Notice>
                )}
              </div>
              <Input
                label="Відправник"
                placeholder="Binar 2000 <no-reply@binar-2000.com>"
                value={form.from}
                onChange={(from) => set({ from })}
                error={errors.from}
                disabled={!canEdit}
                required
                hint="Ім'я та адреса, які бачить одержувач."
              />
              <Input
                label="Адреса для відповідей"
                type="email"
                placeholder="info@binar-2000.com"
                value={form.replyTo}
                onChange={(replyTo) => set({ replyTo })}
                error={errors.replyTo}
                disabled={!canEdit}
                optional
                hint="Куди йдуть відповіді на листи сайту."
              />
            </FormGrid>
          )}
          {!dirty && settings.provider !== "none" && missing.length > 0 && (
            <Notice tone="amber" icon={<ExclamationTriangleIcon />} title="Листи не надсилаються">
              {missing.map((item) => MAIL_MISSING_LABELS[item]).join(". ")}.
            </Notice>
          )}
          {canEdit && (
            <div className="flex flex-col gap-3 border-t border-stroke-subtle pt-5">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" iconLeft={PaperAirplaneIcon} onClick={sendTest} loading={testing} disabled={testBlocked !== null}>
                  Надіслати тестовий лист
                </Button>
                <span className={TEXT.caption}>{testBlocked ?? "Перевірте, що листи справді доходять."}</span>
              </div>
              {test &&
                (test.ok ? (
                  <Notice tone="green" icon={<CheckCircleIcon />} title={`Сервіс прийняв лист для ${test.to}`}>
                    Перевірте скриньку, а також теку «Спам».{test.id ? ` Номер у сервісі: ${test.id}.` : ""}
                  </Notice>
                ) : (
                  <Notice tone="red" icon={<ExclamationTriangleIcon />} title="Лист не надіслано">
                    {mailErrorText(test.error)}
                  </Notice>
                ))}
            </div>
          )}
        </div>
      </FormSection>

      <FormSection
        title="Які листи надсилати"
        description="Сповіщення співробітникам ідуть на адреси із загальних налаштувань сайту."
        aside={
          can("settings.view") ? (
            <Button size="sm" variant="secondary" href="/admin/settings">
              Змінити адреси
            </Button>
          ) : undefined
        }
      >
        <div className="flex flex-col divide-y divide-stroke-subtle">
          <div className="pb-4">
            <Switch
              checked={form.notifyNewOrder}
              onChange={(notifyNewOrder) => set({ notifyNewOrder })}
              disabled={!canEdit}
              labelPosition="start"
              label="Нове замовлення: співробітникам"
              hint={ordersInbox.length > 0 ? `На ${ordersInbox.join(", ")}` : "Адреси для замовлень не вказано в загальних налаштуваннях: такі листи нікуди не підуть."}
            />
          </div>
          <div className="py-4">
            <Switch
              checked={form.notifyNewLead}
              onChange={(notifyNewLead) => set({ notifyNewLead })}
              disabled={!canEdit}
              labelPosition="start"
              label="Нова заявка з сайту: співробітникам"
              hint={
                inboxes.leadsIsDefault
                  ? `На ${inboxes.leads}: це адреса сайту, бо окремої пошти для заявок у загальних налаштуваннях немає.`
                  : `На ${inboxes.leads}`
              }
            />
          </div>
          <div className="pt-4">
            <Switch
              checked={form.confirmOrderToCustomer}
              onChange={(confirmOrderToCustomer) => set({ confirmOrderToCustomer })}
              disabled={!canEdit}
              labelPosition="start"
              label="Підтвердження замовлення: покупцю"
              hint="На e-mail, який покупець вказав під час оформлення."
            />
          </div>
        </div>
      </FormSection>

      {canEdit ? (
        <FormActions sticky status={dirty ? "Є незбережені зміни" : "Усі зміни збережено"}>
          <Button variant="secondary" onClick={reset} disabled={!dirty || saving}>
            Скасувати
          </Button>
          <Button type="submit" loading={saving} disabled={!dirty}>
            Зберегти зміни
          </Button>
        </FormActions>
      ) : (
        <Notice tone="neutral" title="Лише перегляд">
          Ваша роль може переглядати налаштування інтеграцій, але не змінювати їх.
        </Notice>
      )}
    </form>
  );
}

// --- the outbox ------------------------------------------------------------------------------

const STATE_TABS: { key: OutboxState; label: string }[] = [
  { key: "pending", label: "Очікують" },
  { key: "sent", label: "Надіслані" },
  { key: "failed", label: "Помилки" },
  { key: "unsendable", label: "Не можуть бути надіслані" },
];

const EMPTY: Record<OutboxState, { title: string; text: string }> = {
  pending: { title: "Черга порожня", text: "Нові листи сайту з'являються тут, доки їх не надіслано." },
  sent: { title: "Надісланих листів ще немає", text: "Тут з'являться листи, які сервіс прийняв." },
  failed: { title: "Помилок немає", text: "Лист потрапляє сюди, якщо сервіс його не прийняв." },
  unsendable: { title: "Таких листів немає", text: "Тут лишаються записи листів з одноразовими посиланнями, які надсилаються лише в момент створення." },
};

// The mark of a waiting message the automatic runs leave alone.
function AutoSendMark({ row }: { row: OutboxRow }) {
  if (!row.autoSend || row.autoSend === "yes") return null;
  return <span className={cx(TEXT.caption, "font-medium text-[#805300] [overflow-wrap:anywhere]")}>{OUTBOX_AUTO_SEND_LABELS[row.autoSend]}</span>;
}

function whenCell(row: OutboxRow) {
  if (row.state === "sent") return <DateCell value={row.sentAt} withTime />;
  if (row.state === "failed") {
    return (
      <span className="flex min-w-0 flex-col">
        <span className="line-clamp-1 font-medium text-[#b33a3a] [overflow-wrap:anywhere]">{mailErrorText(row.lastError) ?? "Помилка"}</span>
        {row.lastAttemptAt && <span className={TEXT.caption}>{formatDateTime(row.lastAttemptAt)}</span>}
        <AutoSendMark row={row} />
      </span>
    );
  }
  if (row.state === "unsendable") return <span className="text-neutral-500">Лише в момент створення</span>;
  return (
    <span className="flex min-w-0 flex-col">
      <span className="whitespace-nowrap text-neutral-500">Не надсилався</span>
      <AutoSendMark row={row} />
    </span>
  );
}

// What happens to the waiting messages without staff (deliver.ts
// AUTOMATIC_RUN, schedule.ts), said once above their list.
function WaitingNote({ configured }: { configured: boolean }) {
  return (
    <Notice tone="neutral" className="mb-4">
      {configured
        ? `Листи, що чекають, сайт надсилає сам: одразу після дії, яка їх створила, а повторні спроби робить, поки хтось працює в панелі (не частіше ніж раз на 5 хвилин). Лист, старший за ${MAIL_AUTO_MAX_AGE_DAYS} днів, або той, для якого вичерпано всі ${MAIL_MAX_ATTEMPTS} спроб, сам уже не піде: такі позначено в рядку, надішліть їх кнопкою «Надіслати всі, що очікують» або з картки листа.`
        : "Поки сервіс надсилання не підключено, листи лише чекають у черзі. Після підключення нові листи підуть самі, а ті, що вже чекають, можна надіслати кнопкою «Надіслати всі, що очікують»."}
    </Notice>
  );
}

function Outbox({ status }: { status: MailStatusDto | undefined }) {
  const { can } = useStaff();
  const canEdit = can("integrations.edit");
  const list = useListParams({ defaults: { state: "pending", sort: "-createdAt", limit: "20" } });
  const query = new URLSearchParams(list.queryString);
  query.delete("id");
  const outbox = useAdminQuery<OutboxListAnswer>(`/outbox?${query.toString()}`);
  const [delivering, setDelivering] = useState(false);
  const state = (list.get("state") || "pending") as OutboxState;
  const kind = (list.get("kind") || null) as OutboxKind | null;
  const counts = outbox.data?.counts;
  const configured = status?.configured ?? outbox.data?.status.configured ?? false;
  const openId = list.get("id") || null;
  const filtered = Boolean(list.q || kind);
  const waiting = counts ? counts.pending + counts.failed : 0;

  const deliverAll = async () => {
    setDelivering(true);
    const answer = await adminApi<DeliverAnswer>("/outbox/deliver", { method: "POST", body: {} });
    setDelivering(false);
    if (!answer.ok) {
      toastError(answer);
      return;
    }
    const { result, counts: after } = answer.data;
    invalidate("/outbox");
    invalidate("/integrations/log");
    if (!result.configured) {
      toast.error("Сервіс надсилання не підключено: листи лишаються в черзі.");
      return;
    }
    const left = after.pending + after.failed;
    const parts = [`Надіслано: ${formatNumber(result.sent)}`];
    if (result.failed) parts.push(`з помилкою: ${formatNumber(result.failed)}`);
    toast.show({
      tone: result.failed ? "error" : "success",
      title: parts.join(", "),
      text: left > 0 ? `Ще чекають: ${countOf(left, ["лист", "листи", "листів"])}. Повторні спроби йдуть із паузою.` : "Черга порожня.",
    });
  };

  const columns: Column<OutboxRow>[] = [
    {
      key: "kind",
      header: "Лист",
      cell: (row) => (
        <TwoLineCell
          title={row.kindLabel}
          subtitle={row.restricted ? "Деталі приховано: немає доступу до розділу" : row.summary || undefined}
        />
      ),
    },
    {
      key: "to",
      header: "Кому",
      sortKey: "to",
      width: 240,
      hideBelow: 640,
      cell: (row) => <span className="block truncate">{row.to}</span>,
    },
    {
      key: "created",
      header: "Створено",
      sortKey: "createdAt",
      firstSort: "desc",
      width: 120,
      hideBelow: 1024,
      cell: (row) => <DateCell value={row.createdAt} withTime />,
    },
    {
      key: "when",
      header: state === "sent" ? "Надіслано" : state === "failed" ? "Остання помилка" : "Надсилання",
      width: state === "failed" ? 260 : 180,
      cell: whenCell,
    },
    {
      key: "attempts",
      header: "Спроби",
      align: "right",
      sortKey: "attempts",
      firstSort: "desc",
      width: 96,
      hideBelow: 1280,
      cell: (row) => (
        <span className="tabular-nums text-neutral-700">
          {formatNumber(row.attempts)} / {formatNumber(MAIL_MAX_ATTEMPTS)}
        </span>
      ),
    },
  ];

  return (
    <PageSection
      title="Черга листів"
      description="Усі листи сайту. Натисніть рядок, щоб побачити лист так, як його отримає одержувач."
      actions={
        canEdit ? (
          <Button
            iconLeft={PaperAirplaneIcon}
            onClick={deliverAll}
            loading={delivering}
            disabled={!configured || waiting === 0}
            title={!configured ? "Спершу підключіть сервіс надсилання" : waiting === 0 ? "Немає листів, що чекають" : undefined}
          >
            Надіслати всі, що очікують
          </Button>
        ) : undefined
      }
    >
      <div className="min-w-0">
      <FilterBar
        search={
          <SearchInput label="Пошук за одержувачем" placeholder="Адреса одержувача" value={list.q} onChange={(q) => list.set({ q })} />
        }
        filters={
          <Select
            aria-label="Вид листа"
            placeholder="Усі види листів"
            clearable
            value={kind}
            onChange={(value) => list.set({ kind: value })}
            options={OUTBOX_KINDS.map((value) => ({ value, label: OUTBOX_KIND_LABELS[value] }))}
          />
        }
        chips={kind ? [{ key: "kind", label: `Вид: ${OUTBOX_KIND_LABELS[kind]}`, onRemove: () => list.set({ kind: null }) }] : []}
        onReset={filtered ? () => list.set({ q: null, kind: null }) : undefined}
      />
      <Tabs
        label="Стан листів"
        value={state}
        onChange={(key) => list.set({ state: key })}
        items={STATE_TABS.map((tab) => ({ ...tab, count: counts?.[tab.key] }))}
        className="mb-4"
      />
      {(state === "pending" || state === "failed") && <WaitingNote configured={configured} />}
      <DataTable
        caption="Черга листів"
        columns={columns}
        rows={outbox.data?.items}
        rowKey={(row) => row.id}
        loading={outbox.loading}
        stale={outbox.stale}
        error={outbox.error}
        onRetry={outbox.reload}
        sort={list.sort}
        onSort={(sort) => list.set({ sort })}
        onRowClick={(row) => list.set({ id: row.id }, { resetPage: false })}
        empty={
          filtered ? (
            <EmptyState
              title="За цими умовами листів немає"
              text="Змініть пошук або вид листа."
              action={
                <Button variant="secondary" onClick={() => list.set({ q: null, kind: null })}>
                  Скинути фільтри
                </Button>
              }
            />
          ) : (
            <EmptyState icon={<EnvelopeIcon className="size-6" strokeWidth={1.6} />} title={EMPTY[state].title} text={EMPTY[state].text} />
          )
        }
        footer={
          <Pagination
            page={list.page}
            limit={list.limit}
            total={outbox.data?.total ?? 0}
            onPage={(page) => list.set({ page })}
            onLimit={(limit) => list.set({ limit })}
          />
        }
      />
      </div>
      <OutboxDrawer id={openId} configured={configured} onClose={() => list.set({ id: null }, { resetPage: false })} />
    </PageSection>
  );
}

// --- the page ----------------------------------------------------------------------------------

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-4" data-loading="true">
      {[0, 1].map((index) => (
        <Card key={index}>
          <Skeleton className="h-5 w-48" />
          <SkeletonText lines={3} className="mt-4" />
        </Card>
      ))}
    </div>
  );
}

export function MailScreen() {
  const mail = useAdminQuery<MailSettingsView>("/integrations/mail/settings");
  const view = mail.data;
  const status = view?.status;
  const banner =
    status && !status.configured ? (
      status.provider === "none" ? (
        <Notice tone="amber" icon={<ExclamationTriangleIcon />} title="Листи лише збираються в черзі">
          Сервіс надсилання не підключено, тому жоден лист не йде одержувачам. Оберіть сервіс нижче: листи, що чекають, можна буде
          надіслати одразу.
        </Notice>
      ) : (
        <Notice tone="amber" icon={<ExclamationTriangleIcon />} title="Пошту налаштовано не повністю: листи не надсилаються">
          {status.missing.map((item) => MAIL_MISSING_LABELS[item]).join(". ")}.
        </Notice>
      )
    ) : null;

  return (
    <Page>
      <PageHeader
        back={{ href: "/admin/integrations", label: "Інтеграції" }}
        title="Пошта"
        subtitle="Листи сайту: про нові замовлення й заявки співробітникам, підтвердження покупцям, запрошення і зміни доступу."
        meta={status ? <StatePill state={mailState(status)} /> : <Skeleton shape="pill" className="h-7 w-36" />}
      />
      <div className="flex min-w-0 flex-col gap-8">
        {banner}
        {mail.error && !view ? (
          <Card>
            <ErrorState failure={mail.error} onRetry={mail.reload} />
          </Card>
        ) : view ? (
          <MailSettingsForm key={JSON.stringify(view.settings)} view={view} />
        ) : (
          <SettingsSkeleton />
        )}
        <Outbox status={status} />
      </div>
    </Page>
  );
}
