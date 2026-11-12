"use client";

import { ArrowsRightLeftIcon, EnvelopeIcon, TruckIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import { useStaff } from "../shell/StaffProvider";
import { countOf, cx, formatDateTime, formatNumber, formatRelative, qs } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import { MAIL_PROVIDER_LABELS, type MailSettingsView, type OutboxListAnswer } from "../mail/types";
import type { ShippingListAnswer } from "../shipping/types";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { ErrorState } from "../ui/States";
import { Page, PageHeader, PageSection } from "../ui/Page";
import { SURFACE, TEXT } from "../ui/tokens";
import { RecentExchangeLog, describeError, entityLabel } from "./ExchangeLog";
import { FactList, StatePill, type IntegrationState } from "./shared";
import { basState, lastBasCall, mailState, npState } from "./state";
import type { BasStatusAnswer, NpSettingsAnswer } from "./types";

// /admin/integrations: the three integrations at a glance (what each does,
// whether it works, two or three live facts, the way to its page) and the
// last lines of the exchange journal across them.
//
// `monthStart` ("YYYY-MM-DD", Kyiv) and `now` (ms) come from the server
// page, so the screen renders the same figures on the server and in the
// browser and calls no clock while rendering.

function IntegrationCard({
  icon,
  name,
  text,
  state,
  facts,
  href,
  loading,
  failure,
}: {
  icon: ReactNode;
  name: string;
  text: string;
  state: IntegrationState | null;
  facts: { label: string; value: ReactNode; hint?: ReactNode }[];
  href: string;
  loading: boolean;
  failure?: ReactNode;
}) {
  return (
    <section aria-label={name} className={cx(SURFACE.card, "flex min-w-0 flex-col p-5 min-[1024px]:p-6")}>
      <div className="flex items-start justify-between gap-3">
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-bg-cabinet text-neutral-900 [&>svg]:size-6 [&>svg]:[stroke-width:1.6]"
        >
          {icon}
        </span>
        {state ? <StatePill state={state} /> : <Skeleton shape="pill" className="h-7 w-32" />}
      </div>
      <h2 className={cx(TEXT.sectionTitle, "mt-4")}>{name}</h2>
      <p className={cx(TEXT.muted, "mt-1")}>{text}</p>
      <div className="mt-5 flex-1">
        {failure ??
          (loading ? (
            <div className="flex flex-col gap-3" aria-hidden>
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-5 w-3/5" />
            </div>
          ) : (
            <FactList items={facts} />
          ))}
      </div>
      <div className="mt-6">
        <Button variant="secondary" href={href} fullWidth>
          Налаштувати
        </Button>
      </div>
    </section>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="font-medium text-neutral-500">{children}</span>;
}

export function IntegrationsHub({ monthStart, now }: { monthStart: string; now: number }) {
  const { can } = useStaff();
  const np = useAdminQuery<NpSettingsAnswer>("/np/settings");
  const shipments = useAdminQuery<ShippingListAnswer>(
    can("shipping.view") ? `/shipping?${qs({ carrier: "nova-poshta", from: monthStart, limit: 1 })}` : null,
  );
  const bas = useAdminQuery<BasStatusAnswer>("/integrations/bas/status");
  const mail = useAdminQuery<MailSettingsView>("/integrations/mail/settings");
  const outbox = useAdminQuery<OutboxListAnswer>("/outbox?limit=1");
  const failedMail = useAdminQuery<OutboxListAnswer>("/outbox?state=failed&limit=1");

  // --- Nova Poshta --------------------------------------------------------------------
  const npSettings = np.data?.settings;
  const sender = npSettings?.sender;
  const npFacts = [
    {
      label: "Відправник",
      value: sender?.counterpartyName || <Muted>Не обрано</Muted>,
      hint: sender?.contactName || undefined,
    },
    { label: "Місто відправки", value: sender?.cityName || <Muted>Не обрано</Muted> },
    ...(can("shipping.view")
      ? [
          {
            label: "Накладних цього місяця",
            value: shipments.data ? formatNumber(shipments.data.total) : shipments.error ? <Muted>Невідомо</Muted> : "...",
          },
        ]
      : []),
  ];

  // --- BAS ------------------------------------------------------------------------------
  const status = bas.data;
  const last = status ? lastBasCall(status) : null;
  const basFacts = status
    ? [
        {
          label: "Активні ключі",
          value: status.keys.active > 0 ? formatNumber(status.keys.active) : <Muted>Немає</Muted>,
          hint: status.keys.total > status.keys.active ? `усього ${formatNumber(status.keys.total)}` : undefined,
        },
        {
          label: "Чекають у черзі",
          value: status.queue.pending > 0 ? countOf(status.queue.pending, ["замовлення", "замовлення", "замовлень"]) : <Muted>Порожньо</Muted>,
          hint: status.queue.oldestPendingAt ? `найдавніше з ${formatDateTime(status.queue.oldestPendingAt)}` : undefined,
        },
        {
          label: "Останній обмін",
          value: last ? formatRelative(last.at, now) : <Muted>Ще не було</Muted>,
          hint: last ? `${entityLabel({ system: "bas", entity: last.entity, action: last.action })}${last.status === "error" ? ", помилка" : ""}` : undefined,
        },
      ]
    : [];

  // --- mail -------------------------------------------------------------------------------
  const mailStatus = mail.data?.status;
  const counts = outbox.data?.counts;
  const lastFailure = failedMail.data?.items[0];
  const waiting = counts ? counts.pending + counts.failed : 0;
  const mailFacts = [
    {
      label: "Сервіс",
      value: mailStatus && mailStatus.provider !== "none" ? MAIL_PROVIDER_LABELS[mailStatus.provider] : <Muted>Не підключено</Muted>,
      hint: mailStatus && mailStatus.provider !== "none" && !mailStatus.configured ? "налаштовано не повністю" : undefined,
    },
    {
      label: "Чекають надсилання",
      value: counts ? (waiting > 0 ? countOf(waiting, ["лист", "листи", "листів"]) : <Muted>Немає</Muted>) : "...",
    },
    {
      label: "Остання помилка",
      value: lastFailure ? formatRelative(lastFailure.lastAttemptAt ?? lastFailure.createdAt, now) : <Muted>Немає</Muted>,
      hint: lastFailure ? describeError(lastFailure.lastError) ?? undefined : undefined,
    },
  ];

  return (
    <Page>
      <PageHeader title="Інтеграції" subtitle="Зв'язок сайту з Новою Поштою, обліковою системою BAS і поштою: чи все працює і що налаштувати." />
      <div className="flex min-w-0 flex-col gap-8">
        <div className="grid min-w-0 grid-cols-1 gap-4 min-[1024px]:grid-cols-2 xl:grid-cols-3">
          <IntegrationCard
            icon={<TruckIcon />}
            name="Нова Пошта"
            text="Пошук міст і відділень, накладні зі сторінки замовлення, відстеження і друк."
            state={npSettings ? npState(npSettings) : null}
            facts={npFacts}
            href="/admin/integrations/nova-poshta"
            loading={np.loading}
            failure={np.error && !np.data ? <ErrorState failure={np.error} onRetry={np.reload} /> : undefined}
          />
          <IntegrationCard
            icon={<ArrowsRightLeftIcon />}
            name="BAS"
            text="Облікова система надсилає товари, ціни, залишки й клієнтів та забирає нові замовлення."
            state={status ? basState(status) : null}
            facts={basFacts}
            href="/admin/integrations/bas"
            loading={bas.loading}
            failure={bas.error && !bas.data ? <ErrorState failure={bas.error} onRetry={bas.reload} /> : undefined}
          />
          <IntegrationCard
            icon={<EnvelopeIcon />}
            name="Пошта"
            text="Листи про замовлення й заявки співробітникам і підтвердження покупцям."
            state={mailStatus ? mailState(mailStatus, counts) : null}
            facts={mailFacts}
            href="/admin/integrations/mail"
            loading={mail.loading}
            failure={mail.error && !mail.data ? <ErrorState failure={mail.error} onRetry={mail.reload} /> : undefined}
          />
        </div>

        <PageSection
          title="Журнал обміну"
          description="Останні 15 записів усіх інтеграцій. Натисніть рядок, щоб побачити подробиці."
          actions={
            <Button variant="secondary" href="/admin/integrations/log">
              Увесь журнал
            </Button>
          }
        >
          <RecentExchangeLog limit={15} />
        </PageSection>
      </div>
    </Page>
  );
}
