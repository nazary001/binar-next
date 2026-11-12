"use client";

import { CheckCircleIcon, ExclamationCircleIcon, MinusCircleIcon } from "@heroicons/react/20/solid";
import type { ApiKeyDto } from "../integrations/types";
import { cx, formatNumber, plural } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import { MAIL_MISSING_LABELS, type MailSettingsAnswer } from "../mail/types";
import type { NpSettingsDto } from "../shipping/types";
import { useStaff } from "../shell/StaffProvider";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";
import { TEXT, TONES, type Tone } from "../ui/tokens";
import type { SystemInfo } from "./types";

// "Перед запуском на бойовому сайті": what has to be in place before the
// panel and the site go live, computed from what the routes report. The
// integration items are read from the integration routes; a role that may
// not read them sees "cannot check" instead of a wrong answer.

type ItemState = "done" | "warn" | "todo" | "unknown" | "loading";

type ChecklistItem = {
  key: string;
  state: ItemState;
  title: string;
  text: string;
  link?: { href: string; label: string };
};

type ListAnswer<T> = { ok: true; items: T[]; total: number };
type NpAnswer = { ok: true; settings: NpSettingsDto };

const STATE_LOOK: Record<ItemState, { tone: Tone; label: string }> = {
  done: { tone: "green", label: "Готово" },
  warn: { tone: "amber", label: "Варто доробити" },
  todo: { tone: "orange", label: "Потрібно зробити" },
  unknown: { tone: "neutral", label: "Не перевірено" },
  loading: { tone: "neutral", label: "Перевіряємо" },
};

function StateIcon({ state }: { state: ItemState }) {
  const look = STATE_LOOK[state];
  const Icon = state === "done" ? CheckCircleIcon : state === "unknown" || state === "loading" ? MinusCircleIcon : ExclamationCircleIcon;
  return (
    <span
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: TONES[look.tone].bg, color: TONES[look.tone].dot }}
    >
      <Icon className="size-5" />
    </span>
  );
}

const CANNOT_CHECK = "Перевірити може роль із доступом до розділу «Інтеграції».";

function secretsItem(system: SystemInfo): ChecklistItem {
  const state = system.security.secretsKey;
  const link = { href: "#security", label: "Як налаштувати" };
  if (state === "own") {
    return { key: "secrets", state: "done", title: "Ключ шифрування секретів", text: "Задано власний ключ: ключі інтеграцій зберігаються зашифрованими.", link };
  }
  if (state === "derived") {
    return {
      key: "secrets",
      state: "warn",
      title: "Ключ шифрування секретів",
      text: "Працює, але ключ виведено з іншого секрету сайту. Надійніше задати окремий SECRETS_KEY ще до того, як вводити ключі інтеграцій.",
      link,
    };
  }
  return {
    key: "secrets",
    state: "todo",
    title: "Ключ шифрування секретів",
    text: state === "invalid" ? "SECRETS_KEY задано неправильно: ключі інтеграцій не можна зберегти." : "Ключа немає: ключі інтеграцій не можна зберегти.",
    link,
  };
}

