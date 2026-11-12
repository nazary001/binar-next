"use client";

import { useState } from "react";
import { adminApi } from "../lib/api";
import { invalidate } from "../lib/query";
import { RadioGroup } from "../ui/Checkbox";
import { Input, Textarea } from "../ui/Input";
import { Modal, ModalFooter } from "../ui/Modal";
import { toast } from "../ui/Toast";
import { CARRIER_NAME, shippingError } from "./shared";
import { CARRIERS, type CarrierKey, type ManualShipmentInput, type ShipmentAnswer } from "./types";

// "Вказати номер накладної вручну": a waybill made in the carrier's own
// cabinet, another carrier's parcel, or a pickup at the shop. Nothing is
// sent to the carrier; a Nova Poshta number is tracked like any other.

export type ManualShipmentModalProps = {
  orderId: string;
  open: boolean;
  onClose: () => void;
  // The buyer chose a pickup at checkout: start on "Самовивіз".
  pickup?: boolean;
  onDone: (answer: ShipmentAnswer) => void;
};

const HINTS: Record<CarrierKey, string> = {
  "nova-poshta": "Накладна, створена в кабінеті Нової Пошти. Статус оновлюватиметься сам.",
  other: "Відправлення іншою службою доставки. За статусом стежте на її сайті.",
  pickup: "Клієнт забирає замовлення сам: номер не потрібен.",
};

export function ManualShipmentModal({ orderId, open, onClose, pickup = false, onDone }: ManualShipmentModalProps) {
  const [carrier, setCarrier] = useState<CarrierKey>(pickup ? "pickup" : "nova-poshta");
  const [ttn, setTtn] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  // Every opening starts clean.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setCarrier(pickup ? "pickup" : "nova-poshta");
      setTtn("");
      setNote("");
      setError(undefined);
    }
  }

  const needsNumber = carrier !== "pickup";
  const formId = `manual-shipment-${orderId}`;

  const save = async () => {
    if (busy) return;
    const number = ttn.replace(/\s+/g, "");
    if (carrier === "nova-poshta" && !/^\d{14}$/.test(number)) {
      setError("Номер накладної Нової Пошти складається з 14 цифр");
      return;
    }
    if (carrier === "other" && !/^[A-Za-z0-9-]{3,40}$/.test(number)) {
      setError("Вкажіть номер відправлення: латинські літери, цифри або дефіс");
      return;
    }
    const body: ManualShipmentInput = { carrier };
    if (needsNumber) body.ttn = number;
    if (note.trim()) body.note = note.trim();
    setBusy(true);
    const result = await adminApi<ShipmentAnswer>(`/shipping/orders/${orderId}/manual`, { method: "POST", body });
    setBusy(false);
    if (!result.ok) {
      const fields = (result.data.fields ?? {}) as Record<string, string>;
      if (result.error === "fields" && fields.ttn) {
        setError(fields.ttn);
        return;
      }
      toast.error(shippingError(result));
      return;
    }
    invalidate("/shipping");
    invalidate("/orders");
    toast.success(
      carrier === "pickup" ? "Замовлення позначено як самовивіз" : `Номер ${result.data.shipment.ttn ?? number} додано до замовлення`,
    );
    onDone(result.data);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      size="sm"
      title="Номер накладної вручну"
      description="Якщо посилку відправили без цієї панелі."
      footer={
        <ModalFooter
          onCancel={onClose}
          confirmLabel={carrier === "pickup" ? "Позначити самовивіз" : "Додати номер"}
          form={formId}
          busy={busy}
        />
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="flex flex-col gap-5"
      >
        <RadioGroup
          label="Як відправили"
          value={carrier}
          onChange={(next) => {
            setCarrier(next);
            setError(undefined);
          }}
          options={CARRIERS.map((value) => ({ value, label: CARRIER_NAME[value], hint: HINTS[value] }))}
        />
        {needsNumber && (
          <Input
            label={carrier === "nova-poshta" ? "Номер накладної" : "Номер відправлення"}
            value={ttn}
            onChange={(value) => {
              setTtn(value);
              setError(undefined);
            }}
            inputMode={carrier === "nova-poshta" ? "numeric" : undefined}
            placeholder={carrier === "nova-poshta" ? "20450000000000" : undefined}
            maxLength={60}
            error={error}
            hint={carrier === "nova-poshta" ? "14 цифр, пробіли можна залишити" : undefined}
            required
            autoComplete="off"
          />
        )}
        <Textarea
          label="Примітка"
          value={note}
          onChange={setNote}
          optional
          rows={2}
          autoGrow
          maxLength={300}
          placeholder={carrier === "other" ? "Наприклад: Делівері, склад на Подолі" : undefined}
        />
      </form>
    </Modal>
  );
}
