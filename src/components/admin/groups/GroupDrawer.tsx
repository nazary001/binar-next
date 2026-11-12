"use client";

import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { useId, useState, type FormEvent } from "react";
import { CATALOG_DIRECTIONS } from "@/components/catalog/data";
import { DELIVERY_OPTIONS, PAYMENT_OPTIONS } from "@/components/checkout/data";
import type { PriceTypeListAnswer } from "../catalog/types";
import { EntityHistory } from "../common/EntityHistory";
import { adminApi } from "../lib/api";
import { countOf, cx } from "../lib/format";
import { invalidate, useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Button } from "../ui/Button";
import { Checkbox, CheckboxGroup } from "../ui/Checkbox";
import { confirmDialog } from "../ui/ConfirmDialog";
import { Drawer } from "../ui/Drawer";
import { useUnsavedWarning } from "../ui/Form";
import { Input, Textarea } from "../ui/Input";
import { Select } from "../ui/Select";
import { SkeletonText } from "../ui/Skeleton";
import { NotFoundState } from "../ui/States";
import { toast, toastError } from "../ui/Toast";
import { TEXT, TONES } from "../ui/tokens";
import {
  GROUP_DESCRIPTION_MAX,
  GROUP_ERRORS,
  GROUP_NAME_MAX,
  GUESTS_GROUP,
  type CreateGroupBody,
  type CustomerGroupAnswer,
  type CustomerGroupDto,
  type PatchGroupBody,
} from "./types";

// One buyer group in a drawer: name, description, the price type, stock,
// the payment and delivery methods and the hidden catalog categories.
// Mounted afresh for every group (the caller keys it by the address), and
// the fields start again from the record whenever it is loaded or saved.
//
// The storefront does not apply groups yet: the hint at the top says so.

type Form = {
  name: string;
  description: string;
  priceTypeId: string | null;
  showStock: boolean;
  paymentMethods: string[];
  deliveryMethods: string[];
  hiddenCategories: string[];
};

const PAYMENT_CHOICES = PAYMENT_OPTIONS.map((label) => ({ value: label as string, label }));
const DELIVERY_CHOICES = DELIVERY_OPTIONS.map((option) => ({ value: option.value as string, label: option.label }));

const EMPTY: Form = {
  name: "",
  description: "",
  priceTypeId: null,
  showStock: false,
  paymentMethods: [],
  deliveryMethods: [],
  hiddenCategories: [],
};

function formOf(group: CustomerGroupDto | null): Form {
  if (!group) return EMPTY;
  return {
    name: group.name,
    description: group.description,
    priceTypeId: group.priceTypeId,
    showStock: group.showStock,
    paymentMethods: group.paymentMethods,
    deliveryMethods: group.deliveryMethods,
    hiddenCategories: group.hiddenCategories,
  };
}

const sameList = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

function patchOf(base: Form, form: Form): PatchGroupBody {
  const patch: PatchGroupBody = {};
  if (form.name.trim() !== base.name) patch.name = form.name.trim();
  if (form.description.trim() !== base.description) patch.description = form.description.trim();
  if (form.priceTypeId !== base.priceTypeId) patch.priceTypeId = form.priceTypeId;
  if (form.showStock !== base.showStock) patch.showStock = form.showStock;
  if (!sameList(form.paymentMethods, base.paymentMethods)) patch.paymentMethods = form.paymentMethods;
  if (!sameList(form.deliveryMethods, base.deliveryMethods)) patch.deliveryMethods = form.deliveryMethods;
  if (!sameList(form.hiddenCategories, base.hiddenCategories)) patch.hiddenCategories = form.hiddenCategories;
  return patch;
}

type GroupDrawerProps = {
  open: boolean;
  onClose: () => void;
  group: CustomerGroupDto | null;
  isNew: boolean;
  loading: boolean;
  canEdit: boolean;
};

