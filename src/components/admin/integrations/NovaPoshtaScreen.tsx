"use client";

import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  PrinterIcon,
  ShieldCheckIcon,
  SignalIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { useState, type FormEvent, type ReactNode } from "react";
import { useStaff } from "../shell/StaffProvider";
import { adminApi, errorMessage, type ApiFailure } from "../lib/api";
import { cx, formatNumber, qs } from "../lib/format";
import { invalidate, useAdminQuery } from "../lib/query";
import {
  NP_ERROR_MESSAGES,
  NP_SETTING_HINTS,
  PAYER_LABELS,
  PAYMENT_METHOD_LABELS,
  type NpCity,
  type NpContact,
  type NpPayer,
  type NpPaymentMethod,
  type NpSender,
  type NpSenderProfile,
  type NpTestResult,
  type NpWarehouse,
} from "../shipping/types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Switch } from "../ui/Checkbox";
import { Combobox } from "../ui/Combobox";
import { FormActions, FormGrid, useDirty, useUnsavedWarning } from "../ui/Form";
import { Input, NumberInput } from "../ui/Input";
import { Page, PageHeader } from "../ui/Page";
import { Select } from "../ui/Select";
import { Skeleton, SkeletonText } from "../ui/Skeleton";
import { ErrorState } from "../ui/States";
import { toast, toastError } from "../ui/Toast";
import { SURFACE, TEXT } from "../ui/tokens";
import { Notice, SecretField, StatePill, StepCard, withoutErrors, type StepStatus } from "./shared";
import { npSenderComplete, npState } from "./state";
import type { NpSettingsAnswer, NpSettingsView, NpSettingsViewInput } from "./types";

// /admin/integrations/nova-poshta: the set-up of the carrier in the order
// a manager does it (the key, the sender, the parcel defaults, the
// switches), each step a card with its own state, and one save bar. The
// key is sent only when typed; it is never shown again.

type Dims = { on: boolean; width: number | null; length: number | null; height: number | null };

type NpForm = {
  enabled: boolean;
  autoTrack: boolean;
  checkoutSearch: boolean;
  sender: NpSenderProfile;
  defaultWeight: number | null;
  defaultSeats: number | null;
  defaultDescription: string;
  defaultPayer: NpPayer;
  defaultPaymentMethod: NpPaymentMethod;
  dims: Dims;
};

function formOf(settings: NpSettingsView): NpForm {
  const d = settings.defaultDimensions;
  return {
    enabled: settings.enabled,
    autoTrack: settings.autoTrack,
    checkoutSearch: settings.checkoutSearch,
    sender: { ...settings.sender },
    defaultWeight: settings.defaultWeight,
    defaultSeats: settings.defaultSeats,
    defaultDescription: settings.defaultDescription,
    defaultPayer: settings.defaultPayer,
    defaultPaymentMethod: settings.defaultPaymentMethod,
    dims: d ? { on: true, width: d.width, length: d.length, height: d.height } : { on: false, width: null, length: null, height: null },
  };
}

type Errors = Record<string, string>;

function validate(form: NpForm): Errors {
  const errors: Errors = {};
  if (form.defaultWeight === null || form.defaultWeight < 0.1 || form.defaultWeight > 1000) errors.defaultWeight = "Від 0,1 до 1000 кг";
  if (form.defaultSeats === null || form.defaultSeats < 1 || form.defaultSeats > 100) errors.defaultSeats = "Від 1 до 100 місць";
  if (!form.defaultDescription.trim()) errors.defaultDescription = "Опишіть вміст посилки: без опису Нова Пошта не приймає накладну";
  if (form.dims.on) {
    for (const side of ["width", "length", "height"] as const) {
      const value = form.dims[side];
      if (value === null || value < 1 || value > 300) errors[`dims.${side}`] = "Від 1 до 300 см";
    }
  }
  return errors;
}

// The API answers "sender.phone", "apiKey"...: the same names the form uses.
function fieldErrors(failure: ApiFailure): Errors {
  const fields = failure.data.fields;
  if (!fields || typeof fields !== "object") return {};
  const out: Errors = {};
  for (const [name, message] of Object.entries(fields as Record<string, unknown>)) {
    if (typeof message === "string") out[name] = message;
  }
  return out;
}

