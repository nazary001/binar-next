"use client";

/* eslint-disable @next/next/no-img-element */

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { adminApi } from "../lib/api";
import { cx, formatDate, formatMoney, formatNumber, formatPhone, plural } from "../lib/format";
import { ShipmentCard } from "../shipping/ShipmentCard";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { confirmDialog, promptDialog } from "../ui/ConfirmDialog";
import { KeyValueList, type KeyValueItem } from "../ui/KeyValue";
import { toast } from "../ui/Toast";
import { TEXT, TONES } from "../ui/tokens";
import { orderErrorText, orderKey, storeOrder } from "./shared";
import { ORDER_COMMENT_MAX, type CancelDecisionBody, type OrderAnswer, type OrderDetail } from "./types";

// The left column of an order page: the partner's cancel request, the
// goods, the delivery with its shipment, and the checkout form.

// --- cancel request ----------------------------------------------------------------------

const CANCEL_ERRORS: Record<string, string> = {
  state: "Запит уже вирішено або замовлення вже не можна скасувати. Сторінку оновлено.",
};

export function CancelRequestBanner({ order, canEdit }: { order: OrderDetail; canEdit: boolean }) {
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const cancel = order.cancel;
  if (!cancel || !order.cancelRequested) return null;

  const decide = async (body: CancelDecisionBody) => {
    setBusy(body.decision);
    const result = await adminApi<OrderAnswer>(`${orderKey(order.id)}/cancel-request`, { method: "POST", body });
    setBusy(null);
    if (!result.ok) {
      toast.error(orderErrorText(result, CANCEL_ERRORS));
      return;
    }
    storeOrder(result.data.order);
    toast.success(body.decision === "approve" ? "Замовлення скасовано. Клієнт отримає лист." : "Запит відхилено: замовлення лишається в роботі.");
  };

  const approve = async () => {
    const yes = await confirmDialog({
      title: `Скасувати замовлення №${order.number}?`,
      text: "Статус зміниться на «Скасовано», і клієнт отримає лист про це.",
      confirmLabel: "Скасувати замовлення",
      cancelLabel: "Не скасовувати",
      tone: "danger",
    });
    if (yes) await decide({ decision: "approve" });
  };

  const decline = async () => {
    const comment = await promptDialog({
      title: "Відхилити запит на скасування?",
      text: "Замовлення лишиться в роботі, а партнер зможе надіслати запит ще раз.",
      label: "Коментар для історії",
      placeholder: "Наприклад: товар уже відвантажено зі складу",
      multiline: true,
      maxLength: ORDER_COMMENT_MAX,
      confirmLabel: "Відхилити запит",
    });
    if (comment === null) return;
    await decide({ decision: "decline", ...(comment ? { comment } : {}) });
  };

  return (
    <section
      aria-label="Запит на скасування"
      className="flex min-w-0 flex-col gap-4 rounded-3xl p-5 min-[1024px]:flex-row min-[1024px]:items-center min-[1024px]:p-6"
      style={{ backgroundColor: TONES.amber.bg }}
    >
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white" style={{ color: TONES.amber.text }}>
        <ExclamationTriangleIcon className="size-6" strokeWidth={1.7} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className={TEXT.cardTitle}>Клієнт просить скасувати замовлення</h2>
        <p className={cx(TEXT.body, "mt-1")}>
          Причина: <span className="font-semibold">{cancel.reason || "не вказано"}</span>
          {cancel.solution && (
            <>
              . Бажане рішення: <span className="font-semibold">{cancel.solution}</span>
            </>
          )}
        </p>
        <p className={cx(TEXT.caption, "mt-1")} style={{ color: TONES.amber.text }}>
          Запит надіслано {formatDate(cancel.at)}
        </p>
      </div>
      {canEdit && (
        <div className="flex flex-wrap gap-2 min-[1024px]:shrink-0">
          <Button variant="secondary" onClick={() => void decline()} loading={busy === "decline"} disabled={busy === "approve"}>
            Відхилити запит
          </Button>
          <Button onClick={() => void approve()} loading={busy === "approve"} disabled={busy === "decline"}>
            Скасувати замовлення
          </Button>
        </div>
      )}
    </section>
  );
}

// --- goods ----------------------------------------------------------------------------------

