"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { usePhone } from "@/components/ui/useMediaQuery";
import { SelectField } from "@/components/checkout/fields";
import { CheckboxOffIcon, CheckboxOnIcon } from "@/components/catalog/icons";
import { Modal718, ModalActions, ModalMeta } from "@/components/platform/ui";
import {
  RETURN_DELIVERY,
  RETURN_REASONS,
  RETURN_SOLUTIONS,
  formatDate,
  formatMoney,
  formatQty,
  lineSum,
  type Order,
  type OrderItem,
} from "./data";
import { ProductCell } from "./detailParts";
import { ReturnWizardSheet } from "./ReturnWizardSheet";
import { createReturn } from "./store";

const COPY = {
  created: "Запит на повернення створено",
} as const;

// «Оформити повернення» - section 5192:81117, six 1286 x 1148 frames of
// one card on the Modal718 shell (r48, 1-px #8e8e8f, py-60, rows px-60,
// column gap 40):
//   header: Caption/Large title + close, «№48291037 · 12.04.2026»;
//   step 1 (5192:81129, gap 32): the 32-px black stepper disc «1» + 20/28
//     «Оберіть товари, які хочете повернути. Вкажіть кількість для
//     повернення та причину.», then the 1166-wide #f8f8f8 r24 table
//     (head #343435 pt-8 px-16, columns 56 checkbox / Товар / 130
//     Кількість / 130 Сума / 267 Причина повернення, 108-px rows with the
//     235 x 46 «Оберіть причину» select; its <Menu> 5192:81456 opens 4 px
//     under it, 235 x 184 = four 46-px options);
//   step 2 (5192:81281): stepper «2» + «Оберіть бажане рішення та спосіб
//     повернення товару.», two 567 x 46 selects 32 apart («Бажане
//     рішення» menu 5192:82170, «Варіанти зворотньої доставки» menu
//     5192:81994, 567 x 138 = three options);
//   actions: «Повернутись» (outlined) + «Надіслати запит» (accent),
//     567 x 52.
// States 5192:81293 / 81469 / 81995 / 81819 / 81644 are the same card
// with a menu open, rows checked and values filled. The rows are the
// order lines still free to return (`items` = returnableItems: lines
// already in an active request drop out, partly returned ones offer the
// rest). Picking a reason ticks the row. «Надіслати запит» keeps the
// master's full accent look (5192:81118) but stays aria-disabled until
// every ticked row has a reason and both step-2 selects are set; a press
// before that flags what is missing and focuses it. A complete request
// is created («Створено») and the returns tab opens.
// Phones (< 640, order-detail spec 2.10, template T5e): the same answers
// drive ReturnWizardSheet (full-screen sheet, three Quizz Card steps with
// ChoiceRow checkboxes / radios). The state lives here, so crossing 640
// while the wizard is open swaps the shell and keeps the answers.

function Stepper({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[26px] bg-[#1d1d1f] text-[20px] leading-7 text-white">
        {n}
      </span>
      <p className="text-[18px] leading-[26px] text-neutral-900 sm:text-[20px] sm:leading-7">{children}</p>
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
  tone,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  tone: "light" | "dark";
}) {
  return (
    <label className="relative flex size-6 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        className="peer absolute inset-0 cursor-pointer opacity-0"
      />
      {checked ? (
        <CheckboxOnIcon className="pointer-events-none size-6 text-brand" />
      ) : (
        <CheckboxOffIcon
          className={`pointer-events-none size-6 ${tone === "light" ? "text-white" : "text-neutral-900"}`}
        />
      )}
      <span className="pointer-events-none absolute -inset-1 rounded-md peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand" />
    </label>
  );
}

// Same 0.5-px hairline rows as the details table (divider-modal-row.svg:
// 16 px in on a 1166 table), 108-px rows + 0.5 = the master's 606.
const ROW_DIVIDER =
  "[background:linear-gradient(var(--color-stroke-subtle),var(--color-stroke-subtle))_16px_0/calc(100%-32px)_0.5px_no-repeat] [&>td]:pt-[24.5px]";

// The wizard's answers, shared by the desktop modal and the phone sheet.
export function useReturnWizardState(items: OrderItem[]) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [solution, setSolution] = useState("");
  const [delivery, setDelivery] = useState("");
  const [attempted, setAttempted] = useState(false);

  const allSelected = items.length > 0 && items.every((it) => selected.has(it.id));
  const valid =
    selected.size > 0 && [...selected].every((id) => Boolean(reasons[id])) && solution !== "" && delivery !== "";

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const reset = () => {
    setSelected(new Set());
    setReasons({});
    setSolution("");
    setDelivery("");
    setAttempted(false);
  };

  return {
    selected,
    setSelected,
    reasons,
    setReasons,
    solution,
    setSolution,
    delivery,
    setDelivery,
    attempted,
    setAttempted,
    allSelected,
    valid,
    toggle,
    reset,
  };
}

