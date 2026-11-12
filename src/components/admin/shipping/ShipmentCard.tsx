"use client";

import { ArrowPathIcon, PencilSquareIcon, PrinterIcon, TruckIcon } from "@heroicons/react/24/outline";
import { useState, type ReactNode } from "react";
import { adminApi, adminUrl } from "../lib/api";
import { invalidate, useAdminQuery } from "../lib/query";
import { cx, formatDate, formatDateTime, formatMoney, formatPhone } from "../lib/format";
import { useStaff } from "../shell/StaffProvider";
import { Button } from "../ui/Button";
import { CopyButton } from "../ui/KeyValue";
import { SkeletonText } from "../ui/Skeleton";
import { ShipmentStatusBadge, SHIPMENT_STATUS } from "../ui/status";
import { Spinner } from "../ui/Spinner";
import { Timeline, type TimelineItem } from "../ui/Timeline";
import { confirmDialog } from "../ui/ConfirmDialog";
import { toast } from "../ui/Toast";
import { TEXT } from "../ui/tokens";
import { ManualShipmentModal } from "./ManualShipmentModal";
import { CARRIER_NAME, parcelText, relativeTime, shippingError, useNow } from "./shared";
import type { ShipmentAnswer, ShipmentDto, ShippingOrderDto } from "./types";
import { WaybillDrawer } from "./WaybillDrawer";

// The shipment block of an order page: the waybill, its tracking state and
// the actions (create at the carrier, attach a number by hand, refresh,
// print, cancel).
//
// This file is the agreed seam between two screens built in parallel: the
// order page renders <ShipmentCard /> inside its "Доставка" card and the
// delivery section owns what it shows. It is a block INSIDE that card: no
// card of its own; it lays itself out by the width it gets (a container
// query), so it fits a side column as well as a wide one.
//
// Data: GET /api/admin/shipping/orders/<orderId> (also what the waybill
// drawer starts from, so opening the drawer is instant).

export type ShipmentCardProps = {
  orderId: string;
  // The role may create and cancel waybills (shipping.edit).
  canEdit: boolean;
  // Called after the shipment changed, so the order page can reload.
  onChanged?: () => void;
};

// Events shown before "Показати всі".
const EVENTS_COLLAPSED = 3;

const CANCEL_ERRORS: Record<string, string> = {
  state: "Посилку вже передано перевізнику: накладну не можна скасувати. Оформіть повернення в кабінеті Нової Пошти.",
};

export function ShipmentCard({ orderId, canEdit, onChanged }: ShipmentCardProps) {
  const { can } = useStaff();
  const canView = can("shipping.view");
  const query = useAdminQuery<ShippingOrderDto>(canView ? `/shipping/orders/${orderId}` : null);
  const [drawer, setDrawer] = useState(false);
  const [manual, setManual] = useState(false);

  if (!canView) {
    return <p className={TEXT.muted}>Дані про відправлення бачать ролі з доступом до розділу «Доставка».</p>;
  }

  const data = query.data && query.data.order.id === orderId ? query.data : undefined;
  if (!data) {
    if (query.error) {
      return (
        <div className="flex flex-col items-start gap-3" data-shipment-card={orderId}>
          <p className={TEXT.muted}>{shippingError(query.error)}</p>
          <Button size="sm" variant="secondary" iconLeft={ArrowPathIcon} onClick={query.reload}>
            Спробувати ще раз
          </Button>
        </div>
      );
    }
    return (
      <div data-shipment-card={orderId} data-loading="true">
        <SkeletonText lines={3} />
      </div>
    );
  }

  const changed = () => {
    invalidate("/shipping");
    invalidate("/orders");
    onChanged?.();
  };

  const shipment = data.shipment;
  const live = shipment && shipment.status !== "cancelled" ? shipment : null;

  return (
    <div className="@container" data-shipment-card={orderId} data-shipment-state={live ? live.status : "none"}>
      {live && live.status === "draft" ? (
        <Creating onRetry={query.reload} />
      ) : live ? (
        <ShipmentDetails orderId={orderId} shipment={live} canEdit={canEdit} onChanged={changed} />
      ) : (
        <NoShipment data={data} cancelled={shipment} canEdit={canEdit} onCreate={() => setDrawer(true)} onManual={() => setManual(true)} />
      )}
      {canEdit && (
        <>
          <WaybillDrawer
            orderId={orderId}
            open={drawer}
            onClose={() => setDrawer(false)}
            onCreated={() => {
              setDrawer(false);
              changed();
            }}
          />
          <ManualShipmentModal
            orderId={orderId}
            open={manual}
            pickup={data.recipient.pickup}
            onClose={() => setManual(false)}
            onDone={() => {
              setManual(false);
              changed();
            }}
          />
        </>
      )}
    </div>
  );
}

// --- no shipment yet -------------------------------------------------------------------