const HEAD = "h-11 whitespace-nowrap px-4 text-left align-middle text-[12px] font-semibold leading-4 text-white";

export function ItemsCard({ order }: { order: OrderDetail }) {
  const { items, totals } = order;
  return (
    <Card
      title="Товари"
      subtitle={`${formatNumber(items.length)} ${plural(items.length, ["позиція", "позиції", "позицій"])}, ${formatNumber(totals.units)} од.`}
      padding="none"
    >
      {/* Phones: one block per line (quantity times price, then the sum),
          instead of a table that would scroll sideways. */}
      <ul className="flex flex-col border-t border-stroke-subtle min-[640px]:hidden">
        {items.map((item) => (
          <li key={item.id} className="flex min-w-0 gap-3 border-b border-stroke-subtle px-5 py-3 last:border-b-0">
            {item.image ? (
              <img src={item.image} alt="" loading="lazy" className="size-12 shrink-0 rounded-xl bg-bg-subtle object-contain" />
            ) : (
              <span aria-hidden className="size-12 shrink-0 rounded-xl bg-bg-cabinet" />
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className={cx(TEXT.bodyStrong, "[overflow-wrap:anywhere]")}>{item.name}</span>
              <span className={TEXT.caption}>{item.article ? `Арт. ${item.article}` : "Без артикула"}</span>
              <span className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 tabular-nums">
                <span className={TEXT.muted}>
                  {formatNumber(item.qty)} {item.unit} по {formatMoney(item.price)}
                </span>
                <span className={TEXT.bodyStrong}>{formatMoney(item.sum)}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="admin-scroll overflow-x-auto max-[639px]:hidden">
        <table className="w-full min-w-[560px] border-separate border-spacing-0">
          <caption className="sr-only">Товари замовлення №{order.number}</caption>
          <thead>
            <tr className="bg-neutral-800">
              <th scope="col" className={cx(HEAD, "pl-5 min-[1024px]:pl-6")}>
                Товар
              </th>
              <th scope="col" className={cx(HEAD, "text-right")}>
                Кількість
              </th>
              <th scope="col" className={cx(HEAD, "text-right")}>
                Ціна
              </th>
              <th scope="col" className={cx(HEAD, "pr-5 text-right min-[1024px]:pr-6")}>
                Сума
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="[&:not(:last-child)>td]:border-b [&>td]:border-stroke-subtle">
                <td className="py-3 pl-5 pr-4 align-middle min-[1024px]:pl-6">
                  <span className="flex min-w-0 items-center gap-3">
                    {item.image ? (
                      <img src={item.image} alt="" loading="lazy" className="size-12 shrink-0 rounded-xl bg-bg-subtle object-contain" />
                    ) : (
                      <span aria-hidden className="size-12 shrink-0 rounded-xl bg-bg-cabinet" />
                    )}
                    <span className="flex min-w-0 flex-col">
                      <span className={cx(TEXT.bodyStrong, "[overflow-wrap:anywhere]")}>{item.name}</span>
                      <span className={TEXT.caption}>{item.article ? `Арт. ${item.article}` : "Без артикула"}</span>
                    </span>
                  </span>
                </td>
                <td className={cx(TEXT.body, "whitespace-nowrap px-4 text-right align-middle tabular-nums")}>
                  {formatNumber(item.qty)} {item.unit}
                </td>
                <td className={cx(TEXT.body, "whitespace-nowrap px-4 text-right align-middle tabular-nums")}>{formatMoney(item.price)}</td>
                <td className={cx(TEXT.bodyStrong, "whitespace-nowrap pl-4 pr-5 text-right align-middle tabular-nums min-[1024px]:pr-6")}>
                  {formatMoney(item.sum)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-baseline justify-end gap-x-6 gap-y-1 border-t border-stroke-subtle px-5 py-4 min-[1024px]:px-6">
        {totals.items !== totals.total && (
          <span className={cx(TEXT.muted, "tabular-nums")}>Товари: {formatMoney(totals.items)}</span>
        )}
        <span className="flex items-baseline gap-3">
          <span className={TEXT.muted}>Сума замовлення</span>
          <span className="text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-neutral-900 tabular-nums">{formatMoney(totals.total)}</span>
        </span>
      </div>
    </Card>
  );
}

// --- delivery -------------------------------------------------------------------------------

function deliveryItems(order: OrderDetail): KeyValueItem[] {
  const items: KeyValueItem[] = [];
  const delivery = order.delivery;
  const checkout = order.checkout;
  items.push({ label: "Місто", value: delivery?.city || checkout?.city || "Не вказано" });
  items.push({ label: "Спосіб доставки", value: delivery?.method || "Не вказано" });
  if (checkout?.delivery === "np-branch" && checkout.branch) items.push({ label: "Відділення", value: checkout.branch });
  else if (checkout?.delivery === "np-locker" && checkout.locker) items.push({ label: "Поштомат", value: checkout.locker });
  else if (checkout?.delivery === "np-address") {
    const address = [checkout.street, checkout.house && `буд. ${checkout.house}`, checkout.flat && `кв. ${checkout.flat}`].filter(Boolean).join(", ");
    items.push({ label: "Адреса", value: address || "Не вказано" });
  }
  if (checkout && (checkout.name || checkout.phone)) {
    items.push({
      label: "Отримувач",
      value: [checkout.name, checkout.phone ? formatPhone(checkout.phone) : ""].filter(Boolean).join(", "),
    });
  }
  return items;
}

export function DeliveryCard({ order, canShip, onShipmentChanged }: { order: OrderDetail; canShip: boolean; onShipmentChanged: () => void }) {
  const showNote = Boolean(order.delivery?.note) && !order.checkout;
  return (
    <Card title="Доставка" subtitle="Що обрав клієнт під час оформлення">
      <KeyValueList columns={2} items={deliveryItems(order)} />
      {showNote && <p className={cx(TEXT.muted, "mt-4 rounded-2xl bg-bg-subtle px-4 py-3")}>{order.delivery?.note}</p>}
      <div className="mt-5 border-t border-stroke-subtle pt-5">
        <h3 className={cx(TEXT.bodyStrong, "mb-3")}>Відправлення</h3>
        <ShipmentCard orderId={order.id} canEdit={canShip} onChanged={onShipmentChanged} />
      </div>
    </Card>
  );
}

// --- checkout form ----------------------------------------------------------------------

export function CheckoutCard({ order }: { order: OrderDetail }) {
  const checkout = order.checkout;
  if (!checkout) return null;
  const contact: KeyValueItem[] = [
    { label: "Ім'я", value: checkout.name || "Не вказано" },
    { label: "Телефон", value: checkout.phone ? formatPhone(checkout.phone) : "Не вказано", copy: checkout.phone || undefined },
    { label: "E-mail", value: checkout.email || "Не вказано", copy: checkout.email || undefined },
    { label: "Спосіб оплати", value: checkout.payment || "Не вказано" },
  ];
  const invoice: KeyValueItem[] = checkout.invoice
    ? [
        { label: "Компанія", value: checkout.company || "Не вказано" },
        { label: "ЄДРПОУ", value: checkout.edrpou || "Не вказано", copy: checkout.edrpou || undefined },
        { label: "ІПН", value: checkout.ipn || "Не вказано", copy: checkout.ipn || undefined },
        { label: "Адреса", value: checkout.address || "Не вказано" },
        { label: "E-mail для рахунку", value: checkout.invoiceEmail || "Не вказано", copy: checkout.invoiceEmail || undefined },
      ]
    : [];
  return (
    <Card title="Дані оформлення" subtitle="Як клієнт заповнив форму замовлення">
      <KeyValueList columns={2} items={contact} />
      <div className="mt-5 border-t border-stroke-subtle pt-5">
        <p className={TEXT.caption}>Коментар клієнта</p>
        <p className={cx(TEXT.body, "mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]", !checkout.comment && "text-neutral-500")}>
          {checkout.comment || "Без коментаря"}
        </p>
      </div>
      <div className="mt-5 border-t border-stroke-subtle pt-5">
        {checkout.invoice ? (
          <>
            <h3 className={cx(TEXT.bodyStrong, "mb-3")}>Реквізити для рахунку-фактури</h3>
            <KeyValueList columns={2} items={invoice} />
          </>
        ) : (
          <>
            <p className={TEXT.caption}>Рахунок-фактура</p>
            <p className={cx(TEXT.body, "mt-1 text-neutral-500")}>Клієнт не просив рахунок-фактуру</p>
          </>
        )}
      </div>
    </Card>
  );
}
