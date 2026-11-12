"use client";

import { ArrowPathIcon, CheckIcon, PaperAirplaneIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useStaff } from "../shell/StaffProvider";
import { adminApi, type ApiFailure } from "../lib/api";
import { cx, formatDateTime, formatNumber } from "../lib/format";
import { invalidate, useAdminQuery } from "../lib/query";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { confirmDialog } from "../ui/ConfirmDialog";
import { Drawer } from "../ui/Drawer";
import { KeyValueList, type KeyValueItem } from "../ui/KeyValue";
import { SkeletonText, Skeleton } from "../ui/Skeleton";
import { ErrorState, NotFoundState } from "../ui/States";
import { TabPanel, Tabs } from "../ui/Tabs";
import { toast, toastError } from "../ui/Toast";
import { TEXT, type Tone } from "../ui/tokens";
import { Notice } from "../integrations/shared";
import {
  MAIL_ERROR_LABELS,
  MAIL_MAX_ATTEMPTS,
  MAIL_PREVIEW_ERROR_LABELS,
  OUTBOX_AUTO_SEND_LABELS,
  OUTBOX_STATE_LABELS,
  type DeliverAnswer,
  type OutboxDetailAnswer,
  type OutboxMessageAnswer,
  type OutboxRetryAnswer,
  type OutboxState,
} from "./types";

// One message of the outbox in a drawer (/admin/integrations/mail?id=<id>,
// the address the journal links to): its facts, the message as the
// recipient gets it (the HTML in a sandboxed frame, nothing in it can
// run), the text version, the delivery attempts, and what staff can do
// with it: send it now, retry, mark it handled by hand, delete it.

export const OUTBOX_STATE_TONE: Record<OutboxState, Tone> = {
  pending: "amber",
  sent: "green",
  failed: "red",
  unsendable: "neutral",
};

// "http-422: domain not verified" / "timeout" -> the sentence staff read.
export function mailErrorText(error: string | null): string | null {
  if (!error) return null;
  return MAIL_ERROR_LABELS[error] ?? error.replace(/^http-(\d{3}):\s*/, "Сервіс відповів $1: ");
}

// Why the message cannot be shown, in words (never a bare code).
function previewErrorText(error: string | null, fallback: string): string {
  if (!error) return fallback;
  return MAIL_PREVIEW_ERROR_LABELS[error] ?? mailErrorText(error) ?? fallback;
}

const ACTION_ERRORS: Record<string, string> = {
  state: "Цей лист уже надіслано або його не можна надіслати з черги.",
  busy: "Лист саме зараз надсилається. Оновіть сторінку за хвилину.",
  "no-provider": "Сервіс надсилання не підключено: оберіть його вище і збережіть.",
  "not-found": "Цього листа вже немає в черзі.",
};

type View = "html" | "text" | "attempts";

// The delivered access mail carried the temporary password; the panel
// shows the same mail with the password masked.
function MaskedNote() {
  return (
    <Notice tone="neutral" title="Лист містив тимчасовий пароль">
      Одержувач отримав саме такий лист, але пароль ніде не зберігається, тому тут замість нього зірочки.
    </Notice>
  );
}