function phoneOf(contact: NpContact): string {
  return contact.phones.split(/[,;\s]+/).find((part) => /\d{9,}/.test(part)) ?? "";
}

function cityValue(sender: NpSenderProfile): NpCity | null {
  if (!sender.cityRef) return null;
  return { label: sender.cityName, name: sender.cityName, area: "", cityRef: sender.cityRef, settlementRef: "", warehouses: 0, addressDelivery: false };
}

function warehouseValue(sender: NpSenderProfile): NpWarehouse | null {
  if (!sender.warehouseRef) return null;
  return {
    ref: sender.warehouseRef,
    label: sender.warehouseName,
    number: "",
    kind: "branch",
    category: "Branch",
    shortAddress: "",
    cityRef: sender.cityRef,
    city: sender.cityName,
    maxWeightPerSeat: null,
    maxWeightTotal: null,
    maxDeclaredCost: null,
    maxDimensions: null,
    index: "",
    working: true,
  };
}

async function searchCities(query: string): Promise<NpCity[]> {
  const answer = await adminApi<{ items: NpCity[] }>(`/np/cities?${qs({ q: query, limit: 20 })}`);
  if (!answer.ok) throw answer;
  return answer.data.items;
}

async function searchWarehouses(cityRef: string, query: string): Promise<NpWarehouse[]> {
  const answer = await adminApi<{ items: NpWarehouse[] }>(`/np/warehouses?${qs({ cityRef, q: query, kind: "branch", limit: 50 })}`);
  if (!answer.ok) throw answer;
  return answer.data.items;
}

// --- step 1: the key -------------------------------------------------------------------

type TestOutcome = { valid: boolean; senders: number; message?: string } | { failure: string };

function KeyStep({
  settings,
  apiKey,
  setApiKey,
  removing,
  setRemoving,
  error,
  canEdit,
}: {
  settings: NpSettingsView;
  apiKey: string;
  setApiKey: (value: string) => void;
  removing: boolean;
  setRemoving: (value: boolean) => void;
  error?: string;
  canEdit: boolean;
}) {
  const [testing, setTesting] = useState(false);
  const [outcome, setOutcome] = useState<TestOutcome | null>(null);
  const typed = apiKey.trim();
  // The sender list is what proves a stored key works; the sender step asks
  // for the same address, so this is one request for both.
  const stored = settings.hasKey && settings.keyReadable && !removing;
  const senders = useAdminQuery<{ ok: true; items: NpSender[] }>(stored ? "/np/senders" : null);
  const refused = stored && senders.error?.error === "np-auth";
  const status: StepStatus = stored && !refused ? "done" : "todo";
  const canTest = canEdit && !removing && (typed.length > 0 || (settings.hasKey && settings.keyReadable));

  const test = async () => {
    setTesting(true);
    setOutcome(null);
    const answer = await adminApi<NpTestResult>("/np/test", { method: "POST", body: typed ? { apiKey: typed } : {} });
    setTesting(false);
    if (answer.ok) {
      setOutcome({ valid: answer.data.valid, senders: answer.data.senders.length, message: answer.data.message });
      return;
    }
    const field = fieldErrors(answer).apiKey;
    setOutcome({ failure: field ?? errorMessage(answer, NP_ERROR_MESSAGES) });
  };

  return (
    <StepCard
      n={1}
      id="np-key"
      title="Ключ API"
      status={status}
      description={
        <>
          Ключ створюють у бізнес-кабінеті Нової Пошти:{" "}
          <span className="font-semibold text-neutral-800">Налаштування - Безпека - Створити ключ</span>. Скопіюйте його повністю
          і вставте сюди.
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SecretField
          id="np-api-key"
          label="Ключ API"
          hint="Ключ зберігається зашифрованим і більше ніде не показується."
          stored={{ has: settings.hasKey, hint: settings.apiKeyHint, readable: settings.keyReadable }}
          value={apiKey}
          onChange={(value) => {
            setApiKey(value);
            setOutcome(null);
          }}
          removing={removing}
          onRemovingChange={(value) => {
            setRemoving(value);
            setOutcome(null);
          }}
          canEdit={canEdit}
          error={error}
          placeholder="32 літери й цифри"
          nouns={{
            what: "ключ",
            replace: "Замінити ключ",
            remove: "Видалити ключ",
            removeQuestion: "Видалити ключ API?",
            removeText: "Після збереження накладні перестануть створюватися, доки не буде введено новий ключ.",
          }}
          disabled={!settings.secretsAvailable}
        />
        {refused && !typed && !outcome && (
          <Notice tone="red" icon={<ExclamationTriangleIcon />} title="Нова Пошта не приймає збережений ключ">
            Він недійсний або прострочений: створіть новий ключ у бізнес-кабінеті й замініть його тут.
          </Notice>
        )}
        {!settings.secretsAvailable && (
          <Notice tone="red" icon={<ExclamationTriangleIcon />} title="Ключ не можна зберегти">
            На сервері не налаштовано ключ шифрування секретів (SECRETS_KEY). Зверніться до розробника.
          </Notice>
        )}
        {canEdit && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" iconLeft={SignalIcon} onClick={test} loading={testing} disabled={!canTest}>
                Перевірити ключ
              </Button>
              <span className={TEXT.caption}>
                {typed ? "Перевіримо введений ключ, нічого не зберігаючи." : settings.hasKey ? "Перевіримо збережений ключ." : "Спершу вставте ключ."}
              </span>
            </div>
            {outcome &&
              ("failure" in outcome ? (
                <Notice tone="red" icon={<ExclamationTriangleIcon />} title="Перевірити не вдалося">
                  {outcome.failure}
                </Notice>
              ) : outcome.valid ? (
                <Notice tone="green" icon={<CheckCircleIcon />} title="Ключ працює">
                  {outcome.senders > 0
                    ? `Нова Пошта бачить відправників: ${formatNumber(outcome.senders)}.${typed ? " Збережіть зміни, щоб обрати відправника." : ""}`
                    : "Нова Пошта прийняла ключ, але в кабінеті немає жодного відправника."}
                </Notice>
              ) : (
                <Notice tone="red" icon={<ExclamationTriangleIcon />} title="Нова Пошта не прийняла ключ">
                  {outcome.message ? `Відповідь Нової Пошти: «${outcome.message}». ` : ""}
                  Перевірте, що ключ скопійовано повністю і що він не прострочений.
                </Notice>
              ))}
          </div>
        )}
      </div>
    </StepCard>
  );
}

