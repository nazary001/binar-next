"use client";

import { ChevronRightIcon, LockClosedIcon } from "@heroicons/react/20/solid";
import { useRef, useState, type FormEvent } from "react";
import { adminApi } from "../lib/api";
import { cx, formatDateTime } from "../lib/format";
import { invalidate, setQueryData, useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { FormActions, FormGrid, FormSection, useDirty, useUnsavedWarning } from "../ui/Form";
import { Skeleton, SkeletonText } from "../ui/Skeleton";
import { ErrorState } from "../ui/States";
import { toast, toastError } from "../ui/Toast";
import { SURFACE, TEXT, TONES } from "../ui/tokens";
import { SettingsField, fieldErrorText, localError, type FieldValue } from "./fields";
import {
  SETTINGS_FIELDS,
  type PlainSettingsKey,
  type SettingsFieldDef,
  type SettingsFieldError,
  type SettingsGroupDef,
  type SettingsGroupResponse,
  type SettingsSaveResponse,
} from "./types";

// One plain settings group (general, shop, blog, catalog) as an edit form:
// the fields of SETTINGS_FIELDS laid out in blocks, one sticky save bar,
// the whole group sent with PUT /settings/<key>, the refusals of the
// server shown under their fields.

type Values = Record<string, FieldValue>;

// How the fields of a group are split into cards on the screen (the
// order and the grouping are the screen's; the fields themselves come
// from SETTINGS_FIELDS). A field missing here lands in the last block, so
// a field added to the group later still shows.
type Block = {
  title: string;
  description?: string;
  fields: { key: string; wide?: boolean }[];
  link?: { href: string; label: string };
};

const LAYOUT: Record<PlainSettingsKey, Block[]> = {
  general: [
    {
      title: "Контакти компанії",
      description: "Як компанія підписується в листах і як із нею зв'язатися.",
      fields: [{ key: "companyName" }, { key: "phone" }, { key: "email" }, { key: "workHours" }, { key: "address", wide: true }],
    },
    {
      title: "Менеджер для партнерів",
      description: "Людина, яку партнер бачить як свого менеджера.",
      fields: [{ key: "managerName", wide: true }, { key: "managerPhone" }, { key: "managerEmail" }],
    },
    {
      title: "Сповіщення",
      description: "Адреси, на які приходять листи про заявки та нові замовлення.",
      fields: [{ key: "leadsInbox", wide: true }, { key: "ordersInbox", wide: true }],
      link: { href: "/admin/integrations/mail", label: "Сервіс надсилання листів" },
    },
  ],
  shop: [
    {
      title: "Доставка і наявність",
      description: "Поріг безкоштовної доставки та як показувати залишки.",
      fields: [{ key: "freeDeliveryLimit" }, { key: "stockThreshold" }, { key: "stockDisplayMax" }],
      link: { href: "/admin/pricing", label: "Типи цін і їхні ролі" },
    },
    {
      title: "Строки",
      description: "Скільки днів на оплату, на заявку про повернення і на логістику.",
      fields: [{ key: "paymentTermDays" }, { key: "returnWindowDays" }, { key: "leadTimeBufferDays" }],
    },
  ],
  blog: [
    {
      title: "Рубрики блогу",
      description: "Розділи, до яких належать статті; їх обирають у редакторі статей.",
      fields: [{ key: "categories", wide: true }],
      link: { href: "/admin/blog", label: "Статті блогу" },
    },
    {
      title: "Нові статті",
      description: "Що редактор підставляє в нову статтю.",
      fields: [{ key: "defaultAuthor" }],
    },
  ],
  catalog: [
    {
      title: "Довідники товарів",
      description: "Значення, які редактор товарів пропонує на вибір.",
      fields: [{ key: "brands", wide: true }, { key: "manufacturers", wide: true }, { key: "countries", wide: true }],
      link: { href: "/admin/categories", label: "Категорії та пороги наявності" },
    },
  ],
};

export function groupDef(group: PlainSettingsKey): SettingsGroupDef {
  return SETTINGS_FIELDS.find((item) => item.group === group) ?? { group, title: group, description: "", fields: [] };
}

function blocksOf(def: SettingsGroupDef): { block: Block; fields: { field: SettingsFieldDef; wide: boolean }[] }[] {
  const byKey = new Map(def.fields.map((field) => [field.key, field]));
  const used = new Set<string>();
  const blocks = LAYOUT[def.group].map((block) => ({
    block,
    fields: block.fields.flatMap((item) => {
      const field = byKey.get(item.key);
      if (!field) return [];
      used.add(field.key);
      return [{ field, wide: Boolean(item.wide) || field.kind === "emails" || field.kind === "strings" }];
    }),
  }));
  const rest = def.fields.filter((field) => !used.has(field.key));
  if (rest.length > 0 && blocks.length > 0) {
    blocks[blocks.length - 1].fields.push(
      ...rest.map((field) => ({ field, wide: field.kind === "emails" || field.kind === "strings" })),
    );
  }
  return blocks.filter((item) => item.fields.length > 0);
}

function valuesOf(def: SettingsGroupDef, settings: Record<string, unknown>): Values {
  const values: Values = {};
  for (const field of def.fields) {
    const stored = settings[field.key];
    if (field.kind === "emails" || field.kind === "strings") values[field.key] = Array.isArray(stored) ? stored.map(String) : [];
    else if (field.kind === "number" || field.kind === "money" || field.kind === "days") values[field.key] = typeof stored === "number" ? stored : null;
    else if (field.kind === "priceType") values[field.key] = typeof stored === "string" ? stored : null;
    else values[field.key] = typeof stored === "string" ? stored : "";
  }
  return values;
}

// "ordersInbox.2" -> the field and the item the server refused.
function serverErrors(def: SettingsGroupDef, fields: Record<string, SettingsFieldError>, values: Values): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, reason] of Object.entries(fields)) {
    const [key, index] = path.split(".");
    const field = def.fields.find((item) => item.key === key);
    if (!field) continue;
    const list = values[key];
    const item = index !== undefined && Array.isArray(list) ? (list[Number(index)] ?? "") : undefined;
    if (!out[key]) out[key] = fieldErrorText(field, reason, item);
  }
  return out;
}

