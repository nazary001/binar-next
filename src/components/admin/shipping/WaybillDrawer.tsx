"use client";

import { ChevronDownIcon, ExclamationTriangleIcon, MapPinIcon, XCircleIcon } from "@heroicons/react/20/solid";
import { useEffect, useState, type ReactNode } from "react";
import { placeSearchText } from "@/components/checkout/novaPoshta";
import { adminApi, type ApiFailure } from "../lib/api";
import { invalidate, useAdminQuery } from "../lib/query";
import { cx, formatDate, formatMoney, qs } from "../lib/format";
import { useStaff } from "../shell/StaffProvider";
import { Button } from "../ui/Button";
import { Checkbox, RadioGroup } from "../ui/Checkbox";
import { Combobox } from "../ui/Combobox";
import { Drawer } from "../ui/Drawer";
import { FormGrid } from "../ui/Form";
import { Input, MoneyInput, NumberInput } from "../ui/Input";
import { SkeletonText } from "../ui/Skeleton";
import { ErrorState } from "../ui/States";
import { ORDER_STATUS } from "../ui/status";
import { toast } from "../ui/Toast";
import { TEXT } from "../ui/tokens";
import { CARRIER_NAME, SERVICE_KIND_CHOICES, dimensionsText, missingText, shippingError, weightText } from "./shared";
import {
  PAYER_LABELS,
  PAYMENT_METHOD_LABELS,
  RECIPIENT_NAME_HINT,
  SERVICE_TYPE_OF,
  type NpCity,
  type NpEstimateInput,
  type NpEstimateResult,
  type NpListAnswer,
  type NpPayer,
  type NpPaymentMethod,
  type NpStreet,
  type NpWarehouse,
  type NpWarehouseKind,
  type ServiceKind,
  type ShippingOrderDto,
  type WaybillInput,
  type WaybillPreview,
  type WaybillResult,
} from "./types";

// The "create a Nova Poshta waybill" drawer of an order. It starts from
// GET /shipping/orders/<id> (the recipient as the buyer gave it, the
// parcel defaults of the settings). When the customer picked the city and
// the branch or postomat from the carrier's lists at checkout, the order
// kept their references: the drawer looks those rows up again in the
// directory and opens with them chosen, so the manager only confirms.
// Otherwise (a typed city, an older order, a row the carrier no longer
// lists) the pickers start empty and the checkout text is the hint.
// Under the form: the cost and date the carrier promises (POST
// /np/estimate, quiet when it fails) and, on request, the exact requests
// that will go to the carrier (a dry run of the same route).

export type WaybillDrawerProps = {
  orderId: string;
  open: boolean;
  onClose: () => void;
  // After the waybill was created (and the order maybe moved on).
  onCreated: (result: WaybillResult) => void;
};

const SETTINGS_HREF = "/admin/integrations/nova-poshta";

export function WaybillDrawer({ orderId, open, onClose, onCreated }: WaybillDrawerProps) {
  const { can } = useStaff();
  const query = useAdminQuery<ShippingOrderDto>(open ? `/shipping/orders/${orderId}` : null);
  const [busy, setBusy] = useState(false);
  const [markShipped, setMarkShipped] = useState(true);
  // A new form for every opening: what was typed last time is not kept.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setSession((n) => n + 1);
      setMarkShipped(true);
    }
  }
  const data = query.data && query.data.order.id === orderId ? query.data : undefined;
  const formId = `waybill-${orderId}`;
  // "Shipped" is offered only where the order may move there now and the
  // role may change orders (the second request is the orders section's).
  const shipLabel = data && data.order.allowedStatuses.includes("shipped") && can("orders.edit") ? ORDER_STATUS.shipped.label : null;
  const ready = data?.integration.ready ?? false;

  // The rows the customer picked, looked up once per opening before the
  // form is made (it starts from them; a later answer of the same opening
  // does not remake it). null = still looking.
  const opening = `${orderId}:${session}`;
  const lookup = lookupKey(data, session);
  const [found, setFound] = useState<{ opening: string; picked: Picked } | null>(null);
  useEffect(() => {
    if (!lookup) return;
    let live = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), LOOKUP_MS);
    const [orderKey, sessionKey, input] = JSON.parse(lookup) as [string, number, LookupInput];
    void lookupPicked(input, controller.signal)
      .catch(() => NOTHING_PICKED)
      .then((picked) => {
        if (live) setFound({ opening: `${orderKey}:${sessionKey}`, picked });
      });
    return () => {
      live = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [lookup]);
  const picked = !lookup ? NOTHING_PICKED : found?.opening === opening ? found.picked : null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      busy={busy}
      width={640}
      title="Нова накладна"
      description={data ? `${CARRIER_NAME["nova-poshta"]}, замовлення №${data.order.number}` : CARRIER_NAME["nova-poshta"]}
      footer={
        data ? (
          <>
            {shipLabel && (
              <Checkbox
                checked={markShipped}
                onChange={setMarkShipped}
                label={`Перевести в статус «${shipLabel}»`}
                className="min-[640px]:mr-auto"
              />
            )}
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Скасувати
            </Button>
            <Button
              type="submit"
              form={formId}
              loading={busy}
              disabled={!ready || !picked}
              title={ready ? undefined : "Спершу налаштуйте Нову Пошту"}
            >
              Створити накладну
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Закрити
          </Button>
        )
      }
    >
      {data && picked ? (
        <WaybillForm
          key={`${orderId}:${session}`}
          formId={formId}
          data={data}
          picked={picked}
          markShipped={shipLabel !== null && markShipped}
          onBusy={setBusy}
          onCreated={onCreated}
        />
      ) : !data && query.error ? (
        <ErrorState failure={query.error} onRetry={query.reload} />
      ) : (
        <div className="flex flex-col gap-6 pt-2" data-loading="true">
          <SkeletonText lines={2} />
          <SkeletonText lines={4} />
          <SkeletonText lines={3} />
        </div>
      )}
    </Drawer>
  );
}

