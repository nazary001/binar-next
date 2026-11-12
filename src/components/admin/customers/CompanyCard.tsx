"use client";

import { ArrowsRightLeftIcon, BuildingOffice2Icon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState } from "react";
import { CompanyPicker, type CompanyOption } from "../common/pickers";
import { adminApi } from "../lib/api";
import { cx, formatNumber } from "../lib/format";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Modal, ModalFooter } from "../ui/Modal";
import { Select } from "../ui/Select";
import { toast, toastError } from "../ui/Toast";
import { COLOR_TRANSITION, FOCUS_RING, TEXT, TONES } from "../ui/tokens";
import { applyCustomer } from "./cache";
import { CUSTOMER_ERRORS, accountName, roleHint, roleLabel } from "./parts";
import { ACCESS_ROLES, type AccessRole, type CustomerAnswer, type CustomerDetail } from "./types";

// "Компанія" of a partner account: the company (a link to its page), the
// access role in the cabinet, and moving the person to another company.

const ROLE_OPTIONS = ACCESS_ROLES.map((role) => ({ value: role.value, label: role.label, hint: role.hint }));

// "Львів, Львівська обл."; Kyiv is a city of its own, not a region to add.
function placeText(city: string, region: string): string {
  if (region === "Київ") return city && city !== "Київ" ? `${city}, м. Київ` : "м. Київ";
  return [city, region && `${region} обл.`].filter(Boolean).join(", ");
}

export function CompanyCard({ customer, canEdit }: { customer: CustomerDetail; canEdit: boolean }) {
  const [moving, setMoving] = useState(0);
  const [roleBusy, setRoleBusy] = useState(false);
  const company = customer.company;

  const changeRole = async (role: AccessRole) => {
    if (role === customer.role || roleBusy) return;
    setRoleBusy(true);
    const result = await adminApi<CustomerAnswer>(`/customers/${encodeURIComponent(customer.id)}`, { method: "PATCH", body: { role } });
    setRoleBusy(false);
    if (!result.ok) {
      toastError(result, CUSTOMER_ERRORS);
      return;
    }
    applyCustomer(result.data.customer);
    toast.success(`Доступ змінено: ${roleLabel(role)}`);
  };

  const facts = company
    ? [company.edrpou && `ЄДРПОУ ${company.edrpou}`, placeText(company.city, company.region)].filter(Boolean).join(", ")
    : "";

  return (
    <Card
      title="Компанія"
      actions={
        canEdit ? (
          <Button size="sm" variant="secondary" iconLeft={ArrowsRightLeftIcon} onClick={() => setMoving((count) => count + 1)}>
            Перевести
          </Button>
        ) : undefined
      }
    >
      {company ? (
        <div className="flex flex-col gap-5">
          <div className="flex min-w-0 items-start gap-3">
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-bg-cabinet text-neutral-800">
              <BuildingOffice2Icon className="size-5" strokeWidth={1.7} />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <Link
                href={`/admin/companies/${encodeURIComponent(company.id)}`}
                className={cx("w-fit max-w-full rounded-md font-semibold text-neutral-900 underline-offset-4 hover:underline [overflow-wrap:anywhere]", TEXT.bodyStrong, FOCUS_RING, COLOR_TRANSITION)}
              >
                {company.name || "Без назви"}
              </Link>
              <span className={TEXT.caption}>{facts || "Реквізити не вказано"}</span>
              <span className={TEXT.caption}>
                {company.discountPercent > 0 ? `Знижка ${formatNumber(company.discountPercent)} % від базових цін` : "Без знижки"}
              </span>
            </div>
          </div>
          {!company.isActive && (
            <p className="rounded-2xl px-4 py-3 text-[13px] leading-[18px]" style={{ backgroundColor: TONES.red.bg, color: TONES.red.text }}>
              Кабінет компанії вимкнено: її співробітники не можуть працювати в кабінеті, доки його не ввімкнуть на сторінці компанії.
            </p>
          )}
          {canEdit ? (
            <Select
              label="Доступ у кабінеті"
              value={customer.role}
              onChange={(role) => void changeRole(role)}
              options={ROLE_OPTIONS}
              disabled={roleBusy}
              hint={roleHint(customer.role)}
            />
          ) : (
            <div className="flex flex-col gap-1">
              <span className={TEXT.caption}>Доступ у кабінеті</span>
              <span className={TEXT.body}>{roleLabel(customer.role) || "-"}</span>
              {customer.role && <span className={TEXT.caption}>{roleHint(customer.role)}</span>}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Badge tone="red" dot className="w-fit">
            Компанію не знайдено
          </Badge>
          {/* A partner whose company record is gone: the card offers the way back. */}
          <p className={TEXT.muted}>
            Компанії цього партнера більше немає. Переведіть акаунт до іншої компанії, щоб людина знову бачила кабінет.
          </p>
        </div>
      )}
      {canEdit && moving > 0 && <MoveModal key={moving} customer={customer} onClose={() => setMoving(0)} />}
    </Card>
  );
}

function MoveModal({ customer, onClose }: { customer: CustomerDetail; onClose: () => void }) {
  const [open, setOpen] = useState(true);
  const [target, setTarget] = useState<CompanyOption | null>(null);
  const [busy, setBusy] = useState(false);
  const current = customer.company;
  const same = Boolean(target && current && target.id === current.id);

  const close = () => {
    setOpen(false);
    // Let the sheet slide out before the dialog leaves the tree.
    window.setTimeout(onClose, 400);
  };

  const move = async () => {
    if (!target || same || busy) return;
    setBusy(true);
    const result = await adminApi<CustomerAnswer>(`/customers/${encodeURIComponent(customer.id)}`, {
      method: "PATCH",
      body: { clientId: target.id },
    });
    setBusy(false);
    if (!result.ok) {
      toastError(result, { ...CUSTOMER_ERRORS, fields: "Цю компанію не знайдено: можливо, її щойно видалили." });
      return;
    }
    applyCustomer(result.data.customer);
    toast.success(`Акаунт переведено до компанії «${target.name}»`);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      busy={busy}
      title="Перевести в іншу компанію"
      description={`${accountName(customer)} побачить ціни, замовлення та документи нової компанії.${
        current ? ` Уже зроблені замовлення лишаться за компанією «${current.name}».` : ""
      }`}
      footer={<ModalFooter onCancel={close} onConfirm={() => void move()} confirmLabel="Перевести" busy={busy} confirmDisabled={!target || same} />}
    >
      <CompanyPicker
        label="Нова компанія"
        value={target?.id ?? null}
        onChange={(_id, company) => setTarget(company)}
        error={same ? "Акаунт уже в цій компанії" : undefined}
        hint="Знайдіть компанію за назвою або ЄДРПОУ"
      />
    </Modal>
  );
}