function NoShipment({
  data,
  cancelled,
  canEdit,
  onCreate,
  onManual,
}: {
  data: ShippingOrderDto;
  cancelled: ShipmentDto | null;
  canEdit: boolean;
  onCreate: () => void;
  onManual: () => void;
}) {
  const pickup = data.recipient.pickup;
  const text = pickup
    ? "Клієнт обрав самовивіз: накладна не потрібна. Коли замовлення заберуть, позначте це тут."
    : canEdit
      ? "Створіть накладну Нової Пошти просто тут: одержувача вже підставлено із замовлення. Якщо посилку відправили інакше, вкажіть її номер."
      : "Коли накладну створять, тут з'являться її номер і статус.";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-bg-subtle text-neutral-500">
          <TruckIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className={TEXT.bodyStrong}>{pickup ? "Самовивіз" : "Накладної ще немає"}</p>
          <p className={cx(TEXT.muted, "mt-0.5")}>{text}</p>
        </div>
      </div>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          {pickup ? (
            <>
              <Button size="sm" onClick={onManual}>
                Позначити самовивіз
              </Button>
              <Button size="sm" variant="secondary" iconLeft={TruckIcon} onClick={onCreate}>
                Створити накладну Нової Пошти
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" iconLeft={TruckIcon} onClick={onCreate}>
                Створити накладну Нової Пошти
              </Button>
              <Button size="sm" variant="ghost" iconLeft={PencilSquareIcon} onClick={onManual}>
                Вказати номер накладної вручну
              </Button>
            </>
          )}
        </div>
      )}
      {cancelled && (
        <p className={TEXT.caption}>
          {cancelled.ttn ? `Попередню накладну ${cancelled.ttn} скасовано` : "Попереднє відправлення скасовано"}
          {cancelled.events.length > 0 ? `, ${formatDateTime(cancelled.events[cancelled.events.length - 1].at)}` : ""}.
        </p>
      )}
    </div>
  );
}

function Creating({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Spinner size="sm" />
      <p className={cx(TEXT.muted, "min-w-0 flex-1")}>Накладна саме створюється в Новій Пошті. Оновіть за хвилину.</p>
      <Button size="sm" variant="secondary" iconLeft={ArrowPathIcon} onClick={onRetry}>
        Оновити
      </Button>
    </div>
  );
}

// --- a shipment -------------------------------------------------------------------------

function Fact({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={cx("min-w-0", wide && "@min-[480px]:col-span-2")}>
      <dt className={TEXT.caption}>{label}</dt>
      <dd className={cx(TEXT.body, "mt-1 [overflow-wrap:anywhere]")}>{children}</dd>
    </div>
  );
}

