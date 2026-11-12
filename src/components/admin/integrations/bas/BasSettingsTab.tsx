"use client";

import { useState, type FormEvent } from "react";
import { useStaff } from "../../shell/StaffProvider";
import { adminApi } from "../../lib/api";
import { cx } from "../../lib/format";
import { invalidate, useAdminQuery } from "../../lib/query";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { Checkbox, RadioGroup, Switch } from "../../ui/Checkbox";
import { FormActions, FormGrid, FormSection, useDirty, useUnsavedWarning } from "../../ui/Form";
import { Input } from "../../ui/Input";
import { Skeleton, SkeletonText } from "../../ui/Skeleton";
import { ErrorState } from "../../ui/States";
import { toast, toastError } from "../../ui/Toast";
import { SURFACE } from "../../ui/tokens";
import { Notice, SecretField, withoutErrors } from "../shared";
import {
  BAS_ACCEPT_FLAGS,
  type BasAcceptFlag,
  type BasMode,
  type BasSettingsAnswer,
  type BasSettingsDto,
  type BasSettingsInput,
} from "../types";

// "Налаштування" of the BAS exchange: the master switch, what BAS may
// overwrite on the site, how new products and stock behave, which orders
// go into the queue, and the optional push address. One save bar; the push
// password is sealed on the server and sent only when typed.

type BasForm = Omit<BasSettingsDto, "hasPassword" | "pushPasswordHint">;

function formOf(settings: BasSettingsDto): BasForm {
  const { hasPassword: _has, pushPasswordHint: _hint, ...rest } = settings;
  void _has;
  void _hint;
  return rest;
}

function urlProblem(value: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "Адреса має починатися з https://";
    return null;
  } catch {
    return "Перевірте адресу: наприклад, https://bas.example.com/hs/site/orders";
  }
}

const PUBLISH_OPTIONS = [
  {
    value: "wait" as const,
    label: "Чекають на менеджера",
    hint: "Товар з'являється прихованим: менеджер додає фото й опис і сам показує його на сайті.",
  },
  {
    value: "publish" as const,
    label: "З'являються одразу",
    hint: "Новий товар з BAS одразу видно в каталозі, навіть без фото й опису.",
  },
];

const MODE_OPTIONS: { value: BasMode; label: string; hint: string }[] = [
  { value: "pull", label: "BAS забирає чергу сам", hint: "Звичайний режим: BAS за розкладом забирає нові замовлення з черги сайту." },
  {
    value: "push",
    label: "Сайт ще й надсилає замовлення",
    hint: "Для BAS, що приймає замовлення за адресою: кожне нове замовлення приходить туди одразу.",
  },
];