export function LaunchChecklist({ system }: { system: SystemInfo }) {
  const { can } = useStaff();
  const integrations = can("integrations.view");
  const np = useAdminQuery<NpAnswer>(integrations ? "/np/settings" : null);
  const keys = useAdminQuery<ListAnswer<ApiKeyDto>>(integrations ? "/integrations/keys?limit=100" : null);
  const mail = useAdminQuery<MailSettingsAnswer>(integrations ? "/integrations/mail/settings" : null);

  const forbidden = (error: { status: number } | null) => error !== null && error.status === 403;

  const owner: ChecklistItem = {
    key: "owner",
    state: system.counts.staff > 0 ? "done" : "todo",
    title: "Обліковий запис власника",
    text:
      system.counts.staff > 0
        ? `У панелі ${formatNumber(system.counts.staff)} ${plural(system.counts.staff, ["співробітник", "співробітники", "співробітників"])}; власник керує ролями й доступами.`
        : "Створіть власника командою admin:create.",
    link: can("staff.manage") ? { href: "/admin/staff", label: "Співробітники" } : undefined,
  };

  let carrier: ChecklistItem;
  const npLink = { href: "/admin/integrations/nova-poshta", label: "Нова Пошта" };
  if (!integrations || forbidden(np.error)) carrier = { key: "np", state: "unknown", title: "Ключ API Нової Пошти", text: CANNOT_CHECK };
  else if (!np.data) carrier = { key: "np", state: np.error ? "unknown" : "loading", title: "Ключ API Нової Пошти", text: np.error ? "Не вдалося перевірити." : "Перевіряємо...", link: npLink };
  else if (np.data.settings.hasKey && np.data.settings.keyReadable)
    carrier = { key: "np", state: "done", title: "Ключ API Нової Пошти", text: `Ключ збережено (${np.data.settings.apiKeyHint || "прихований"}).`, link: npLink };
  else if (np.data.settings.hasKey)
    carrier = { key: "np", state: "todo", title: "Ключ API Нової Пошти", text: "Збережений ключ не відкривається: на сервері змінився ключ шифрування. Введіть ключ ще раз.", link: npLink };
  else carrier = { key: "np", state: "todo", title: "Ключ API Нової Пошти", text: "Без ключа накладні не створюються.", link: npLink };

  let bas: ChecklistItem;
  const basLink = { href: "/admin/integrations/bas?tab=keys", label: "Ключі BAS" };
  if (!integrations || forbidden(keys.error)) bas = { key: "bas", state: "unknown", title: "Ключ доступу для BAS", text: CANNOT_CHECK };
  else if (!keys.data) bas = { key: "bas", state: keys.error ? "unknown" : "loading", title: "Ключ доступу для BAS", text: keys.error ? "Не вдалося перевірити." : "Перевіряємо...", link: basLink };
  else {
    const active = keys.data.items.filter((key) => key.state === "active").length;
    bas = active
      ? { key: "bas", state: "done", title: "Ключ доступу для BAS", text: `Активних ключів: ${formatNumber(active)}.`, link: basLink }
      : { key: "bas", state: "todo", title: "Ключ доступу для BAS", text: "Створіть ключ і передайте його розробнику облікової системи.", link: basLink };
  }

  let letters: ChecklistItem;
  const mailLink = { href: "/admin/integrations/mail", label: "Пошта" };
  const queued = system.counts.outboxPending;
  const queueText = queued > 0 ? ` У черзі ${formatNumber(queued)} ${plural(queued, ["лист", "листи", "листів"])}.` : "";
  if (!integrations || forbidden(mail.error)) letters = { key: "mail", state: "unknown", title: "Сервіс надсилання листів", text: CANNOT_CHECK };
  else if (!mail.data) letters = { key: "mail", state: mail.error ? "unknown" : "loading", title: "Сервіс надсилання листів", text: mail.error ? "Не вдалося перевірити." : "Перевіряємо...", link: mailLink };
  else if (mail.data.status.configured)
    letters = { key: "mail", state: "done", title: "Сервіс надсилання листів", text: `Листи надсилаються.${queueText}`, link: mailLink };
  else if (mail.data.settings.provider !== "none")
    letters = {
      key: "mail",
      state: "warn",
      title: "Сервіс надсилання листів",
      text: `Сервіс обрано, але налаштовано не до кінця: ${mail.data.status.missing.map((item) => MAIL_MISSING_LABELS[item].toLowerCase()).join("; ")}.${queueText}`,
      link: mailLink,
    };
  else letters = { key: "mail", state: "todo", title: "Сервіс надсилання листів", text: `Сервіс не обрано: листи лише стають у чергу.${queueText}`, link: mailLink };

  const items = [owner, secretsItem(system), carrier, bas, letters];
  const done = items.filter((item) => item.state === "done").length;
  const all = done === items.length;

  return (
    <Card
      title="Перед запуском на бойовому сайті"
      subtitle="Що має бути готове, перш ніж панель і сайт почнуть працювати з клієнтами."
      padding="none"
      actions={
        <Badge tone={all ? "green" : "orange"} size="md" dot>
          {`Готово ${done} з ${items.length}`}
        </Badge>
      }
    >
      <ul className="flex flex-col px-5 pb-3 min-[1024px]:px-6">
        {items.map((item) => (
          <li key={item.key} className="flex min-w-0 items-start gap-4 border-t border-stroke-subtle py-4 first:border-t-0 first:pt-1">
            <StateIcon state={item.state} />
            <div className="flex min-w-0 flex-1 flex-col gap-3 min-[640px]:flex-row min-[640px]:items-center">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={TEXT.bodyStrong}>{item.title}</span>
                  {item.state === "loading" ? (
                    <Skeleton shape="pill" className="h-6 w-24" />
                  ) : (
                    <Badge tone={STATE_LOOK[item.state].tone}>{STATE_LOOK[item.state].label}</Badge>
                  )}
                </p>
                <p className={cx(TEXT.muted, "mt-1")}>{item.text}</p>
              </div>
              {item.link && (
                <Button variant="secondary" size="sm" href={item.link.href} className="w-fit shrink-0">
                  {item.link.label}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
