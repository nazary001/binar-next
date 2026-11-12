"use client";

/* eslint-disable @next/next/no-img-element */

import { ArrowUturnLeftIcon, LockClosedIcon, NoSymbolIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { useState, type FormEvent, type ReactNode } from "react";
import { countOf, cx, formatDate, formatMoney, formatNumber, plural } from "../lib/format";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { promptDialog } from "../ui/ConfirmDialog";
import { FormActions, FormGrid, useDirty, useUnsavedWarning } from "../ui/Form";
import { Input, MoneyInput } from "../ui/Input";
import { KeyValueList, type KeyValueItem } from "../ui/KeyValue";
import { toast } from "../ui/Toast";
import { TEXT, TONES } from "../ui/tokens";
import { fieldErrors, patchReturn, returnErrorText } from "./shared";
import { RETURN_REJECT_REASON_MAX, RETURN_TTN_MAX, type ReturnDetail, type ReturnLineDto } from "./types";

// The left column of a request page: what happened to the request (refused
// or withdrawn), the goods the partner returns, what the partner asks for,
// and the staff's own record of the return (the waybill back, the money).

const HEAD = "h-11 whitespace-nowrap px-4 text-left align-middle text-[12px] font-semibold leading-4 text-white";

// The same rule the API applies to a waybill (spaces are dropped first).
const TTN = /^[A-Za-z0-9-]{4,40}$/;

export function cleanTtn(value: string): string {
  return value.replace(/\s+/g, "");
}

export const TTN_FORMAT = "Номер накладної: від 4 до 40 цифр або латинських літер, без інших знаків.";

// What the partner chose as the way back, in the words the hints use.
export function sendsByPost(delivery: string): boolean {
  return /пошт/i.test(delivery);
}

// The hint under the money field: what the amount means for the solution
// the partner asked for.
export function refundHint(solution: string): string {
  if (/кредит/i.test(solution)) return "Клієнт просить кредит-ноту: сума, яку зарахують на баланс компанії.";
  if (/замін/i.test(solution)) return "Клієнт просить заміну товару: якщо гроші не повертаються, вкажіть 0.";
  return "Скільки грошей повертаєте клієнту.";
}

function Thumb({ src }: { src: string }) {
  return src ? (
    <img src={src} alt="" loading="lazy" className="size-12 shrink-0 rounded-xl bg-bg-subtle object-contain" />
  ) : (
    <span aria-hidden className="size-12 shrink-0 rounded-xl bg-bg-cabinet" />
  );
}

function ProductName({ line }: { line: ReturnLineDto }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className={cx(TEXT.bodyStrong, "[overflow-wrap:anywhere]", !line.name && "text-neutral-500")}>
        {line.name || "Товар не знайдено в замовленні"}
      </span>
      <span className={TEXT.caption}>{line.article ? `Арт. ${line.article}` : "Без артикула"}</span>
    </span>
  );
}

function Reason({ text }: { text: string }) {
  return (
    <Badge tone="neutral" title="Причина повернення, яку вказав клієнт">
      {text || "Без причини"}
    </Badge>
  );
}

// --- what happened to the request ----------------------------------------------------------