// --- the place the customer picked ------------------------------------------------------

// The carrier's rows of the city and the branch or postomat the customer
// picked at checkout, looked up again through the directory routes: the
// pickers then hold real rows (the carrier's labels, whether a courier
// goes there, the weight and size limits). A reference is trusted only
// when the carrier lists it under the text the order keeps: the city among
// the settlements of its name, the branch or postomat among those of that
// city found by its number. Anything not found (the carrier no longer
// lists it, it did not answer in LOOKUP_MS) is left for the manager to
// pick, with the checkout text as the hint.
type Picked = { city: NpCity | null; warehouse: NpWarehouse | null };

const NOTHING_PICKED: Picked = { city: null, warehouse: null };

const LOOKUP_MS = 8000;

type LookupInput = { cityRef: string; city: string; kind: NpWarehouseKind | null; warehouseRef: string; warehouse: string };

// null = nothing to look up (no city reference came with the order).
function lookupKey(data: ShippingOrderDto | undefined, session: number): string | null {
  const r = data?.recipient;
  if (!data || !r?.cityRef || !r.city.trim()) return null;
  const kind = r.serviceKind === "branch" || r.serviceKind === "postomat" ? r.serviceKind : null;
  const input: LookupInput = {
    cityRef: r.cityRef,
    city: r.city.trim(),
    kind,
    warehouseRef: kind ? (r.warehouseRef ?? "") : "",
    warehouse: r.warehouse,
  };
  return JSON.stringify([data.order.id, session, input]);
}