export function GroupDrawer({ open, onClose, group, isNew, loading, canEdit }: GroupDrawerProps) {
  const { can } = useStaff();
  const hiddenId = useId();
  const base = formOf(group);
  const [form, setForm] = useState<Form>(base);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  // The record arrived or was saved (here or elsewhere): start from it.
  const version = group ? `${group.id}:${group.updatedAt ?? ""}` : null;
  const [seen, setSeen] = useState(version);
  // Opened again after "Закрити без збереження": the old edits are gone.
  const [wasOpen, setWasOpen] = useState(open);
  if (seen !== version || wasOpen !== open) {
    setSeen(version);
    setWasOpen(open);
    if (seen !== version || open) {
      setForm(base);
      setErrors({});
    }
  }
  const editable = canEdit && (isNew || group !== null);
  const patch = patchOf(base, form);
  const dirty = editable && (isNew ? JSON.stringify(form) !== JSON.stringify(EMPTY) : Object.keys(patch).length > 0);
  useUnsavedWarning(open && dirty);

  const readsPrices = can("catalog.view");
  const priceTypes = useAdminQuery<PriceTypeListAnswer>(readsPrices && open ? "/price-types?sort=name&limit=100" : null);
  const priceOptions = (priceTypes.data?.items ?? []).map((type) => ({ value: type.id, label: type.name }));
  if (form.priceTypeId && priceTypes.data && !priceOptions.some((option) => option.value === form.priceTypeId)) {
    priceOptions.push({ value: form.priceTypeId, label: group?.priceTypeName ?? "Тип цін видалено" });
  }

  const system = group?.system === true;
  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: "" }));
  };

  const close = async () => {
    if (busy) return;
    if (dirty) {
      const leave = await confirmDialog({
        title: "Закрити без збереження?",
        text: "Зміни в цій групі не буде збережено.",
        confirmLabel: "Закрити без збереження",
        cancelLabel: "Повернутися",
        tone: "danger",
      });
      if (!leave) return;
    }
    onClose();
  };

  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: "Вкажіть назву групи" });
      return;
    }
    let result;
    setBusy(true);
    if (isNew) {
      const body: CreateGroupBody = { ...form, name: form.name.trim(), description: form.description.trim() };
      result = await adminApi<CustomerGroupAnswer>("/customer-groups", { method: "POST", body });
    } else if (group) {
      if (Object.keys(patch).length === 0) {
        setBusy(false);
        onClose();
        return;
      }
      result = await adminApi<CustomerGroupAnswer>(`/customer-groups/${encodeURIComponent(group.id)}`, { method: "PATCH", body: patch });
    } else {
      setBusy(false);
      return;
    }
    setBusy(false);
    if (!result.ok) {
      if (result.error === "exists") setErrors({ name: GROUP_ERRORS.exists });
      else if (result.error === "fields") setErrors({ priceTypeId: "Такого типу цін уже немає" });
      else toastError(result, GROUP_ERRORS);
      return;
    }
    invalidate("/customer-groups");
    invalidate("/audit");
    toast.success(isNew ? `Групу «${result.data.group.name}» створено` : "Зміни збережено");
    if (isNew) onClose();
  };

  const remove = async () => {
    if (!group) return;
    const yes = await confirmDialog({
      title: `Видалити групу «${group.name}»?`,
      text: "Групу буде видалено назавжди. Видалити можна лише групу, до якої не належить жодна компанія.",
      confirmLabel: "Видалити групу",
      tone: "danger",
    });
    if (!yes) return;
    setBusy(true);
    const result = await adminApi(`/customer-groups/${encodeURIComponent(group.id)}`, { method: "DELETE" });
    setBusy(false);
    if (!result.ok) {
      if (result.error === "in-use") {
        const companies = Number(result.data.companies) || 0;
        toast.error(
          `Групу не можна видалити: у ній ${countOf(companies, ["компанія", "компанії", "компаній"])}. Спершу перенесіть їх в іншу групу на сторінках компаній.`,
        );
      } else {
        toastError(result, GROUP_ERRORS);
      }
      return;
    }
    invalidate("/customer-groups");
    invalidate("/companies");
    invalidate("/audit");
    toast.success(`Групу «${group.name}» видалено`);
    onClose();
  };

  const toggleCategories = (keys: string[], on: boolean) => {
    const current = new Set(form.hiddenCategories);
    for (const key of keys) {
      if (on) current.add(key);
      else current.delete(key);
    }
    set("hiddenCategories", [...current]);
  };

  const title = isNew ? "Нова група" : (group?.name ?? (loading ? "Група покупців" : "Групу не знайдено"));
  const footer = editable ? (
    <>
      {!isNew && group && !system && (
        <Button variant="dangerGhost" onClick={() => void remove()} disabled={busy} className="min-[640px]:mr-auto">
          Видалити групу
        </Button>
      )}
      <Button variant="secondary" onClick={() => void close()} disabled={busy}>
        Скасувати
      </Button>
      <Button type="submit" form="group-form" loading={busy} disabled={!isNew && !dirty}>
        {isNew ? "Створити групу" : "Зберегти зміни"}
      </Button>
    </>
  ) : (
    <Button variant="secondary" onClick={onClose}>
      Закрити
    </Button>
  );

  const hidden = new Set(form.hiddenCategories);

  return (
    <Drawer
      open={open}
      onClose={() => void close()}
      busy={busy}
      width={640}
      title={title}
      description={system ? "Системна група: її не можна перейменувати чи видалити." : group ? countOf(group.companiesCount, ["компанія", "компанії", "компаній"]) : undefined}
      footer={footer}
    >
      {loading ? (
        <SkeletonText lines={8} />
      ) : !isNew && !group ? (
        <NotFoundState title="Групу не знайдено" text="Можливо, її вже видалили." />
      ) : (
        <form id="group-form" onSubmit={(event) => void save(event)} noValidate className="flex flex-col gap-6">
          <div className="flex gap-3 rounded-2xl px-4 py-3" style={{ backgroundColor: TONES.blue.bg, color: TONES.blue.text }}>
            <InformationCircleIcon aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.7} />
            <p className="text-[13px] leading-[18px]">
              Правила зберігаються і почнуть діяти після підключення цін з облікової системи. Поки що сайт їх не застосовує: ціни
              партнера рахуються від знижки компанії, а способи оплати, доставки й каталог однакові для всіх.
            </p>
          </div>

          <Input
            label="Назва"
            required
            value={form.name}
            onChange={(value) => set("name", value)}
            error={errors.name}
            maxLength={GROUP_NAME_MAX}
            disabled={!editable || system}
            hint={system ? "Назву системної групи змінити не можна" : undefined}
          />
          <Textarea
            label="Опис"
            optional
            value={form.description}
            onChange={(value) => set("description", value)}
            rows={2}
            autoGrow
            maxRows={6}
            maxLength={GROUP_DESCRIPTION_MAX}
            disabled={!editable}
            placeholder="Кому ця група: готелі мережі, дистриб'ютори..."
          />
          {readsPrices ? (
            <Select
              label="Тип цін"
              value={form.priceTypeId}
              onChange={(value) => set("priceTypeId", value)}
              options={priceOptions}
              clearable
              error={errors.priceTypeId}
              disabled={!editable || (priceTypes.data !== undefined && priceOptions.length === 0)}
              placeholder={priceTypes.data && priceOptions.length === 0 ? "Типів цін ще немає" : "Ціни магазину"}
              hint={
                priceTypes.data && priceOptions.length === 0
                  ? "Типи цін додають у розділі «Типи цін»."
                  : "Які ціни бачать покупці групи. Порожньо - ціни магазину."
              }
            />
          ) : (
            <div>
              <p className={TEXT.label}>Тип цін</p>
              <p className={cx(TEXT.body, "mt-1")}>{group?.priceTypeName ?? "Ціни магазину"}</p>
            </div>
          )}
          <Checkbox
            label="Показувати залишки"
            hint="Покупці групи бачитимуть реальну кількість на складі."
            checked={form.showStock}
            onChange={(value) => set("showStock", value)}
            disabled={!editable}
          />
          <div className="grid gap-6 min-[640px]:grid-cols-2">
            <CheckboxGroup
              label="Способи оплати"
              value={form.paymentMethods}
              onChange={(value) => set("paymentMethods", value)}
              options={PAYMENT_CHOICES}
              disabled={!editable}
              hint="Нічого не вибрано - доступні всі."
            />
            <CheckboxGroup
              label="Способи доставки"
              value={form.deliveryMethods}
              onChange={(value) => set("deliveryMethods", value)}
              options={DELIVERY_CHOICES}
              disabled={!editable}
              hint="Нічого не вибрано - доступні всі."
            />
          </div>

          <div role="group" aria-labelledby={hiddenId} className="flex min-w-0 flex-col gap-3">
            <div>
              <p id={hiddenId} className={TEXT.label}>
                Приховані категорії
              </p>
              <p className={cx(TEXT.caption, "mt-1")}>Позначені категорії покупці групи не бачитимуть у каталозі.</p>
            </div>
            {CATALOG_DIRECTIONS.map((direction) => {
              const keys = direction.carousel.map((card) => `${direction.slug}/${card.slug}`);
              const count = keys.filter((key) => hidden.has(key)).length;
              return (
                <div key={direction.slug} className="rounded-2xl border border-stroke-subtle p-4">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <p className={TEXT.bodyStrong}>{direction.title}</p>
                      <p className={TEXT.caption}>
                        {count === 0 ? "Усе видно" : `Приховано ${count} з ${keys.length}`}
                      </p>
                    </div>
                    <Checkbox
                      label="Приховати весь напрям"
                      checked={count === keys.length}
                      indeterminate={count > 0 && count < keys.length}
                      onChange={(on) => toggleCategories(keys, on)}
                      disabled={!editable}
                    />
                  </div>
                  <div className="mt-3 grid gap-2.5 border-t border-stroke-subtle pt-3 min-[640px]:grid-cols-2">
                    {direction.carousel.map((card) => {
                      const key = `${direction.slug}/${card.slug}`;
                      return (
                        <Checkbox
                          key={key}
                          label={card.label}
                          checked={hidden.has(key)}
                          onChange={(on) => toggleCategories([key], on)}
                          disabled={!editable}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {group && group.id !== GUESTS_GROUP && group.companiesCount > 0 && (
            <p className={TEXT.caption}>
              {`У групі ${countOf(group.companiesCount, ["компанія", "компанії", "компаній"])}. Компанію переносять в іншу групу на її сторінці.`}
            </p>
          )}
          {group && <EntityHistory type="customer-group" id={group.id} refreshKey={group.updatedAt} bare />}
        </form>
      )}
    </Drawer>
  );
}