// --- step 2: the sender ----------------------------------------------------------------------

function SenderStep({
  settings,
  form,
  setSender,
  errors,
  canEdit,
  keyPending,
}: {
  settings: NpSettingsView;
  form: NpForm;
  setSender: (patch: Partial<NpSenderProfile>) => void;
  errors: Errors;
  canEdit: boolean;
  keyPending: boolean;
}) {
  const ready = settings.hasKey && settings.keyReadable;
  const senders = useAdminQuery<{ ok: true; items: NpSender[] }>(ready ? "/np/senders" : null);
  const ref = form.sender.counterpartyRef;
  const contacts = useAdminQuery<{ ok: true; items: NpContact[] }>(ready && ref ? `/np/senders/${encodeURIComponent(ref)}/contacts` : null);
  const sender = form.sender;
  const complete = npSenderComplete(sender);
  const status: StepStatus = !ready ? "locked" : complete ? "done" : "todo";
  const locked = !ready || !canEdit;

  const senderOptions = (senders.data?.items ?? []).map((item) => ({
    value: item.ref,
    label: item.name,
    hint: [item.city, item.edrpou ? `ЄДРПОУ ${item.edrpou}` : ""].filter(Boolean).join(", ") || undefined,
  }));
  // A stored sender the list does not hold (yet) still shows by its name.
  if (ref && !senderOptions.some((option) => option.value === ref)) {
    senderOptions.unshift({ value: ref, label: sender.counterpartyName || "Збережений відправник", hint: undefined });
  }
  const contactOptions = (contacts.data?.items ?? []).map((item) => ({
    value: item.ref,
    label: item.name,
    hint: item.phones || undefined,
  }));
  if (sender.contactRef && !contactOptions.some((option) => option.value === sender.contactRef)) {
    contactOptions.unshift({ value: sender.contactRef, label: sender.contactName || "Збережена контактна особа", hint: undefined });
  }

  return (
    <StepCard
      n={2}
      id="np-sender"
      title="Відправник"
      status={status}
      description="Від чийого імені йдуть посилки, хто їх передає і у якому відділенні. Ці дані потрапляють у кожну накладну."
    >
      {!ready ? (
        <Notice tone="neutral" title="Спершу збережіть робочий ключ API">
          {keyPending
            ? "Збережіть зміни: список відправників Нова Пошта віддає лише за збереженим ключем."
            : "Список відправників і контактних осіб Нова Пошта віддає лише за ключем вашого бізнес-кабінету."}
        </Notice>
      ) : (
        <div className="flex flex-col gap-4">
          {senders.error && (
            <Notice
              tone="red"
              icon={<ExclamationTriangleIcon />}
              title="Список відправників не завантажився"
              action={
                <Button size="sm" variant="secondary" onClick={senders.reload}>
                  Спробувати ще раз
                </Button>
              }
            >
              {errorMessage(senders.error, NP_ERROR_MESSAGES)}
            </Notice>
          )}
          <FormGrid>
            <Select
              label="Відправник"
              placeholder={senders.loading ? "Завантажуємо список..." : "Оберіть відправника"}
              value={sender.counterpartyRef || null}
              options={senderOptions}
              disabled={locked || senders.loading}
              error={errors["sender.counterpartyRef"]}
              onChange={(value) => {
                const chosen = senders.data?.items.find((item) => item.ref === value);
                setSender({ counterpartyRef: value, counterpartyName: chosen?.name ?? "", contactRef: "", contactName: "" });
              }}
              className="col-span-full"
            />
            <Select
              label="Контактна особа"
              hint="Хто передає посилки; його ім'я і телефон бачить перевізник."
              placeholder={!ref ? "Спершу оберіть відправника" : contacts.loading ? "Завантажуємо..." : "Оберіть контактну особу"}
              value={sender.contactRef || null}
              options={contactOptions}
              disabled={locked || !ref || contacts.loading}
              error={errors["sender.contactRef"] ?? (contacts.error ? errorMessage(contacts.error, NP_ERROR_MESSAGES) : undefined)}
              onChange={(value) => {
                const chosen = contacts.data?.items.find((item) => item.ref === value);
                setSender({
                  contactRef: value,
                  contactName: chosen?.name ?? "",
                  ...(chosen && !sender.phone ? { phone: phoneOf(chosen) } : {}),
                });
              }}
            />
            <Input
              label="Телефон відправника"
              type="tel"
              inputMode="tel"
              placeholder="0671234567"
              value={sender.phone}
              onChange={(phone) => setSender({ phone })}
              disabled={locked}
              error={errors["sender.phone"]}
            />
            <Combobox<NpCity>
              label="Місто відправки"
              placeholder="Почніть вводити назву"
              value={cityValue(sender)}
              onChange={(city) =>
                setSender({ cityRef: city?.cityRef ?? "", cityName: city?.label ?? "", warehouseRef: "", warehouseName: "" })
              }
              search={searchCities}
              getKey={(city) => city.cityRef}
              getLabel={(city) => city.label}
              renderOption={(city) => (
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{city.label}</span>
                  {city.warehouses > 0 && <span className={TEXT.caption}>Відділень і поштоматів: {formatNumber(city.warehouses)}</span>}
                </span>
              )}
              minChars={2}
              disabled={locked}
              error={errors["sender.cityRef"]}
            />
            <Combobox<NpWarehouse>
              label="Відділення, де передаєте посилки"
              placeholder={sender.cityRef ? "Номер або вулиця" : "Спершу оберіть місто"}
              value={warehouseValue(sender)}
              onChange={(warehouse) => setSender({ warehouseRef: warehouse?.ref ?? "", warehouseName: warehouse?.label ?? "" })}
              search={(query) => searchWarehouses(sender.cityRef, query)}
              searchKey={sender.cityRef}
              getKey={(warehouse) => warehouse.ref}
              getLabel={(warehouse) => warehouse.label}
              disabled={locked || !sender.cityRef}
              error={errors["sender.warehouseRef"]}
              className="col-span-full"
            />
          </FormGrid>
        </div>
      )}
    </StepCard>
  );
}