export function OutboxDrawer({ id, configured, onClose }: { id: string | null; configured: boolean; onClose: () => void }) {
  const { can } = useStaff();
  const canEdit = can("integrations.edit");
  const detail = useAdminQuery<OutboxDetailAnswer>(id ? `/outbox/${encodeURIComponent(id)}` : null);
  const [view, setView] = useState<View>("html");
  const [busy, setBusy] = useState<string | null>(null);
  // A new message opens on its rendered view (render-phase reset).
  const [seen, setSeen] = useState(id);
  if (seen !== id) {
    setSeen(id);
    setView("html");
  }

  const data = detail.data && detail.data.message.id === id ? detail.data : undefined;
  const message = data?.message;
  const notFound = detail.error?.status === 404;

  const refused = (answer: ApiFailure) => {
    toastError(answer, ACTION_ERRORS);
    invalidate("/outbox");
  };

  const sendNow = async () => {
    if (!message) return;
    setBusy("send");
    const answer = await adminApi<DeliverAnswer>("/outbox/deliver", { method: "POST", body: { ids: [message.id] } });
    setBusy(null);
    if (!answer.ok) return refused(answer);
    const result = answer.data.result;
    if (!result.configured) toast.error("Сервіс надсилання не підключено: лист лишився в черзі.");
    else if (result.sent > 0) toast.success(`Лист надіслано на ${message.to}`);
    else if (result.skipped > 0) toast.info("Цей лист можна надіслати лише в момент створення.");
    else toast.error("Сервіс не прийняв лист. Причина у вкладці «Спроби надсилання».");
    invalidate("/outbox");
  };

  const retry = async () => {
    if (!message) return;
    setBusy("retry");
    const answer = await adminApi<OutboxRetryAnswer>(`/outbox/${encodeURIComponent(message.id)}/retry`, { method: "POST" });
    setBusy(null);
    if (!answer.ok) return refused(answer);
    if (answer.data.result.ok) toast.success(`Лист надіслано на ${message.to}`);
    else toast.error(`Сервіс знову не прийняв лист: ${mailErrorText(answer.data.result.error)}`);
    invalidate("/outbox");
  };

  const markSent = async () => {
    if (!message) return;
    const yes = await confirmDialog({
      title: "Позначити лист надісланим?",
      text: "Лист вийде з черги і більше не надсилатиметься. Робіть так, якщо ви вже зв'язалися з одержувачем іншим способом.",
      confirmLabel: "Позначити надісланим",
    });
    if (!yes) return;
    setBusy("mark");
    const answer = await adminApi<OutboxMessageAnswer>(`/outbox/${encodeURIComponent(message.id)}/mark-sent`, { method: "POST" });
    setBusy(null);
    if (!answer.ok) return refused(answer);
    toast.success("Лист позначено як надісланий");
    invalidate("/outbox");
  };

  const remove = async () => {
    if (!message) return;
    const yes = await confirmDialog({
      title: "Видалити лист з черги?",
      text: message.state === "sent" ? "Запис про надісланий лист зникне з черги." : "Лист не буде надіслано, і повернути його не вийде.",
      confirmLabel: "Видалити лист",
      tone: "danger",
    });
    if (!yes) return;
    setBusy("delete");
    const answer = await adminApi(`/outbox/${encodeURIComponent(message.id)}`, { method: "DELETE" });
    setBusy(null);
    if (!answer.ok) return refused(answer);
    toast.success("Лист видалено з черги");
    onClose();
    // The lists only: the deleted message itself is gone, asking for it again would answer 404.
    invalidate("/outbox?");
  };

  const facts: KeyValueItem[] = message
    ? [
        {
          label: "Стан",
          value: (
            <Badge tone={OUTBOX_STATE_TONE[message.state]} dot>
              {OUTBOX_STATE_LABELS[message.state]}
            </Badge>
          ),
        },
        { label: "Кому", value: message.to, copy: message.to },
        { label: "Створено", value: formatDateTime(message.createdAt) },
        { label: "Надіслано", value: message.sentAt ? formatDateTime(message.sentAt) : "Ще ні" },
        { label: "Спроб", value: `${formatNumber(message.attempts)} із ${formatNumber(MAIL_MAX_ATTEMPTS)}` },
        { label: "Остання спроба", value: message.lastAttemptAt ? formatDateTime(message.lastAttemptAt) : "Ще не було" },
        ...(message.expiresAt ? [{ label: "Актуальний до", value: formatDateTime(message.expiresAt) }] : []),
        ...(message.autoSend
          ? [
              {
                label: "Автоматично",
                value: message.autoSend === "yes" ? "Сайт надішле сам" : OUTBOX_AUTO_SEND_LABELS[message.autoSend],
              },
            ]
          : []),
      ]
    : [];

  const state = message?.state;
  const footer =
    message && canEdit ? (
      <>
        <Button
          variant="dangerGhost"
          iconLeft={TrashIcon}
          onClick={remove}
          loading={busy === "delete"}
          disabled={busy !== null && busy !== "delete"}
          className="min-[640px]:mr-auto"
        >
          Видалити
        </Button>
        {(state === "pending" || state === "failed" || state === "unsendable") && (
          <Button variant="secondary" iconLeft={CheckIcon} onClick={markSent} loading={busy === "mark"} disabled={busy !== null && busy !== "mark"}>
            Позначити надісланим
          </Button>
        )}
        {state === "pending" && (
          <Button iconLeft={PaperAirplaneIcon} onClick={sendNow} loading={busy === "send"} disabled={!configured || (busy !== null && busy !== "send")}>
            Надіслати зараз
          </Button>
        )}
        {state === "failed" && (
          <Button iconLeft={ArrowPathIcon} onClick={retry} loading={busy === "retry"} disabled={!configured || (busy !== null && busy !== "retry")}>
            Повторити
          </Button>
        )}
      </>
    ) : undefined;

  return (
    <Drawer
      open={id !== null}
      onClose={onClose}
      busy={busy !== null}
      width={720}
      title={message ? message.kindLabel : notFound ? "Лист не знайдено" : "Лист"}
      description={message ? (!message.restricted && message.summary) || `Кому: ${message.to}` : undefined}
      footer={footer}
    >
      {notFound ? (
        <NotFoundState title="Лист не знайдено" text="Можливо, його вже видалили з черги." />
      ) : detail.error && !data ? (
        <ErrorState failure={detail.error} onRetry={detail.reload} />
      ) : !data || !message ? (
        <div className="flex flex-col gap-5" data-loading="true">
          <SkeletonText lines={4} />
          <Skeleton shape="tile" className="h-[420px] w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {message.state === "failed" && message.lastError && (
            <Notice tone="red" title="Останнє надсилання не вдалося">
              {mailErrorText(message.lastError)}
              {!configured && " Сервіс надсилання зараз не підключено."}
            </Notice>
          )}
          {message.state === "unsendable" && (
            <Notice tone="neutral" title="Цей лист не надсилається з черги">
              Він містить одноразове посилання, яке не зберігається: лист надсилається лише в момент створення. Тут лишається запис про нього.
            </Notice>
          )}
          {message.state === "pending" && !configured && (
            <Notice tone="amber" title="Лист чекає на сервіс надсилання">
              Щойно сервіс буде підключено, лист можна буде надіслати.
            </Notice>
          )}
          <KeyValueList columns={2} dense items={facts} />
          <div className="flex flex-col gap-4">
            <Tabs
              label="Вигляд листа"
              idBase="outbox-view"
              size="sm"
              value={view}
              onChange={setView}
              items={[
                { key: "html", label: "Лист" },
                { key: "text", label: "Текстова версія" },
                { key: "attempts", label: "Спроби надсилання", count: data.deliveries.length },
              ]}
            />
            <TabPanel idBase="outbox-view" value="html" hidden={view !== "html"}>
              {data.preview ? (
                <div className="flex flex-col gap-3">
                  {data.previewMasked && <MaskedNote />}
                  <p className={TEXT.body}>
                    <span className="text-neutral-500">Тема: </span>
                    <span className="font-semibold">{data.preview.subject}</span>
                  </p>
                  <iframe
                    title={`Лист: ${data.preview.subject}`}
                    sandbox=""
                    srcDoc={data.preview.html}
                    className="h-[560px] w-full rounded-2xl border border-stroke-subtle bg-white"
                  />
                </div>
              ) : (
                <Notice tone="neutral" title="Лист не можна показати">
                  {previewErrorText(data.previewError, "Для цього виду листа немає вигляду.")}
                </Notice>
              )}
            </TabPanel>
            <TabPanel idBase="outbox-view" value="text" hidden={view !== "text"}>
              {data.preview ? (
                <div className="flex flex-col gap-3">
                  {data.previewMasked && <MaskedNote />}
                  <pre className={cx(TEXT.body, "whitespace-pre-wrap rounded-2xl bg-bg-subtle p-4 font-[inherit] [overflow-wrap:anywhere]")}>
                    {data.preview.text}
                  </pre>
                </div>
              ) : (
                <Notice tone="neutral" title="Текстової версії немає">
                  {previewErrorText(data.previewError, "Для цього виду листа немає тексту.")}
                </Notice>
              )}
            </TabPanel>
            <TabPanel idBase="outbox-view" value="attempts" hidden={view !== "attempts"}>
              {data.deliveries.length === 0 ? (
                <p className={TEXT.muted}>Лист ще не надсилався.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-stroke-subtle rounded-2xl bg-bg-subtle px-4">
                  {data.deliveries.map((delivery) => (
                    <li key={delivery.id} className="flex flex-col gap-1 py-3">
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Badge tone={delivery.status === "ok" ? "green" : "red"} dot>
                          {delivery.status === "ok" ? "Надіслано" : "Помилка"}
                        </Badge>
                        <span className="tabular-nums text-neutral-700">{formatDateTime(delivery.at)}</span>
                        {delivery.actor && <span className={TEXT.caption}>{delivery.actor}</span>}
                      </span>
                      {delivery.error && <span className={cx(TEXT.caption, "[overflow-wrap:anywhere]")}>{mailErrorText(delivery.error)}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </TabPanel>
          </div>
        </div>
      )}
    </Drawer>
  );
}