function Banner({ tone, icon, title, children, action }: { tone: "red" | "neutral"; icon: ReactNode; title: string; children: ReactNode; action?: ReactNode }) {
  const colors = TONES[tone];
  return (
    <section
      aria-label={title}
      className="flex min-w-0 flex-col gap-4 rounded-3xl p-5 min-[640px]:flex-row min-[640px]:items-start min-[1024px]:p-6"
      style={{ backgroundColor: colors.bg }}
    >
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white" style={{ color: colors.text }}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className={TEXT.cardTitle}>{title}</h2>
        <div className={cx(TEXT.body, "mt-1 [overflow-wrap:anywhere]")}>{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </section>
  );
}

export function StateBanner({ ret, canEdit }: { ret: ReturnDetail; canEdit: boolean }) {
  const [busy, setBusy] = useState(false);

  if (ret.status === "cancelled") {
    return (
      <Banner tone="neutral" icon={<ArrowUturnLeftIcon className="size-6" strokeWidth={1.7} />} title="Клієнт відкликав заявку">
        {ret.withdrawnAt ? (
          <>
            Партнер відкликав її в кабінеті <span className="font-semibold tabular-nums">{formatDate(ret.withdrawnAt)}</span>.{" "}
          </>
        ) : (
          "Партнер відкликав її в кабінеті. "
        )}
        Рішення приймати вже не потрібно; нотатки до заявки додавати можна.
      </Banner>
    );
  }

  if (ret.status !== "rejected") return null;

  const editReason = async () => {
    const reason = await promptDialog({
      title: ret.rejectReason ? "Змінити причину відмови" : "Вказати причину відмови",
      text: "Причину бачать лише співробітники: клієнт у кабінеті бачить тільки статус «Відхилено».",
      label: "Причина відмови",
      initial: ret.rejectReason ?? "",
      required: true,
      multiline: true,
      maxLength: RETURN_REJECT_REASON_MAX,
      confirmLabel: "Зберегти причину",
    });
    if (reason === null || reason === (ret.rejectReason ?? "")) return;
    setBusy(true);
    const result = await patchReturn(ret.id, { rejectReason: reason });
    setBusy(false);
    if (!result.ok) {
      toast.error(returnErrorText(result, { fields: "Вкажіть причину відмови." }));
      return;
    }
    toast.success("Причину відмови змінено");
  };

  return (
    <Banner
      tone="red"
      icon={<NoSymbolIcon className="size-6" strokeWidth={1.7} />}
      title="Заявку відхилено"
      action={
        canEdit ? (
          <Button variant="secondary" size="sm" iconLeft={PencilSquareIcon} loading={busy} onClick={() => void editReason()}>
            {ret.rejectReason ? "Змінити причину" : "Вказати причину"}
          </Button>
        ) : undefined
      }
    >
      {ret.rejectReason ? (
        <>
          Причина: <span className="font-semibold">{ret.rejectReason}</span>
        </>
      ) : (
        "Причину не вказано."
      )}
      <span className={cx(TEXT.caption, "mt-1.5 block")}>Причину бачать лише співробітники, клієнт її в кабінеті не бачить.</span>
    </Banner>
  );
}

// --- the goods -----------------------------------------------------------------------------

export function LinesCard({ ret }: { ret: ReturnDetail }) {
  const units = ret.lines.reduce((total, line) => total + line.qty, 0);
  return (
    <Card
      title="Товари до повернення"
      subtitle={`${formatNumber(ret.lines.length)} ${plural(ret.lines.length, ["позиція", "позиції", "позицій"])}, ${formatNumber(units)} од.`}
      padding="none"
    >
      {/* Phones: one block per line instead of a table that scrolls sideways. */}
      <ul className="flex flex-col border-t border-stroke-subtle min-[640px]:hidden">
        {ret.lines.map((line) => (
          <li key={line.itemId} className="flex min-w-0 gap-3 border-b border-stroke-subtle px-5 py-3 last:border-b-0">
            <Thumb src={line.image} />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <ProductName line={line} />
              <span>
                <Reason text={line.reason} />
              </span>
              <span className="flex flex-wrap items-baseline justify-between gap-x-3 tabular-nums">
                <span className={TEXT.muted}>
                  {formatNumber(line.qty)} {line.unit} по {formatMoney(line.price)}
                </span>
                <span className={TEXT.bodyStrong}>{formatMoney(line.sum)}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="admin-scroll overflow-x-auto max-[639px]:hidden">
        <table className="w-full min-w-[600px] border-separate border-spacing-0">
          <caption className="sr-only">Товари заявки на повернення №{ret.id}</caption>
          <thead>
            <tr className="bg-neutral-800">
              <th scope="col" className={cx(HEAD, "pl-5 min-[1024px]:pl-6")}>
                Товар
              </th>
              <th scope="col" className={HEAD}>
                Причина
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
            {ret.lines.map((line) => (
              <tr key={line.itemId} className="[&:not(:last-child)>td]:border-b [&>td]:border-stroke-subtle">
                <td className="py-3 pl-5 pr-4 align-middle min-[1024px]:pl-6">
                  <span className="flex min-w-0 items-center gap-3">
                    <Thumb src={line.image} />
                    <ProductName line={line} />
                  </span>
                </td>
                <td className="px-4 align-middle">
                  <Reason text={line.reason} />
                </td>
                <td className={cx(TEXT.body, "whitespace-nowrap px-4 text-right align-middle tabular-nums")}>
                  {formatNumber(line.qty)} {line.unit}
                </td>
                <td className={cx(TEXT.body, "whitespace-nowrap px-4 text-right align-middle tabular-nums")}>{formatMoney(line.price)}</td>
                <td className={cx(TEXT.bodyStrong, "whitespace-nowrap pl-4 pr-5 text-right align-middle tabular-nums min-[1024px]:pr-6")}>
                  {formatMoney(line.sum)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-baseline justify-end gap-x-3 gap-y-1 border-t border-stroke-subtle px-5 py-4 min-[1024px]:px-6">
        <span className={TEXT.muted}>Сума повернення</span>
        <span className="text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-neutral-900 tabular-nums">{formatMoney(ret.total)}</span>
      </div>
    </Card>
  );
}

// --- what the partner asks for ----------------------------------------------------------------

export function WishesCard({ ret }: { ret: ReturnDetail }) {
  return (
    <Card title="Побажання клієнта" subtitle="Що партнер обрав, коли оформлював повернення">
      <KeyValueList
        columns={2}
        items={[
          { label: "Бажане рішення", value: ret.solution || <span className="text-neutral-500">Не вказано</span> },
          { label: "Як повернуть товар", value: ret.delivery || <span className="text-neutral-500">Не вказано</span> },
        ]}
      />
    </Card>
  );
}

// --- the staff's record of the return -------------------------------------------------------

const STAFF_ONLY = (
  <span className="inline-flex items-center gap-1.5">
    <LockClosedIcon aria-hidden className="size-3.5" strokeWidth={2} />
    Лише для співробітників: клієнт цих даних у кабінеті не бачить
  </span>
);

function ttnHint(delivery: string): string {
  return sendsByPost(delivery)
    ? "Номер накладної Нової пошти, з якою клієнт відправив товар назад."
    : `Клієнт обрав «${delivery || "інший спосіб"}»: накладна може не знадобитися.`;
}

export function ProcessingCard({ ret, canEdit }: { ret: ReturnDetail; canEdit: boolean }) {
  // A withdrawn request cannot change; a refused one gives nothing back.
  // Both show what was recorded, if anything.
  const closed = ret.status === "cancelled" || ret.status === "rejected";
  if (!canEdit || closed) {
    if (closed && !ret.returnTtn && ret.refundAmount === null) return null;
    const items: KeyValueItem[] = [
      {
        label: "ТТН повернення",
        value: ret.returnTtn ? <span className="tabular-nums">{ret.returnTtn}</span> : <span className="text-neutral-500">Ще не вказано</span>,
        copy: ret.returnTtn ?? undefined,
      },
      {
        label: "Сума повернення",
        value:
          ret.refundAmount !== null ? (
            <span className="font-semibold tabular-nums">{formatMoney(ret.refundAmount)}</span>
          ) : (
            <span className="text-neutral-500">Ще не вказано</span>
          ),
      },
    ];
    return (
      <Card title="Обробка повернення" subtitle={STAFF_ONLY}>
        <KeyValueList columns={2} items={items} />
      </Card>
    );
  }
  // Keyed by the stored values: a note or a status change elsewhere on the
  // page does not wipe what is being typed here.
  return <ProcessingForm key={`${ret.id}:${ret.returnTtn ?? ""}:${ret.refundAmount ?? ""}`} ret={ret} />;
}

type Values = { ttn: string; refund: number | null };

function ProcessingForm({ ret }: { ret: ReturnDetail }) {
  const loaded: Values = { ttn: ret.returnTtn ?? "", refund: ret.refundAmount };
  const [values, setValues] = useState<Values>(loaded);
  const [errors, setErrors] = useState<{ ttn?: string }>({});
  const [busy, setBusy] = useState(false);
  const dirty = useDirty(loaded, { ttn: cleanTtn(values.ttn), refund: values.refund });
  useUnsavedWarning(dirty);

  const reset = () => {
    setValues(loaded);
    setErrors({});
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || busy) return;
    const ttn = cleanTtn(values.ttn);
    if (ttn && !TTN.test(ttn)) {
      setErrors({ ttn: TTN_FORMAT });
      return;
    }
    setErrors({});
    const body: { returnTtn?: string | null; refundAmount?: number | null } = {};
    if (ttn !== loaded.ttn) body.returnTtn = ttn || null;
    if (values.refund !== loaded.refund) body.refundAmount = values.refund;
    setBusy(true);
    const result = await patchReturn(ret.id, body);
    setBusy(false);
    if (!result.ok) {
      const fields = fieldErrors(result);
      if (fields.returnTtn) {
        setErrors({ ttn: TTN_FORMAT });
        return;
      }
      toast.error(returnErrorText(result));
      return;
    }
    toast.success("Зміни збережено");
  };

  return (
    <Card title="Обробка повернення" subtitle={STAFF_ONLY}>
      <form onSubmit={save} noValidate className="flex flex-col gap-5">
        <FormGrid>
          <Input
            label="ТТН повернення"
            value={values.ttn}
            onChange={(ttn) => {
              setValues({ ...values, ttn });
              if (errors.ttn) setErrors({});
            }}
            placeholder="20450000000000"
            inputMode="numeric"
            maxLength={RETURN_TTN_MAX + 10}
            clearable
            hint={errors.ttn ? undefined : ttnHint(ret.delivery)}
            error={errors.ttn}
          />
          <MoneyInput
            label="Сума повернення"
            value={values.refund}
            onChange={(refund) => setValues({ ...values, refund })}
            hint={refundHint(ret.solution)}
          />
        </FormGrid>
        <FormActions status={dirty ? "Є незбережені зміни" : undefined}>
          <Button variant="secondary" onClick={reset} disabled={!dirty || busy}>
            Скасувати
          </Button>
          <Button type="submit" loading={busy} disabled={!dirty}>
            Зберегти зміни
          </Button>
        </FormActions>
      </form>
    </Card>
  );
}

// "3 позиції на 1 899,00 ₴": the request in one line (dialogs, toasts).
export function returnSummary(ret: ReturnDetail): string {
  return `${countOf(ret.lines.length, ["позиція", "позиції", "позицій"])} на ${formatMoney(ret.total)}`;
}