// --- step 3: the parcel defaults --------------------------------------------------------------

const PAYER_OPTIONS = (Object.keys(PAYER_LABELS) as NpPayer[]).map((value) => ({ value, label: PAYER_LABELS[value] }));
const METHOD_OPTIONS = (Object.keys(PAYMENT_METHOD_LABELS) as NpPaymentMethod[]).map((value) => ({
  value,
  label: PAYMENT_METHOD_LABELS[value],
}));

function ParcelStep({
  form,
  set,
  errors,
  canEdit,
}: {
  form: NpForm;
  set: (patch: Partial<NpForm>) => void;
  errors: Errors;
  canEdit: boolean;
}) {
  const dims = form.dims;
  const setDims = (patch: Partial<Dims>) => set({ dims: { ...dims, ...patch } });
  return (
    <StepCard
      n={3}
      id="np-parcel"
      title="Типові параметри посилки"
      status="done"
      description="З цих значень починається кожна нова накладна; менеджер змінює їх під конкретне замовлення."
    >
      <div className="flex flex-col gap-5">
        <FormGrid>
          <NumberInput
            label="Вага"
            suffix="кг"
            min={0.1}
            max={1000}
            step={0.1}
            value={form.defaultWeight}
            onChange={(defaultWeight) => set({ defaultWeight })}
            disabled={!canEdit}
            error={errors.defaultWeight}
          />
          <NumberInput
            label="Кількість місць"
            min={1}
            max={100}
            step={1}
            precision={0}
            stepper
            value={form.defaultSeats}
            onChange={(defaultSeats) => set({ defaultSeats })}
            disabled={!canEdit}
            error={errors.defaultSeats}
          />
          <Input
            label="Опис вмісту"
            value={form.defaultDescription}
            onChange={(defaultDescription) => set({ defaultDescription })}
            maxLength={120}
            disabled={!canEdit}
            error={errors.defaultDescription}
            className="col-span-full"
          />
          <Select
            label="Хто платить за доставку"
            value={form.defaultPayer}
            options={PAYER_OPTIONS}
            onChange={(defaultPayer) => set({ defaultPayer })}
            disabled={!canEdit}
          />
          <Select
            label="Форма оплати доставки"
            value={form.defaultPaymentMethod}
            options={METHOD_OPTIONS}
            onChange={(defaultPaymentMethod) => set({ defaultPaymentMethod })}
            disabled={!canEdit}
          />
        </FormGrid>
        <div className={cx(SURFACE.inset, "flex flex-col gap-4 p-4")}>
          <Switch
            checked={dims.on}
            onChange={(on) => setDims({ on })}
            disabled={!canEdit}
            labelPosition="start"
            label="Типові розміри посилки"
            hint="Підставляються в накладну, коли потрібні розміри: поштомат без них посилку не приймає."
          />
          {dims.on && (
            <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
              <NumberInput
                label="Ширина"
                suffix="см"
                min={1}
                max={300}
                step={1}
                value={dims.width}
                onChange={(width) => setDims({ width })}
                disabled={!canEdit}
                error={errors["dims.width"]}
              />
              <NumberInput
                label="Довжина"
                suffix="см"
                min={1}
                max={300}
                step={1}
                value={dims.length}
                onChange={(length) => setDims({ length })}
                disabled={!canEdit}
                error={errors["dims.length"]}
              />
              <NumberInput
                label="Висота"
                suffix="см"
                min={1}
                max={300}
                step={1}
                value={dims.height}
                onChange={(height) => setDims({ height })}
                disabled={!canEdit}
                error={errors["dims.height"]}
              />
            </div>
          )}
        </div>
      </div>
    </StepCard>
  );
}