function ShipmentDetails({
  orderId,
  shipment,
  canEdit,
  onChanged,
}: {
  orderId: string;
  shipment: ShipmentDto;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const now = useNow();
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [allEvents, setAllEvents] = useState(false);
  const isPickup = shipment.carrier === "pickup";
  const atCarrier = Boolean(shipment.ref);

  const refresh = async () => {
    setRefreshing(true);
    const result = await adminApi<ShipmentAnswer>(`/shipping/orders/${orderId}/track`, { method: "POST" });
    setRefreshing(false);
    if (!result.ok) {
      toast.error(shippingError(result, { state: "Цю накладну не можна відстежити: її створено не в Новій Пошті або скасовано." }));
      return;
    }
    onChanged();
    const next = result.data.shipment;
    toast.success(result.data.changed ? `Новий статус: ${SHIPMENT_STATUS[next.status]?.label ?? next.status}` : "Нових змін немає");
  };

  const cancel = async () => {
    const what = isPickup ? "самовивіз" : shipment.carrier === "other" ? "відправлення" : "накладну";
    const yes = await confirmDialog({
      title: `Скасувати ${what}?`,
      text: atCarrier
        ? "Накладну буде видалено в Новій Пошті. Посилку, яку вже передали перевізнику, скасувати не можна."
        : isPickup
          ? "Позначку самовивозу буде знято, замовлення знову чекатиме на відправлення."
          : "Номер буде відкріплено від замовлення. У перевізника нічого не зміниться.",
      confirmLabel: `Скасувати ${what}`,
      cancelLabel: "Не скасовувати",
      tone: "danger",
    });
    if (!yes) return;
    setCancelling(true);
    const result = await adminApi<ShipmentAnswer>(`/shipping/orders/${orderId}/waybill`, { method: "DELETE" });
    setCancelling(false);
    if (!result.ok) {
      toast.error(shippingError(result, CANCEL_ERRORS));
      return;
    }
    onChanged();
    toast.success(atCarrier ? "Накладну видалено в Новій Пошті" : isPickup ? "Позначку самовивозу знято" : "Відправлення скасовано");
  };

  const events = [...shipment.events].reverse();
  const shown = allEvents ? events : events.slice(0, EVENTS_COLLAPSED);
  const items: TimelineItem[] = shown.map((event, index) => ({
    id: `${event.at}-${index}`,
    at: event.at,
    title: event.text,
    // The newest event is the state the parcel is in now.
    tone: index === 0 ? (SHIPMENT_STATUS[shipment.status]?.tone ?? "neutral") : "neutral",
  }));
  const r = shipment.recipient;
  const place = [r.city, r.warehouse || r.address || ""].filter(Boolean).join(", ");
  const parcel = parcelText(shipment.params);
  const label = (kind: "waybill" | "marking") => adminUrl(`/shipping/orders/${encodeURIComponent(orderId)}/label?kind=${kind}`);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 @min-[480px]:flex-row @min-[480px]:items-start @min-[480px]:justify-between">
        <div className="min-w-0">
          <p className={TEXT.caption}>{isPickup ? "Без перевізника" : CARRIER_NAME[shipment.carrier]}</p>
          {shipment.ttn ? (
            <div className="mt-0.5 flex items-center gap-1">
              <span
                className="text-[20px] font-bold leading-[26px] tracking-[-0.01em] text-neutral-900 tabular-nums [overflow-wrap:anywhere]"
                data-ttn
              >
                {shipment.ttn}
              </span>
              <CopyButton text={shipment.ttn} label="Скопіювати номер накладної" />
            </div>
          ) : (
            <p className="mt-0.5 text-[20px] font-bold leading-[26px] tracking-[-0.01em] text-neutral-900">Самовивіз</p>
          )}
        </div>
        {!isPickup && (
          <div className="flex min-w-0 flex-col gap-1 @min-[480px]:max-w-[55%] @min-[480px]:items-end @min-[480px]:text-right">
            <ShipmentStatusBadge status={shipment.status} size="md" />
            {shipment.statusText && <p className={cx(TEXT.caption, "[overflow-wrap:anywhere]")}>{shipment.statusText}</p>}
          </div>
        )}
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 @min-[480px]:grid-cols-2">
        {!isPickup && <Fact label="Очікувана доставка">{shipment.estimatedDate ? formatDate(shipment.estimatedDate) : "Ще невідомо"}</Fact>}
        {!isPickup && <Fact label="Вартість доставки">{shipment.cost !== null ? formatMoney(shipment.cost) : "Ще невідомо"}</Fact>}
        {shipment.params && (
          <Fact label="Накладений платіж">{shipment.params.cod ? formatMoney(shipment.params.cod) : "Без накладеного платежу"}</Fact>
        )}
        {parcel && <Fact label="Посилка">{parcel}</Fact>}
        {(r.name || r.phone) && (
          <Fact label="Одержувач">
            {r.name && <span className="block">{r.name}</span>}
            {r.phone && <span className="block tabular-nums text-neutral-500">{formatPhone(r.phone)}</span>}
          </Fact>
        )}
        {place && <Fact label={r.address ? "Адреса" : "Місто і відділення"}>{place}</Fact>}
        {shipment.note && (
          <Fact label="Примітка" wide>
            {shipment.note}
          </Fact>
        )}
      </dl>

      <div className="flex flex-col gap-3 border-t border-stroke-subtle pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {shipment.trackable && (
            <Button size="sm" variant="secondary" iconLeft={ArrowPathIcon} loading={refreshing} onClick={refresh}>
              Оновити статус
            </Button>
          )}
          {shipment.printable && (
            <>
              <Button size="sm" variant="secondary" iconLeft={PrinterIcon} href={label("waybill")} external>
                Друк накладної
              </Button>
              <Button size="sm" variant="secondary" iconLeft={PrinterIcon} href={label("marking")} external>
                Друк маркування
              </Button>
            </>
          )}
          {canEdit && shipment.cancellable && (
            <Button size="sm" variant="dangerGhost" loading={cancelling} onClick={cancel} className="@min-[480px]:ml-auto">
              {isPickup ? "Скасувати самовивіз" : shipment.carrier === "other" ? "Скасувати відправлення" : "Скасувати накладну"}
            </Button>
          )}
        </div>
        <p className={cx(TEXT.caption, "flex flex-wrap items-center gap-x-1.5 gap-y-1")}>
          <span>
            {atCarrier ? "Створено" : "Додано"} {formatDateTime(shipment.createdAt)}
            {shipment.createdBy ? `, ${shipment.createdBy}` : ""}
          </span>
          {shipment.trackable && (
            <>
              <span aria-hidden className="size-[3px] rounded-full bg-neutral-400" />
              <span data-checked>
                {shipment.final
                  ? "Відстеження завершено"
                  : shipment.checkedAt
                    ? `Оновлено ${relativeTime(shipment.checkedAt, now)}`
                    : "Статус у перевізника ще не перевіряли"}
              </span>
            </>
          )}
        </p>
      </div>

      {events.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className={TEXT.label}>Рух посилки</p>
          <Timeline items={items} />
          {events.length > EVENTS_COLLAPSED && (
            <Button size="sm" variant="ghost" onClick={() => setAllEvents((v) => !v)} className="self-start">
              {allEvents ? "Згорнути" : `Показати всі (${events.length})`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