function sameRef(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

async function lookupPicked(input: LookupInput, signal: AbortSignal): Promise<Picked> {
  const [cities, places] = await Promise.all([
    adminApi<NpListAnswer<NpCity>>(`/np/cities?${qs({ q: input.city, limit: 50 })}`, { signal }),
    input.kind && input.warehouseRef
      ? adminApi<NpListAnswer<NpWarehouse>>(
          `/np/warehouses?${qs({ cityRef: input.cityRef, kind: input.kind, q: placeSearchText(input.warehouse), limit: 50 })}`,
          { signal },
        )
      : null,
  ]);
  const city = cities.ok ? (cities.data.items.find((c) => sameRef(c.cityRef, input.cityRef)) ?? null) : null;
  if (!city) return NOTHING_PICKED;
  const warehouse =
    places?.ok ? (places.data.items.find((w) => sameRef(w.ref, input.warehouseRef) && w.kind === input.kind) ?? null) : null;
  return { city, warehouse };
}

// --- the form ------------------------------------------------------------------------

type Form = {
  name: string;
  phone: string;
  city: NpCity | null;
  kind: ServiceKind;
  warehouse: NpWarehouse | null;
  street: NpStreet | null;
  house: string;
  flat: string;
  weight: number | null;
  seats: number | null;
  declaredCost: number | null;
  description: string;
  width: number | null;
  length: number | null;
  height: number | null;
  payer: NpPayer;
  paymentMethod: NpPaymentMethod;
  cod: number | null;
};

type Errors = Partial<Record<keyof Form | "dimensions", string>>;

// The carrier's answers to field rules come back under these paths.
const FIELD_OF_PATH: Record<string, keyof Errors> = {
  "recipient.name": "name",
  "recipient.phone": "phone",
  "recipient.cityRef": "city",
  "recipient.warehouseRef": "warehouse",
  "recipient.streetRef": "street",
  "recipient.house": "house",
  "params.dimensions": "dimensions",
};

function initialForm(data: ShippingOrderDto, picked: Picked): Form {
  const p = data.params;
  return {
    name: data.recipient.name,
    phone: data.recipient.phone,
    city: picked.city,
    kind: p.serviceKind,
    warehouse: picked.warehouse,
    street: null,
    house: data.recipient.house,
    flat: data.recipient.flat,
    weight: p.weight,
    seats: p.seats,
    declaredCost: p.declaredCost,
    description: p.description,
    width: p.dimensions?.width ?? null,
    length: p.dimensions?.length ?? null,
    height: p.dimensions?.height ?? null,
    payer: p.payer,
    paymentMethod: p.paymentMethod,
    cod: p.cod,
  };
}

// 380XXXXXXXXX from what was typed ("050 123 45 67", "+38050...").
function phoneDigits(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  const full = digits.length === 10 && digits.startsWith("0") ? `38${digits}` : digits.length === 9 ? `380${digits}` : digits;
  return /^380\d{9}$/.test(full) ? full : null;
}

function dimensionsOf(form: Form) {
  if (form.kind !== "postomat") return null;
  if (!form.width || !form.length || !form.height) return null;
  return { width: form.width, length: form.length, height: form.height };
}

function validate(form: Form): Errors {
  const errors: Errors = {};
  if (form.name.trim().split(/\s+/).filter(Boolean).length < 2) errors.name = "Вкажіть прізвище та ім'я одержувача";
  if (!phoneDigits(form.phone)) errors.phone = "Перевірте номер телефону: 10 цифр, наприклад 050 123 45 67";
  if (!form.city) errors.city = "Оберіть місто зі списку Нової Пошти";
  if (form.kind === "address") {
    if (!form.street) errors.street = "Оберіть вулицю зі списку";
    if (!form.house.trim()) errors.house = "Вкажіть номер будинку";
  } else if (!form.warehouse) {
    errors.warehouse = form.kind === "postomat" ? "Оберіть поштомат" : "Оберіть відділення";
  }
  if (!form.weight || form.weight < 0.1) errors.weight = "Вкажіть вагу, від 0,1 кг";
  if (!form.seats || form.seats < 1) errors.seats = "Хоча б одне місце";
  if (!form.declaredCost || form.declaredCost < 1) errors.declaredCost = "Вкажіть оголошену вартість, від 1 ₴";
  if (!form.description.trim()) errors.description = "Що всередині посилки";
  if (form.kind === "postomat" && !dimensionsOf(form)) errors.dimensions = "Для поштомата вкажіть розміри одного місця";
  return errors;
}

function waybillInput(form: Form): WaybillInput | null {
  if (Object.keys(validate(form)).length > 0 || !form.city) return null;
  const city = form.city;
  const recipient: WaybillInput["recipient"] = {
    name: form.name.trim().replace(/\s+/g, " "),
    phone: phoneDigits(form.phone) ?? form.phone,
    cityRef: city.cityRef,
    city: city.name,
  };
  if (form.kind === "address" && form.street) {
    recipient.streetRef = form.street.ref;
    recipient.street = form.street.label;
    recipient.house = form.house.trim();
    if (form.flat.trim()) recipient.flat = form.flat.trim();
  } else if (form.warehouse) {
    recipient.warehouseRef = form.warehouse.ref;
    recipient.warehouse = form.warehouse.label;
  }
  return {
    recipient,
    params: {
      weight: form.weight ?? 0,
      seats: form.seats ?? 1,
      declaredCost: form.declaredCost ?? 0,
      description: form.description.trim(),
      payer: form.payer,
      paymentMethod: form.paymentMethod,
      serviceKind: form.kind,
      cod: form.cod && form.cod > 0 ? form.cod : null,
      dimensions: dimensionsOf(form),
    },
  };
}

function estimateInput(form: Form): NpEstimateInput | null {
  if (!form.city || !form.weight || form.weight < 0.1 || !form.declaredCost || form.declaredCost < 1) return null;
  return {
    cityRef: form.city.cityRef,
    weight: form.weight,
    declaredCost: form.declaredCost,
    serviceType: SERVICE_TYPE_OF[form.kind],
    seats: form.seats && form.seats >= 1 ? form.seats : 1,
    cod: form.cod && form.cod > 0 ? form.cod : null,
    dimensions: dimensionsOf(form),
  };
}

// --- directory searches (the kit's Combobox wants a rejecting promise) -------------------

async function searchCities(q: string): Promise<NpCity[]> {
  const result = await adminApi<NpListAnswer<NpCity>>(`/np/cities?${qs({ q, limit: 20 })}`);
  if (!result.ok) throw result;
  return result.data.items;
}

function warehouseSearch(cityRef: string, kind: "branch" | "postomat") {
  return async (q: string): Promise<NpWarehouse[]> => {
    const result = await adminApi<NpListAnswer<NpWarehouse>>(`/np/warehouses?${qs({ cityRef, kind, q, limit: 50 })}`);
    if (!result.ok) throw result;
    return result.data.items;
  };
}

function streetSearch(cityRef: string) {
  return async (q: string): Promise<NpStreet[]> => {
    const result = await adminApi<NpListAnswer<NpStreet>>(`/np/streets?${qs({ cityRef, q })}`);
    if (!result.ok) throw result;
    return result.data.items;
  };
}

// The limits a branch or a postomat states, as one line.
function limitsText(w: NpWarehouse): string {
  const parts: string[] = [];
  if (w.maxWeightPerSeat) parts.push(`до ${weightText(w.maxWeightPerSeat)} на місце`);
  else if (w.maxWeightTotal) parts.push(`до ${weightText(w.maxWeightTotal)}`);
  if (w.maxDimensions) parts.push(`розмір до ${dimensionsText(w.maxDimensions)}`);
  return parts.join(", ");
}

function overLimit(form: Form): string | null {
  const w = form.warehouse;
  if (!w || form.kind === "address" || !form.weight) return null;
  const perSeat = form.weight / Math.max(1, form.seats ?? 1);
  if (w.maxWeightPerSeat && perSeat > w.maxWeightPerSeat) return `Це відділення приймає місця до ${weightText(w.maxWeightPerSeat)}.`;
  if (w.maxWeightTotal && form.weight > w.maxWeightTotal) return `Сюди можна надіслати до ${weightText(w.maxWeightTotal)}.`;
  return null;
}

// --- blocks --------------------------------------------------------------------------------

function Block({
  title,
  description,
  first = false,
  children,
}: {
  title: string;
  description?: ReactNode;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cx("flex flex-col gap-5", !first && "border-t border-stroke-subtle pt-6")}>
      <div>
        <h3 className={TEXT.cardTitle}>{title}</h3>
        {description && <p className={cx(TEXT.muted, "mt-1")}>{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Callout({ tone, title, children, action }: { tone: "amber" | "red"; title: string; children?: ReactNode; action?: ReactNode }) {
  const Icon = tone === "red" ? XCircleIcon : ExclamationTriangleIcon;
  return (
    <div
      role={tone === "red" ? "alert" : undefined}
      className={cx("flex gap-3 rounded-2xl p-4", tone === "red" ? "bg-[#fff0f0]" : "bg-[#fff5dd]")}
    >
      <Icon aria-hidden className={cx("mt-0.5 size-5 shrink-0", tone === "red" ? "text-[#d9534f]" : "text-[#d89a00]")} />
      <div className="min-w-0 flex-1">
        <p className={TEXT.bodyStrong}>{title}</p>
        {children && <div className={cx(TEXT.body, "mt-1 text-neutral-700 [overflow-wrap:anywhere]")}>{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

// What is left to do with the place the customer gave: confirm the rows
// already chosen, or find the rest in the carrier's directory.
function hintNote(data: ShippingOrderDto, picked: Picked): string {
  const r = data.recipient;
  const postomat = r.serviceKind === "postomat";
  if (!picked.city) return "Знайдіть це місце в довіднику Нової Пошти нижче: накладна потребує точного відділення, а не тексту.";
  if (r.serviceKind === "address") return "Місто вже вибрано: клієнт обрав його зі списку Нової Пошти. Вулицю знайдіть у довіднику нижче.";
  if (picked.warehouse) {
    return `Клієнт обрав місто й ${postomat ? "поштомат" : "відділення"} зі списків Нової Пошти: їх уже вибрано нижче, лишилося перевірити.`;
  }
  if (r.warehouseRef) {
    return `Місто вже вибрано, а ${postomat ? "поштомат" : "відділення"} із замовлення не вдалося знайти в довіднику Нової Пошти: оберіть його нижче.`;
  }
  return `Місто вже вибрано: клієнт обрав його зі списку Нової Пошти. ${postomat ? "Поштомат" : "Відділення"} знайдіть у довіднику нижче.`;
}

// What the buyer gave at checkout, so the manager can match it with the
// carrier's directory (or check the rows chosen from it).
function CheckoutHint({ data, picked }: { data: ShippingOrderDto; picked: Picked }) {
  const r = data.recipient;
  const place = r.serviceKind === "address" ? r.address : [r.city ? `м. ${r.city}` : "", r.warehouse].filter(Boolean).join(", ");
  if (!place && !data.order.deliveryMethod) return null;
  return (
    <div className="flex gap-3 rounded-2xl bg-bg-subtle p-4" data-picked={picked.city ? (picked.warehouse ? "all" : "city") : "none"}>
      <MapPinIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-neutral-500" />
      <div className="min-w-0">
        <p className={TEXT.caption}>Клієнт вказав при оформленні</p>
        {data.order.deliveryMethod && <p className={cx(TEXT.bodyStrong, "mt-1")}>{data.order.deliveryMethod}</p>}
        {place && <p className={cx(TEXT.body, "mt-0.5 [overflow-wrap:anywhere]")}>{place}</p>}
        <p className={cx(TEXT.caption, "mt-2")}>{hintNote(data, picked)}</p>
      </div>
    </div>
  );
}

type Keyed<T> = { key: string } & ({ ok: true; data: T } | { ok: false; failure: ApiFailure });

function EstimateLine({ form, senderReady }: { form: Form; senderReady: boolean }) {
  const input = estimateInput(form);
  const key = input && senderReady ? JSON.stringify(input) : null;
  const [answer, setAnswer] = useState<Keyed<NpEstimateResult> | null>(null);

  useEffect(() => {
    if (!key) return;
    let live = true;
    const timer = window.setTimeout(() => {
      void adminApi<NpEstimateResult>("/np/estimate", { method: "POST", body: JSON.parse(key) }).then((result) => {
        if (!live) return;
        setAnswer(result.ok ? { key, ok: true, data: result.data } : { key, ok: false, failure: result });
      });
    }, 600);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [key]);

  let text: ReactNode;
  if (!senderReady) text = "Порахуємо, коли в налаштуваннях Нової Пошти буде вказано місто відправника.";
  else if (!key) text = "Оберіть місто й укажіть вагу та вартість, щоб побачити ціну доставки.";
  else if (!answer || answer.key !== key) text = "Рахуємо...";
  else if (!answer.ok) text = "Зараз не вдалося порахувати: перевізник не відповів. Накладну це не зупиняє.";
  else {
    const e = answer.data;
    const parts = [
      e.cost !== null ? `доставка ${formatMoney(e.cost)}` : "",
      e.codCost ? `комісія за накладений платіж ${formatMoney(e.codCost)}` : "",
      e.deliveryDate ? `прибуде ${formatDate(e.deliveryDate)}` : "",
    ].filter(Boolean);
    text = parts.length ? (
      <span className="text-neutral-900">{parts.join(", ").replace(/^./, (c) => c.toUpperCase())}</span>
    ) : (
      "Перевізник не назвав ціну для цих даних."
    );
  }
  return (
    <div className="rounded-2xl bg-bg-subtle p-4" data-estimate={answer?.key === key && answer?.ok ? "done" : "pending"}>
      <p className={TEXT.caption}>Орієнтовна вартість і термін</p>
      <p className={cx(TEXT.muted, "mt-1 tabular-nums")} aria-live="polite">
        {text}
      </p>
    </div>
  );
}

const STEP_TITLES: Record<string, string> = {
  "Counterparty.save": "Одержувач",
  "Address.save": "Адреса одержувача",
  "InternetDocument.save": "Накладна",
};

function Preview({ orderId, form }: { orderId: string; form: Form }) {
  const [open, setOpen] = useState(false);
  const input = waybillInput(form);
  const key = open && input ? JSON.stringify(input) : null;
  const [answer, setAnswer] = useState<Keyed<{ preview: WaybillPreview }> | null>(null);

  useEffect(() => {
    if (!key) return;
    let live = true;
    const timer = window.setTimeout(() => {
      const body = { ...(JSON.parse(key) as WaybillInput), dryRun: true };
      void adminApi<{ preview: WaybillPreview }>(`/shipping/orders/${orderId}/waybill`, { method: "POST", body }).then((result) => {
        if (!live) return;
        setAnswer(result.ok ? { key, ok: true, data: result.data } : { key, ok: false, failure: result });
      });
    }, 400);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [key, orderId]);

  let body: ReactNode = null;
  if (open) {
    if (!input) body = <p className={TEXT.muted}>Заповніть обов&apos;язкові поля, щоб побачити запит.</p>;
    else if (!answer || answer.key !== key) body = <SkeletonText lines={4} />;
    else if (!answer.ok) {
      const fields = answer.failure.error === "fields" ? Object.values((answer.failure.data.fields ?? {}) as Record<string, string>) : [];
      body = <p className={TEXT.muted}>{fields.length ? fields.join(". ") : shippingError(answer.failure)}</p>;
    } else {
      body = (
        <ol className="flex flex-col gap-3" data-preview="ready">
          {answer.data.preview.steps.map((step, index) => {
            const method = `${step.modelName}.${step.calledMethod}`;
            return (
              <li key={method} className="min-w-0">
                <p className={TEXT.caption}>
                  {index + 1}. {STEP_TITLES[method] ?? method} ({method})
                </p>
                <pre className="admin-scroll mt-1.5 max-h-[320px] overflow-auto rounded-2xl bg-bg-subtle p-3 font-mono text-[12px] leading-[18px] text-neutral-800">
                  {JSON.stringify(step.methodProperties, null, 2)}
                </pre>
              </li>
            );
          })}
        </ol>
      );
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="group -mx-2 flex w-fit items-center gap-1.5 rounded-full px-2 py-1 text-[14px] font-semibold leading-5 text-neutral-900 outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-brand"
      >
        Що буде надіслано перевізнику
        <ChevronDownIcon aria-hidden className={cx("size-4 text-neutral-500 transition-[rotate] duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="flex flex-col gap-3">
          <p className={TEXT.caption}>
            Так виглядатимуть запити до Нової Пошти. Нічого не надсилається, доки ви не натиснете «Створити накладну».
          </p>
          {body}
        </div>
      )}
    </div>
  );
}

type FormProps = {
  formId: string;
  data: ShippingOrderDto;
  // What the form starts with in the city and place pickers.
  picked: Picked;
  markShipped: boolean;
  onBusy: (busy: boolean) => void;
  onCreated: (result: WaybillResult) => void;
};

function WaybillForm({ formId, data, picked, markShipped, onBusy, onCreated }: FormProps) {
  const [form, setForm] = useState<Form>(() => initialForm(data, picked));
  const [errors, setErrors] = useState<Errors>({});
  const [refusal, setRefusal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = data.integration.ready;
  const senderReady = !data.integration.missing.includes("sender.cityRef");

  const patch = (next: Partial<Form>) => {
    setForm((current) => ({ ...current, ...next }));
    const keys = Object.keys(next) as (keyof Errors)[];
    if (keys.some((k) => errors[k] || (["width", "length", "height", "kind"].includes(k) && errors.dimensions))) {
      setErrors((current) => {
        const copy = { ...current };
        for (const k of keys) delete copy[k];
        if (keys.some((k) => ["width", "length", "height", "kind"].includes(k))) delete copy.dimensions;
        return copy;
      });
    }
  };

  const submit = async () => {
    if (busy) return;
    setRefusal(null);
    const found = validate(form);
    setErrors(found);
    const input = waybillInput(form);
    if (Object.keys(found).length > 0 || !input) {
      toast.error("Перевірте виділені поля.");
      return;
    }
    if (!ready) return;
    setBusy(true);
    onBusy(true);
    const result = await adminApi<WaybillResult>(`/shipping/orders/${data.order.id}/waybill`, { method: "POST", body: input });
    if (!result.ok) {
      setBusy(false);
      onBusy(false);
      if (result.error === "fields") {
        const fields = (result.data.fields ?? {}) as Record<string, string>;
        const mapped: Errors = {};
        for (const [path, message] of Object.entries(fields)) mapped[FIELD_OF_PATH[path] ?? "name"] = message;
        setErrors(mapped);
        toast.error("Перевірте виділені поля.");
        return;
      }
      setRefusal(shippingError(result));
      return;
    }
    const created = result.data;
    const ttn = created.shipment.ttn ?? "";
    let statusNote = "";
    if (markShipped) {
      const moved = await adminApi(`/orders/${data.order.id}`, {
        method: "PATCH",
        body: { status: "shipped", comment: `Накладна Нової Пошти ${ttn}` },
      });
      if (!moved.ok) {
        toast.error(
          `Накладну створено, але статус замовлення не змінено: ${shippingError(moved, {
            state: "статус замовлення тим часом змінився",
            conflict: "замовлення тим часом змінили",
          })}`,
        );
      } else {
        statusNote = ` Замовлення переведено в статус «${ORDER_STATUS.shipped.label}».`;
      }
    }
    invalidate("/shipping");
    invalidate("/orders");
    setBusy(false);
    onBusy(false);
    toast.show({
      tone: "success",
      title: `Накладну ${ttn} створено`,
      text: [statusNote.trim(), ...created.warnings].filter(Boolean).join(" ") || "Номер уже в картці замовлення.",
    });
    onCreated(created);
  };

  const city = form.city;
  const warehouseKind = form.kind === "postomat" ? "postomat" : "branch";
  const limitWarning = overLimit(form);

  return (
    <form
      id={formId}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-6 pb-2"
    >
      {!ready && (
        <Callout
          tone="amber"
          title="Створити накладну поки не можна"
          action={
            <Button size="sm" variant="secondary" href={SETTINGS_HREF}>
              Налаштувати Нову Пошту
            </Button>
          }
        >
          {missingText(data.integration.missing)}. Форму можна заповнити й переглянути запит до перевізника, а номер накладної, створеної в
          кабінеті Нової Пошти, можна вказати вручну.
        </Callout>
      )}
      {refusal && (
        <Callout tone="red" title="Нова Пошта не створила накладну">
          {refusal}
        </Callout>
      )}

      <Block title="Одержувач" first>
        <CheckoutHint data={data} picked={picked} />
        <FormGrid>
          <Input
            label="Прізвище, ім'я та по батькові"
            value={form.name}
            onChange={(name) => patch({ name })}
            error={errors.name}
            hint={RECIPIENT_NAME_HINT}
            required
            autoComplete="off"
            className="col-span-full"
          />
          <Input
            label="Телефон"
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(phone) => patch({ phone })}
            error={errors.phone}
            required
            autoComplete="off"
          />
          <Combobox
            label="Місто"
            value={form.city}
            onChange={(next) => patch({ city: next, warehouse: null, street: null })}
            search={searchCities}
            getKey={(c) => c.cityRef}
            getLabel={(c) => c.label || c.name}
            minChars={2}
            placeholder="Почніть вводити назву"
            error={errors.city}
            required
            renderOption={(c) => (
              <>
                <span className="block font-semibold">{c.name}</span>
                <span className="block text-[12px] font-medium leading-4 text-neutral-500">
                  {[c.label !== c.name ? c.label : c.area, c.warehouses ? `${c.warehouses} відділень і поштоматів` : ""]
                    .filter(Boolean)
                    .join(" - ")}
                </span>
              </>
            )}
          />
          <RadioGroup
            label="Куди доставити"
            value={form.kind}
            onChange={(kind) => patch({ kind, warehouse: null })}
            options={SERVICE_KIND_CHOICES.map((choice) => ({
              ...choice,
              disabled: choice.value === "address" && city !== null && !city.addressDelivery,
            }))}
            direction="horizontal"
            hint={city && !city.addressDelivery ? "У цей населений пункт кур'єр Нової Пошти не возить." : undefined}
            className="col-span-full"
          />
          {form.kind === "address" ? (
            <>
              <Combobox
                label="Вулиця"
                value={form.street}
                onChange={(street) => patch({ street })}
                search={city ? streetSearch(city.cityRef) : async () => []}
                searchKey={city?.cityRef ?? null}
                getKey={(s) => s.ref}
                getLabel={(s) => s.label}
                minChars={2}
                disabled={!city}
                placeholder={city ? "Почніть вводити назву" : "Спершу оберіть місто"}
                error={errors.street}
                required
                className="col-span-full"
              />
              <Input
                label="Будинок"
                value={form.house}
                onChange={(house) => patch({ house })}
                error={errors.house}
                required
                maxLength={32}
              />
              <Input label="Квартира" value={form.flat} onChange={(flat) => patch({ flat })} optional maxLength={32} />
            </>
          ) : (
            <Combobox
              label={form.kind === "postomat" ? "Поштомат" : "Відділення"}
              value={form.warehouse}
              onChange={(warehouse) => patch({ warehouse })}
              search={city ? warehouseSearch(city.cityRef, warehouseKind) : async () => []}
              searchKey={city ? `${city.cityRef}:${warehouseKind}` : null}
              getKey={(w) => w.ref}
              getLabel={(w) => w.label}
              openOnFocus
              disabled={!city}
              placeholder={city ? "Номер або вулиця" : "Спершу оберіть місто"}
              emptyText={form.kind === "postomat" ? "Поштоматів не знайдено" : "Відділень не знайдено"}
              error={errors.warehouse}
              hint={form.warehouse ? limitsText(form.warehouse) || undefined : undefined}
              required
              className="col-span-full"
              renderOption={(w) => (
                <>
                  <span className="block">{w.label}</span>
                  {limitsText(w) && <span className="block text-[12px] font-medium leading-4 text-neutral-500">{limitsText(w)}</span>}
                </>
              )}
            />
          )}
        </FormGrid>
      </Block>

      <Block title="Посилка">
        <FormGrid>
          <NumberInput
            label="Вага"
            value={form.weight}
            onChange={(weight) => patch({ weight })}
            min={0.1}
            max={1000}
            step={0.5}
            precision={3}
            suffix="кг"
            error={errors.weight ?? limitWarning ?? undefined}
            required
          />
          <NumberInput
            label="Кількість місць"
            value={form.seats}
            onChange={(seats) => patch({ seats })}
            min={1}
            max={100}
            step={1}
            precision={0}
            stepper
            error={errors.seats}
            required
          />
          <MoneyInput
            label="Оголошена вартість"
            value={form.declaredCost}
            onChange={(declaredCost) => patch({ declaredCost })}
            min={1}
            error={errors.declaredCost}
            hint="Сума замовлення; від неї рахують страхування."
            required
          />
          <Input
            label="Опис вмісту"
            value={form.description}
            onChange={(description) => patch({ description })}
            maxLength={120}
            error={errors.description}
            required
          />
          {form.kind === "postomat" && (
            <fieldset className="col-span-full flex min-w-0 flex-col gap-2">
              <legend className={cx(TEXT.label, "mb-2")}>
                Розміри одного місця, см{" "}
                <span className="text-negative" aria-hidden>
                  *
                </span>
              </legend>
              <div className="grid grid-cols-3 gap-3">
                <NumberInput
                  aria-label="Ширина, см"
                  placeholder="Ширина"
                  value={form.width}
                  onChange={(width) => patch({ width })}
                  min={1}
                  max={300}
                  precision={1}
                  error={Boolean(errors.dimensions)}
                />
                <NumberInput
                  aria-label="Довжина, см"
                  placeholder="Довжина"
                  value={form.length}
                  onChange={(length) => patch({ length })}
                  min={1}
                  max={300}
                  precision={1}
                  error={Boolean(errors.dimensions)}
                />
                <NumberInput
                  aria-label="Висота, см"
                  placeholder="Висота"
                  value={form.height}
                  onChange={(height) => patch({ height })}
                  min={1}
                  max={300}
                  precision={1}
                  error={Boolean(errors.dimensions)}
                />
              </div>
              {errors.dimensions ? (
                <p role="alert" className="text-[12px] font-medium leading-4 text-negative">
                  {errors.dimensions}
                </p>
              ) : (
                <p className={TEXT.caption}>
                  {form.warehouse?.maxDimensions
                    ? `Цей поштомат приймає до ${dimensionsText(form.warehouse.maxDimensions)}.`
                    : "Ширина, довжина й висота коробки: поштомат без них посилку не прийме."}
                </p>
              )}
            </fieldset>
          )}
        </FormGrid>
      </Block>

      <Block title="Оплата доставки">
        <FormGrid>
          <RadioGroup
            label="Хто платить за доставку"
            value={form.payer}
            onChange={(payer) => patch({ payer })}
            options={(["Recipient", "Sender"] as const).map((value) => ({ value, label: PAYER_LABELS[value] }))}
          />
          <RadioGroup
            label="Як"
            value={form.paymentMethod}
            onChange={(paymentMethod) => patch({ paymentMethod })}
            options={(["Cash", "NonCash"] as const).map((value) => ({ value, label: PAYMENT_METHOD_LABELS[value] }))}
          />
          <MoneyInput
            label="Накладений платіж"
            value={form.cod}
            onChange={(cod) => patch({ cod })}
            optional
            hint={
              data.order.paymentType
                ? `Клієнт обрав оплату «${data.order.paymentType}». Порожнє поле - без накладеного платежу.`
                : "Сума, яку одержувач сплатить при отриманні. Порожнє поле - без накладеного платежу."
            }
            className="col-span-full min-[640px]:col-span-1"
          />
        </FormGrid>
      </Block>

      <EstimateLine form={form} senderReady={senderReady} />
      <Preview orderId={data.order.id} form={form} />
    </form>
  );
}