// --- step 4: behaviour ---------------------------------------------------------------------------

function BehaviourStep({
  form,
  set,
  canEdit,
  senderComplete,
  hasKey,
}: {
  form: NpForm;
  set: (patch: Partial<NpForm>) => void;
  canEdit: boolean;
  senderComplete: boolean;
  hasKey: boolean;
}) {
  return (
    <StepCard
      n={4}
      id="np-behaviour"
      title="Поведінка"
      badge={<Badge tone={form.enabled ? "green" : "neutral"}>{form.enabled ? "Інтеграцію увімкнено" : "Інтеграцію вимкнено"}</Badge>}
      description="Що інтеграція робить сама. Зміни набувають чинності після збереження."
    >
      <div className="flex flex-col divide-y divide-stroke-subtle">
        <div className="pb-4">
          <Switch
            checked={form.enabled}
            onChange={(enabled) => set({ enabled })}
            disabled={!canEdit}
            labelPosition="start"
            label="Інтеграцію увімкнено"
            hint={
              form.enabled && (!hasKey || !senderComplete)
                ? "Накладні почнуть створюватися, щойно буде збережено ключ і заповнено відправника."
                : NP_SETTING_HINTS.enabled
            }
          />
        </div>
        <div className="py-4">
          <Switch
            checked={form.autoTrack}
            onChange={(autoTrack) => set({ autoTrack })}
            disabled={!canEdit}
            labelPosition="start"
            label="Оновлювати статуси посилок самостійно"
            hint={NP_SETTING_HINTS.autoTrack}
          />
        </div>
        <div className="pt-4">
          <Switch
            checked={form.checkoutSearch}
            onChange={(checkoutSearch) => set({ checkoutSearch })}
            disabled={!canEdit}
            labelPosition="start"
            label="Справжній пошук міст і відділень при оформленні замовлення на сайті"
            hint={NP_SETTING_HINTS.checkoutSearch}
          />
        </div>
      </div>
    </StepCard>
  );
}