export type ReturnWizardState = ReturnType<typeof useReturnWizardState>;

export function ReturnWizardModal({
  order,
  items,
  open,
  onClose,
}: {
  order: Order;
  items: OrderItem[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const phone = usePhone();
  const state = useReturnWizardState(items);
  const {
    selected,
    setSelected,
    reasons,
    setReasons,
    solution,
    setSolution,
    delivery,
    setDelivery,
    attempted,
    setAttempted,
    allSelected,
    valid,
    toggle,
    reset,
  } = state;

  // After a premature press: the ticked rows without a reason (or the
  // first row when nothing is ticked yet) and the empty step-2 selects.
  const reasonMissing = (id: string) =>
    selected.size === 0 ? id === items[0]?.id : selected.has(id) && !reasons[id];
  const missingNames = [
    ...items.filter((it) => reasonMissing(it.id)).map((it) => `return-reason-${it.id}`),
    ...(solution === "" ? ["return-solution"] : []),
    ...(delivery === "" ? ["return-delivery"] : []),
  ];

  const close = () => {
    reset();
    onClose();
  };

  const send = () => {
    createReturn({
      orderId: order.id,
      lines: items
        .filter((it) => selected.has(it.id))
        .map((it) => ({ itemId: it.id, qty: it.qty, reason: reasons[it.id] })),
      solution,
      delivery,
    });
    reset();
    onClose();
    router.push("/orders?tab=returns");
  };

  const submit = () => {
    if (!valid) {
      setAttempted(true);
      document.querySelector<HTMLElement>(`[role=dialog] [name="${missingNames[0]}"]`)?.focus();
      return;
    }
    send();
  };

  if (phone) {
    return (
      <ReturnWizardSheet
        order={order}
        items={items}
        open={open}
        state={state}
        onClose={close}
        onSubmit={() => {
          // Queued until the sheet has closed; survives the route change.
          showToast({ message: COPY.created, keepOnNavigate: true });
          send();
        }}
      />
    );
  }

  const head = "p-0 pt-2 text-left font-normal";
  const headLabel = "flex items-center whitespace-nowrap p-4 text-[14px] font-semibold leading-6 text-white";

  return (
    <Modal718
      open={open}
      onClose={close}
      width={1286}
      title="Оформити повернення"
      description={<ModalMeta parts={[`№${order.number}`, formatDate(order.date)]} />}
      actions={
        <ModalActions>
          <Button variant="outlinedDark" fullWidth onClick={close}>
            Повернутись
          </Button>
          <Button variant="accent" fullWidth aria-disabled={!valid} onClick={submit}>
            Надіслати запит
          </Button>
        </ModalActions>
      }
    >
      <div className="flex flex-col gap-6 sm:gap-10">
        <div className="flex flex-col gap-8">
          <Stepper n={1}>Оберіть товари, які хочете повернути. Вкажіть кількість для повернення та причину.</Stepper>
          <div className="rounded-3xl bg-bg-subtle max-lg:overflow-x-auto">
            <table className="w-full min-w-[960px] table-fixed border-separate border-spacing-0">
              <colgroup>
                <col className="w-4" />
                <col className="w-14" />
                <col />
                <col className="w-[130px]" />
                <col className="w-[130px]" />
                <col className="w-[267px]" />
                <col className="w-4" />
              </colgroup>
              <thead>
                <tr className="bg-neutral-800 [&>th:first-child]:rounded-tl-3xl [&>th:last-child]:rounded-tr-3xl">
                  <th aria-hidden className="p-0 pt-2" />
                  <th scope="col" className={head}>
                    <span className="flex items-center p-4">
                      <Checkbox
                        tone="light"
                        label="Обрати всі товари"
                        checked={allSelected}
                        onChange={(on) => setSelected(on ? new Set(items.map((it) => it.id)) : new Set())}
                      />
                    </span>
                  </th>
                  <th scope="col" className={head}>
                    <span className={headLabel}>Товар</span>
                  </th>
                  <th scope="col" className={head}>
                    <span className={headLabel}>Кількість</span>
                  </th>
                  <th scope="col" className={head}>
                    <span className={headLabel}>Сума</span>
                  </th>
                  <th scope="col" className={head}>
                    <span className={headLabel}>Причина повернення</span>
                  </th>
                  <th aria-hidden className="p-0 pt-2" />
                </tr>
              </thead>
              <tbody className="[--field-surface:var(--color-bg-subtle)]">
                {items.map((item, i) => (
                  <tr key={item.id} className={i === 0 ? "" : ROW_DIVIDER}>
                    <td aria-hidden className="p-0" />
                    <td className="p-4 py-6 align-middle">
                      <Checkbox
                        tone="dark"
                        label={`Повернути: ${item.name}`}
                        checked={selected.has(item.id)}
                        onChange={(on) => toggle(item.id, on)}
                      />
                    </td>
                    <td className="px-4 py-6 align-middle">
                      <ProductCell item={item} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-6 align-middle text-[16px] leading-6 text-neutral-900">
                      {formatQty(item.qty, item.unit)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-6 align-middle text-[16px] font-semibold leading-6 text-neutral-900">
                      {formatMoney(lineSum(item))}
                    </td>
                    <td className="px-4 py-6 align-middle">
                      <div className="w-[235px]">
                        <SelectField
                          label="Оберіть причину"
                          name={`return-reason-${item.id}`}
                          value={reasons[item.id] ?? ""}
                          options={RETURN_REASONS.map((r) => ({ value: r, label: r }))}
                          onChange={(v) => {
                            setReasons((prev) => ({ ...prev, [item.id]: v }));
                            toggle(item.id, true);
                          }}
                          error={attempted && reasonMissing(item.id) ? "Оберіть причину повернення" : undefined}
                        />
                      </div>
                    </td>
                    <td aria-hidden className="p-0" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-8 [--field-surface:#fff]">
          <Stepper n={2}>Оберіть бажане рішення та спосіб повернення товару.</Stepper>
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-8 [&>*]:min-w-0 [&>*]:flex-1">
            <SelectField
              label="Бажане рішення"
              name="return-solution"
              value={solution}
              options={RETURN_SOLUTIONS.map((r) => ({ value: r, label: r }))}
              onChange={setSolution}
              error={attempted && solution === "" ? "Оберіть бажане рішення" : undefined}
            />
            <SelectField
              label="Варіанти зворотньої доставки"
              name="return-delivery"
              value={delivery}
              options={RETURN_DELIVERY.map((r) => ({ value: r, label: r }))}
              onChange={setDelivery}
              error={attempted && delivery === "" ? "Оберіть спосіб повернення" : undefined}
            />
          </div>
        </div>
      </div>
    </Modal718>
  );
}
