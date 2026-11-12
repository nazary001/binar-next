"use client";

import { CheckCircleIcon, ExclamationTriangleIcon, SignalIcon } from "@heroicons/react/24/outline";
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
import { SURFACE, TEXT } from "../../ui/tokens";
import { Notice, SecretField, withoutErrors } from "../shared";
import {
  BAS_ACCEPT_FLAGS,
  type BasAcceptFlag,
  type BasMode,
  type BasPushOutcome,
  type BasPushTestAnswer,
  type BasSettingsAnswer,
  type BasSettingsDto,
  type BasSettingsInput,
} from "../types";

// "Налаштування" of the BAS exchange: the master switch, what BAS may
// overwrite on the site, how new products and stock behave, which orders
// go into the queue, and the optional push address with its connection
// check. One save bar; the push password is sealed on the server and sent
// only when typed.

type BasForm = Omit<BasSettingsDto, "hasPassword">;

function formOf(settings: BasSettingsDto): BasForm {
  const { hasPassword: _has, ...rest } = settings;
  void _has;
  return rest;
}

// The origin a stored password belongs to (the server's rule,
// server/integrations/bas/push.ts originOf).
function originOf(value: string): string {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : "";
  } catch {
    return "";
  }
}

// The quick part of the server's rule (server/integrations/bas/push.ts):
// the server also refuses private network addresses (and, outside
// development, the two test hosts) and answers the sentence for the field.
function urlProblem(value: string): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Перевірте адресу: наприклад, https://bas.example.com/hs/site/orders";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "Адреса має починатися з https://";
  if (url.username || url.password) return "Логін і пароль не пишуть в адресі: вкажіть їх у полях «Логін» і «Пароль»";
  if (url.protocol === "http:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    return "Потрібна адреса https://: через звичайний http пароль і замовлення йшли б відкритим текстом";
  }
  return null;
}

function seconds(ms: number): string {
  return ms < 1000 ? `${ms} мс` : `${(ms / 1000).toFixed(1).replace(".", ",")} с`;
}

// What the connection check came to, in the words of the settings tab.
function PushTestResult({ result }: { result: BasPushOutcome }) {
  if (result.ok) {
    return (
      <Notice tone="green" icon={<CheckCircleIcon />} title="З'єднання працює">
        BAS відповів {result.status} за {seconds(result.durationMs)}.{result.answer ? ` Відповідь: ${result.answer}` : ""}
      </Notice>
    );
  }
  return (
    <Notice tone="red" icon={<ExclamationTriangleIcon />} title="З'єднання не вдалося">
      {result.error}
      {result.answer && result.error && !result.error.includes(result.answer) ? ` Відповідь: ${result.answer}` : ""}
    </Notice>
  );
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
    hint: "Для BAS, що приймає замовлення за адресою: кожне нове замовлення і повернення приходить туди одразу, а черга лишається запасним шляхом.",
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
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<BasPushOutcome | null>(null);

  const dirty = useDirty(initial, form) || password !== "" || removePassword;
  // A stored password goes with the address: the server removes it when
  // the address moves to another site and no new one is typed.
  const passwordWillDrop = settings.hasPassword && !password && !removePassword && originOf(form.pushUrl) !== originOf(initial.pushUrl);
  // The check posts to the stored address with the stored login and
  // password, so it waits until changes to them are saved.
  const pushDirty =
    form.pushUrl.trim() !== initial.pushUrl || form.pushLogin.trim() !== initial.pushLogin || password !== "" || removePassword;
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
      const fields = answer.data.fields as Record<string, string> | undefined;
      if (fields?.pushUrl) {
        setErrors({ pushUrl: fields.pushUrl });
        toast.error("Перевірте адресу для замовлень.");
        return;
      }
      toastError(answer, { "bad-request": "Сервер не прийняв значення: перевірте адресу і логін." });
      return;
    }
    if (answer.data.passwordDropped) {
      toast.show({
        tone: "success",
        title: "Налаштування обміну з BAS збережено",
        text: "Збережений пароль видалено, бо змінилася адреса. Якщо BAS за новою адресою просить пароль, введіть його.",
      });
    } else {
      toast.success("Налаштування обміну з BAS збережено");
    }
    invalidate("/integrations/bas");
  };

  const runTest = async () => {
    setTesting(true);
    const answer = await adminApi<BasPushTestAnswer>("/integrations/bas/push-test", { method: "POST" });
    setTesting(false);
    if (!answer.ok) {
      setTest(null);
      toastError(answer, { "no-address": "Спершу збережіть адресу для замовлень." });
      return;
    }
    setTest(answer.data.result);
    // The check is a journal row: the status tab shows it as the last call.
    invalidate("/integrations/bas/status");
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
                  hint="Лише https://, без логіна й пароля в самій адресі: їх вкажіть у полях нижче."
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
                  stored={{ has: settings.hasPassword, hint: "" }}
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
              {passwordWillDrop && (
                <Notice tone="amber" icon={<ExclamationTriangleIcon />} title="Збережений пароль буде видалено">
                  Адреса веде на інший сервер, а пароль належить попередній адресі: щоб він не пішов туди, куди його не вводили, сайт видалить
                  його під час збереження. Введіть пароль для нової адреси в полі «Пароль».
                </Notice>
              )}
              {canEdit && (
                <div className="flex min-w-0 flex-col gap-3">
                  <div className="flex min-w-0 flex-col gap-2 min-[640px]:flex-row min-[640px]:items-center min-[640px]:gap-4">
                    <Button
                      variant="secondary"
                      iconLeft={SignalIcon}
                      onClick={() => void runTest()}
                      loading={testing}
                      disabled={pushDirty || !settings.pushUrl}
                      className="shrink-0 self-start"
                    >
                      Перевірити з&apos;єднання
                    </Button>
                    <p className={cx(TEXT.caption, "min-w-0")}>
                      {pushDirty
                        ? "Перевірка йде на збережену адресу: спершу збережіть зміни."
                        : settings.pushUrl
                          ? "Сайт надішле на адресу пробний запит із логіном і паролем і покаже, що відповів BAS. Працює й тоді, коли обмін вимкнено."
                          : "Збережіть адресу, щоб перевірити з'єднання."}
                    </p>
                  </div>
                  {test && !pushDirty && <PushTestResult result={test} />}
                </div>
              )}
              <Notice tone="blue">
                Коли обмін увімкнено, сайт надсилає кожне нове замовлення і заявку на повернення на цю адресу одразу, як вони потрапили в чергу, і
                чекає відповіді до 10 секунд. Відповідь 2xx означає «прийнято». Будь-яка інша - як мовчання: якщо BAS не відповідає, замовлення
                лишається в черзі з текстом помилки, BAS забере його звичайним запитом черги, а повторити надсилання можна кнопкою «Повторити» на
                вкладці «Черга». Формат запиту - на вкладці «Для розробника BAS».
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