// --- the side card ----------------------------------------------------------------------------------

function Ability({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-bg-cabinet [&>svg]:size-5 [&>svg]:[stroke-width:1.7]">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={TEXT.bodyStrong}>{title}</span>
        <span className={TEXT.caption}>{text}</span>
      </span>
    </li>
  );
}

function AbilitiesCard() {
  const { can } = useStaff();
  return (
    <Card title="Що вміє інтеграція">
      <ul className="flex flex-col gap-4">
        <Ability icon={<MapPinIcon />} title="Пошук міст і відділень" text="Працює завжди, навіть без ключа: на ньому стоять форми доставки в панелі." />
        <Ability icon={<TruckIcon />} title="Накладні зі сторінки замовлення" text="Менеджер створює накладну в один крок; відправник і типові параметри беруться звідси." />
        <Ability icon={<ShieldCheckIcon />} title="Відстеження" text="Статус посилки оновлюється з Нової Пошти; номер накладної бачить покупець." />
        <Ability icon={<PrinterIcon />} title="Друк" text="Накладна та маркування 100 x 100 мм у PDF прямо з замовлення." />
      </ul>
      <div className="mt-6 flex flex-col gap-2">
        {can("shipping.view") && (
          <Button variant="secondary" href="/admin/shipping" fullWidth>
            Усі відправлення
          </Button>
        )}
        <Button variant="ghost" href={`/admin/integrations/log?${qs({ system: "nova-poshta" })}`} fullWidth>
          Журнал обміну з Новою Поштою
        </Button>
      </div>
    </Card>
  );
}

// --- the form -------------------------------------------------------------------------------------------