export function SettingsGroupSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-busy>
      {[0, 1].map((card) => (
        <div key={card} className={cx(SURFACE.card, SURFACE.cardPadding, "xl:grid xl:grid-cols-[280px_minmax(0,1fr)] xl:gap-x-10")}>
          <div className="mb-5 flex flex-col gap-2 xl:mb-0">
            <Skeleton className="h-5 w-40" />
            <SkeletonText lines={2} />
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-6 min-[640px]:grid-cols-2">
            {[0, 1, 2, 3].map((field) => (
              <div key={field} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton shape="pill" className="h-10 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Loads the group and renders its form once it is there.
export function SettingsGroupPanel({ group }: { group: PlainSettingsKey }) {
  const query = useAdminQuery<SettingsGroupResponse>(`/settings/${group}`);
  const data = query.data && query.data.key === group ? query.data : undefined;
  if (!data) {
    if (query.error) {
      return (
        <Card padding="none">
          <ErrorState failure={query.error} onRetry={query.reload} />
        </Card>
      );
    }
    return <SettingsGroupSkeleton />;
  }
  // Keyed by the save stamp: a save (here or by a colleague, seen on the
  // next load) starts the form again from the stored values.
  return <SettingsGroupForm key={`${group}:${data.meta.updatedAt ?? "defaults"}`} group={group} data={data} />;
}

function SettingsGroupForm({ group, data }: { group: PlainSettingsKey; data: SettingsGroupResponse }) {
  const { can } = useStaff();
  const canEdit = can("settings.edit");
  const def = groupDef(group);
  const initial = valuesOf(def, data.settings as unknown as Record<string, unknown>);
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const dirty = useDirty(initial, values);
  useUnsavedWarning(dirty && canEdit);

  const change = (key: string, value: FieldValue) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  // Field errors are said under their fields and in the save bar; the
  // first one is brought into view and focused. (A toast would sit over
  // the buttons of the sticky bar.)
  const showErrors = (next: Record<string, string>) => {
    setErrors(next);
    window.requestAnimationFrame(() => {
      const form = formRef.current;
      const first = form?.querySelector<HTMLElement>("[aria-invalid='true']") ?? form?.querySelector<HTMLElement>("[role='alert']");
      first?.scrollIntoView({ block: "center", behavior: "smooth" });
      if (first && first.matches("input, textarea, button, select")) first.focus({ preventScroll: true });
    });
  };

  const reset = () => {
    setValues(initial);
    setErrors({});
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit || saving) return;
    const local: Record<string, string> = {};
    for (const field of def.fields) {
      const problem = localError(field, values[field.key]);
      if (problem) local[field.key] = problem;
    }
    if (Object.keys(local).length > 0) {
      showErrors(local);
      return;
    }

    setSaving(true);
    const body: Record<string, unknown> = {};
    for (const field of def.fields) {
      const value = values[field.key];
      body[field.key] = typeof value === "string" ? value.trim() : value;
    }
    const result = await adminApi<SettingsSaveResponse>(`/settings/${group}`, { method: "PUT", body });
    setSaving(false);
    if (!result.ok) {
      if (result.error === "fields" && result.data.fields && typeof result.data.fields === "object") {
        const fields = serverErrors(def, result.data.fields as Record<string, SettingsFieldError>, values);
        if (Object.keys(fields).length > 0) {
          showErrors(fields);
          return;
        }
      }
      toastError(result, {
        fields: "Сервер не прийняв значення: оновіть сторінку і спробуйте ще раз.",
        "not-found": "Такої групи налаштувань немає.",
      });
      return;
    }
    const saved = result.data;
    setQueryData<SettingsGroupResponse>(`/settings/${group}`, { ok: true, key: saved.key, settings: saved.settings, meta: saved.meta });
    // The all-groups answer, the system page and the journal show this too.
    invalidate("/settings");
    invalidate("/audit");
    // Nothing changed: the stamp stays, so the form is not started again;
    // take the stored (trimmed) values so it is clean.
    setValues(valuesOf(def, saved.settings as unknown as Record<string, unknown>));
    setErrors({});
    if (saved.changed.length === 0) toast.info("Змін не було: усе вже збережено.");
    else toast.success("Налаштування збережено");
  };

  const errorCount = Object.keys(errors).length;
  const stamp = data.meta.updatedAt
    ? `Збережено ${formatDateTime(data.meta.updatedAt)}${data.meta.updatedBy ? `, ${data.meta.updatedBy.name}` : ""}`
    : "Діють значення за замовчуванням: група ще не зберігалася.";

  return (
    <form ref={formRef} onSubmit={save} noValidate className="flex min-w-0 flex-col gap-4">
      {!canEdit && (
        <div
          className="flex items-start gap-3 rounded-3xl px-5 py-4 min-[1024px]:px-6"
          style={{ backgroundColor: TONES.neutral.bg }}
          role="note"
        >
          <LockClosedIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-neutral-600" />
          <p className={TEXT.body}>Ваша роль може переглядати налаштування, але не змінювати їх.</p>
        </div>
      )}

      {blocksOf(def).map(({ block, fields }) => (
        <FormSection
          key={block.title}
          title={block.title}
          description={block.description}
          aside={
            block.link ? (
              <Button variant="ghost" size="sm" href={block.link.href} iconRight={ChevronRightIcon} className="-ml-3">
                {block.link.label}
              </Button>
            ) : undefined
          }
        >
          <FormGrid>
            {fields.map(({ field, wide }) => (
              <SettingsField
                key={field.key}
                field={field}
                value={values[field.key] ?? null}
                onChange={(value) => change(field.key, value)}
                // A list of addresses is checked as it is typed.
                error={errors[field.key] ?? (field.kind === "emails" ? (localError(field, values[field.key] ?? null) ?? undefined) : undefined)}
                disabled={!canEdit}
                wide={wide}
              />
            ))}
          </FormGrid>
        </FormSection>
      ))}

      {canEdit ? (
        <FormActions
          // The bar follows the screen only while there is something to
          // save or to fix; otherwise it rests under the last card.
          sticky={dirty || errorCount > 0}
          status={
            errorCount > 0 ? (
              <span className="font-semibold" style={{ color: TONES.red.text }}>
                {errorCount === 1 ? "Перевірте виділене поле" : `Перевірте виділені поля: ${errorCount}`}
              </span>
            ) : dirty ? (
              <span className="font-semibold text-neutral-900">Є незбережені зміни</span>
            ) : (
              stamp
            )
          }
        >
          <Button variant="secondary" onClick={reset} disabled={!dirty || saving}>
            Скасувати
          </Button>
          <Button type="submit" loading={saving} disabled={!dirty}>
            Зберегти зміни
          </Button>
        </FormActions>
      ) : (
        <p className={cx(TEXT.caption, "px-1")}>{stamp}</p>
      )}
    </form>
  );
}