function BasSettingsForm({ settings }: { settings: BasSettingsDto }) {
  const { can } = useStaff();
  const canEdit = can("integrations.edit");
  const [initial] = useState(() => formOf(settings));
  const [form, setForm] = useState(initial);
  const [password, setPassword] = useState("");
  const [removePassword, setRemovePassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const dirty = useDirty(initial, form) || password !== "" || removePassword;
  useUnsavedWarning(dirty);
  const set = (patch: Partial<BasForm>) => {
    setForm((current) => ({ ...current, ...patch }));
    setErrors((current) => withoutErrors(current, Object.keys(patch)));
  };

  const reset = () => {
    setForm(initial);
    setPassword("");
    setRemovePassword(false);
    setErrors({});
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    const url = form.pushUrl.trim();
    const problem = urlProblem(url);
    if (problem) found.pushUrl = problem;
    if (form.mode === "push" && !url) found.pushUrl = "Вкажіть адресу, на яку BAS приймає замовлення";
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error("Перевірте виділені поля.");
      return;
    }
    const body: BasSettingsInput = { ...form, pushUrl: url, pushLogin: form.pushLogin.trim() };
    if (password) body.pushPassword = password;
    else if (removePassword) body.pushPassword = null;
    setSaving(true);
    const answer = await adminApi<BasSettingsAnswer>("/integrations/bas/settings", { method: "PUT", body });
    setSaving(false);
    if (!answer.ok) {
      toastError(answer, { "bad-request": "Сервер не прийняв значення: перевірте адресу і логін." });
      return;
    }
    toast.success("Налаштування обміну з BAS збережено");
    invalidate("/integrations/bas");
  };

  const disabled = !canEdit;

  return (
    <form onSubmit={save} noValidate className="flex min-w-0 flex-col gap-4">
      <FormSection title="Обмін" description="Головний перемикач: без нього BAS отримує відмову на кожен виклик, крім перевірки зв'язку.">
        <Switch
          checked={form.enabled}
          onChange={(enabled) => set({ enabled })}
          disabled={disabled}
          labelPosition="start"
          label="Обмін з BAS увімкнено"
          hint={form.enabled ? "BAS може надсилати дані й забирати замовлення." : "Нові замовлення в чергу не потрапляють, дані з BAS не приймаються."}
        />
      </FormSection>

      <FormSection
        title="Що BAS може змінювати на сайті"
        description="Вимкнений пункт BAS отримує відмову, а дані на сайті лишаються такими, як їх ввели менеджери."
      >
        <div className="flex flex-col divide-y divide-stroke-subtle">
          {BAS_ACCEPT_FLAGS.map((flag) => (
            <div key={flag.key} className="py-3.5 first:pt-0 last:pb-0">
              <Switch
                checked={form[flag.key as BasAcceptFlag]}
                onChange={(value) => set({ [flag.key]: value } as Partial<BasForm>)}
                disabled={disabled}
                labelPosition="start"
                label={flag.label}
                hint={flag.hint}
              />
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="Нові товари і наявність" description="Як сайт поводиться з тим, що BAS надсилає вперше, і з залишками.">
        <div className="flex flex-col gap-5">
          <RadioGroup
            label="Новий товар з BAS"
            variant="tiles"
            direction="horizontal"
            value={form.publishNewProducts ? "publish" : "wait"}
            onChange={(value) => set({ publishNewProducts: value === "publish" })}
            options={PUBLISH_OPTIONS}
            disabled={disabled}
          />
          <div className={cx(SURFACE.inset, "p-4")}>
            <Switch
              checked={form.stockDrivesAvailability}
              onChange={(stockDrivesAvailability) => set({ stockDrivesAvailability })}
              disabled={disabled}
              labelPosition="start"
              label="Залишок визначає наявність"
              hint="Товар із нульовим залишком стає недоступним для замовлення, з додатним - знову доступним. Вимкнено: наявність задають менеджери."
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Які замовлення передавати в BAS"
        description="Нові замовлення таких видів самі потрапляють у чергу, яку забирає BAS. Будь-яке замовлення можна додати вручну на вкладці «Черга»."
      >
        <div className="flex flex-col gap-3">
          <Checkbox
            checked={form.exportPartnerOrders}
            onChange={(exportPartnerOrders) => set({ exportPartnerOrders })}
            disabled={disabled}
            label="Замовлення партнерів"
            hint="Оформлені компаніями в кабінеті партнера."
          />
          <Checkbox
            checked={form.exportRetailOrders}
            onChange={(exportRetailOrders) => set({ exportRetailOrders })}
            disabled={disabled}
            label="Роздрібні замовлення"
            hint="Оформлені на сайті гостями і покупцями без договору."
          />
        </div>
      </FormSection>

      <FormSection
        title="Надсилання замовлень на адресу BAS"
        description="Необов'язково. Потрібно, лише якщо ваша BAS приймає замовлення за адресою, а не забирає їх з черги."
      >
        <div className="flex flex-col gap-5">
          <RadioGroup
            label="Як BAS отримує замовлення"
            variant="tiles"
            direction="horizontal"
            value={form.mode}
            onChange={(mode) => set({ mode })}
            options={MODE_OPTIONS}
            disabled={disabled}
          />
          {form.mode === "push" && (
            <>
              <FormGrid>
                <Input
                  label="Адреса для замовлень"
                  type="url"
                  inputMode="url"
                  placeholder="https://bas.example.com/hs/site/orders"
                  value={form.pushUrl}
                  onChange={(pushUrl) => set({ pushUrl })}
                  disabled={disabled}
                  error={errors.pushUrl}
                  className="col-span-full"
                  required
                />
                <Input
                  label="Логін"
                  value={form.pushLogin}
                  onChange={(pushLogin) => set({ pushLogin })}
                  disabled={disabled}
                  autoComplete="off"
                  optional
                />
                <SecretField
                  label="Пароль"
                  stored={{ has: settings.hasPassword, hint: settings.pushPasswordHint }}
                  value={password}
                  onChange={setPassword}
                  removing={removePassword}
                  onRemovingChange={setRemovePassword}
                  canEdit={canEdit}
                  placeholder="Пароль користувача BAS"
                  nouns={{
                    what: "пароль",
                    replace: "Замінити",
                    remove: "Видалити",
                    removeQuestion: "Видалити пароль?",
                    removeText: "Після збереження сайт надсилатиме замовлення на адресу BAS без пароля.",
                  }}
                />
              </FormGrid>
              <Notice tone="blue">
                Сайт надсилає замовлення на цю адресу одразу після оформлення; якщо BAS не відповідає, замовлення лишається в черзі.
              </Notice>
            </>
          )}
        </div>
      </FormSection>

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

export function BasSettingsTab() {
  const settings = useAdminQuery<BasSettingsAnswer>("/integrations/bas/settings");
  const data = settings.data?.settings;
  if (settings.error && !data) {
    return (
      <Card>
        <ErrorState failure={settings.error} onRetry={settings.reload} />
      </Card>
    );
  }
  if (!data) {
    return (
      <div className="flex flex-col gap-4" data-loading="true">
        {[0, 1, 2].map((index) => (
          <Card key={index}>
            <Skeleton className="h-5 w-56" />
            <SkeletonText lines={3} className="mt-4" />
          </Card>
        ))}
      </div>
    );
  }
  return <BasSettingsForm key={JSON.stringify(data)} settings={data} />;
}