function NovaPoshtaForm({ settings }: { settings: NpSettingsView }) {
  const { can } = useStaff();
  const canEdit = can("integrations.edit");
  const [initial] = useState(() => formOf(settings));
  const [form, setForm] = useState(initial);
  const [apiKey, setApiKey] = useState("");
  const [removeKey, setRemoveKey] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const formDirty = useDirty(initial, form);
  const dirty = formDirty || apiKey.trim() !== "" || removeKey;
  useUnsavedWarning(dirty);

  const set = (patch: Partial<NpForm>) => {
    setForm((current) => ({ ...current, ...patch }));
    setErrors((current) => withoutErrors(current, Object.keys(patch)));
  };
  const setSender = (patch: Partial<NpSenderProfile>) => {
    setForm((current) => ({ ...current, sender: { ...current.sender, ...patch } }));
    setErrors((current) => withoutErrors(current, Object.keys(patch).map((name) => `sender.${name}`)));
  };

  const reset = () => {
    setForm(initial);
    setApiKey("");
    setRemoveKey(false);
    setErrors({});
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error("Перевірте виділені поля.");
      return;
    }
    const body: NpSettingsViewInput = {
      enabled: form.enabled,
      autoTrack: form.autoTrack,
      checkoutSearch: form.checkoutSearch,
      sender: form.sender,
      defaultWeight: form.defaultWeight ?? undefined,
      defaultSeats: form.defaultSeats ?? undefined,
      defaultDescription: form.defaultDescription.trim(),
      defaultPayer: form.defaultPayer,
      defaultPaymentMethod: form.defaultPaymentMethod,
      defaultDimensions:
        form.dims.on && form.dims.width && form.dims.length && form.dims.height
          ? { width: form.dims.width, length: form.dims.length, height: form.dims.height }
          : null,
    };
    if (apiKey.trim()) body.apiKey = apiKey.trim();
    else if (removeKey) body.apiKey = "";
    setSaving(true);
    const answer = await adminApi<NpSettingsAnswer>("/np/settings", { method: "PUT", body });
    setSaving(false);
    if (!answer.ok) {
      const fields = fieldErrors(answer);
      setErrors(fields);
      toastError(answer, NP_ERROR_MESSAGES);
      return;
    }
    const keyNote = body.apiKey === "" ? "Ключ видалено." : body.apiKey ? "Новий ключ збережено." : undefined;
    toast.show({ tone: "success", title: "Налаштування Нової Пошти збережено", text: keyNote ?? "Зміни діють одразу." });
    invalidate("/np/settings");
    // A new key may see other senders; a removed one sees none (the form
    // that asks for them is gone with it).
    if (body.apiKey) invalidate("/np/senders");
  };

  return (
    <form onSubmit={save} noValidate className="flex min-w-0 flex-col gap-4">
      <KeyStep
        settings={settings}
        apiKey={apiKey}
        setApiKey={(value) => {
          setApiKey(value);
          setErrors((current) => withoutErrors(current, ["apiKey"]));
        }}
        removing={removeKey}
        setRemoving={setRemoveKey}
        error={errors.apiKey}
        canEdit={canEdit}
      />
      <SenderStep settings={settings} form={form} setSender={setSender} errors={errors} canEdit={canEdit} keyPending={apiKey.trim() !== ""} />
      <ParcelStep form={form} set={set} errors={errors} canEdit={canEdit} />
      <BehaviourStep
        form={form}
        set={set}
        canEdit={canEdit}
        senderComplete={npSenderComplete(form.sender)}
        hasKey={(settings.hasKey && !removeKey) || apiKey.trim() !== ""}
      />
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

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4" data-loading="true">
      {[0, 1, 2].map((index) => (
        <div key={index} className={cx(SURFACE.card, SURFACE.cardPadding, "flex gap-4")}>
          <Skeleton shape="circle" className="size-9 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-4 pt-1.5">
            <Skeleton className="h-5 w-48" />
            <SkeletonText lines={2} />
            <Skeleton shape="pill" className="h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NovaPoshtaScreen() {
  const np = useAdminQuery<NpSettingsAnswer>("/np/settings");
  const settings = np.data?.settings;
  return (
    <Page>
      <PageHeader
        back={{ href: "/admin/integrations", label: "Інтеграції" }}
        title="Нова Пошта"
        subtitle="Чотири кроки: ключ, відправник, типова посилка і поведінка. Після цього накладні створюються прямо зі сторінки замовлення."
        meta={settings ? <StatePill state={npState(settings)} /> : <Skeleton shape="pill" className="h-7 w-36" />}
        actions={
          <Button variant="ghost" iconRight={ArrowTopRightOnSquareIcon} href="https://new.novaposhta.ua/" external>
            Бізнес-кабінет Нової Пошти
          </Button>
        }
      />
      <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {np.error && !settings ? (
            <Card>
              <ErrorState failure={np.error} onRetry={np.reload} />
            </Card>
          ) : settings ? (
            <NovaPoshtaForm key={JSON.stringify(settings)} settings={settings} />
          ) : (
            <FormSkeleton />
          )}
        </div>
        <div className="min-w-0 xl:sticky xl:top-[88px]">
          <AbilitiesCard />
        </div>
      </div>
    </Page>
  );
}
