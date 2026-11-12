"use client";

import { ChevronRightIcon, ComputerDesktopIcon, DevicePhoneMobileIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { adminApi } from "../lib/api";
import { countOf, cx, formatDate, formatDateTime, formatMoney, formatNumber, formatRelative, qs } from "../lib/format";
import { useStaff } from "../shell/StaffProvider";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { confirmDialog } from "../ui/ConfirmDialog";
import { KeyValueList } from "../ui/KeyValue";
import { LeadKindBadge, LeadStatusBadge, OrderStatusBadge, type OrderStatus } from "../ui/status";
import { toast, toastError } from "../ui/Toast";
import { COLOR_TRANSITION, FOCUS_RING_INSET, TEXT } from "../ui/tokens";
import { reloadCustomer } from "./cache";
import { describeDevice } from "./device";
import { CUSTOMER_ERRORS, useNow } from "./parts";
import type { CustomerDetail, CustomerSession, SignOutAnswer } from "./types";

// The side cards of the account page: live sessions, the facts of the
// account, the latest orders and the form submissions.

const ROW = "flex min-w-0 items-center gap-3 py-3 first:pt-0 last:pb-0";

// "Nothing here yet" inside a side card: one quiet line with its icon, not
// the tall panel a whole list gets.
function QuietEmpty({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-stroke-default text-neutral-800">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 pt-0.5">
        <span className={TEXT.bodyStrong}>{title}</span>
        <span className={TEXT.muted}>{children}</span>
      </span>
    </div>
  );
}

// A row that is a link when the role may open the record, plain text
// otherwise (the order and lead pages have their own permissions).
function RowLink({ href, children }: { href: string | null; children: ReactNode }) {
  if (!href) return <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>;
  return (
    <Link
      href={href}
      className={cx(
        "group -mx-2 flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-bg-subtle motion-reduce:transition-none",
        COLOR_TRANSITION,
        FOCUS_RING_INSET,
      )}
    >
      {children}
      <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-neutral-400 group-hover:text-neutral-900" strokeWidth={2} />
    </Link>
  );
}

// --- sessions ------------------------------------------------------------------------

export function SessionsCard({ customer, canEdit }: { customer: CustomerDetail; canEdit: boolean }) {
  const now = useNow();
  const [ending, setEnding] = useState<string | null>(null);
  const sessions = customer.sessions;

  const end = async (session: CustomerSession) => {
    const device = describeDevice(session.userAgent).label;
    const ok = await confirmDialog({
      title: "Завершити сеанс?",
      text: `На пристрої «${device}» людину буде виведено з акаунта. Щоб продовжити там роботу, їй треба буде увійти знову.`,
      confirmLabel: "Завершити сеанс",
      tone: "danger",
    });
    if (!ok) return;
    setEnding(session.id);
    const result = await adminApi<SignOutAnswer>(
      `/customers/${encodeURIComponent(customer.id)}/sessions/${encodeURIComponent(session.id)}`,
      { method: "DELETE" },
    );
    setEnding(null);
    if (!result.ok) {
      toastError(result, { ...CUSTOMER_ERRORS, "not-found": "Цей сеанс уже завершився." });
      reloadCustomer(customer.id);
      return;
    }
    reloadCustomer(customer.id);
    toast.success("Сеанс завершено");
  };

  return (
    <Card
      title="Сеанси"
      subtitle={sessions.length > 0 ? `Відкрито на ${countOf(sessions.length, ["пристрої", "пристроях", "пристроях"])}` : undefined}
    >
      {sessions.length === 0 ? (
        <QuietEmpty icon={<ComputerDesktopIcon className="size-5" strokeWidth={1.7} />} title="Відкритих сеансів немає">
          {"Коли людина увійде на сайт, тут з'явиться пристрій, з якого вона працює."}
        </QuietEmpty>
      ) : (
        <ul className="flex flex-col divide-y divide-stroke-subtle" aria-label="Активні сеанси">
          {sessions.map((session) => {
            const device = describeDevice(session.userAgent);
            const Icon = device.mobile ? DevicePhoneMobileIcon : ComputerDesktopIcon;
            return (
              <li key={session.id} className={ROW} data-session={session.id}>
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-bg-subtle text-neutral-800">
                  <Icon className="size-5" strokeWidth={1.7} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cx(TEXT.bodyStrong, "truncate")} title={session.userAgent ?? undefined}>
                    {device.label}
                  </span>
                  <span className={cx(TEXT.caption, "tabular-nums")} title={formatDateTime(session.lastSeenAt)}>
                    Активність {formatRelative(session.lastSeenAt, now || undefined)}
                  </span>
                  <span className={cx(TEXT.caption, "tabular-nums")}>
                    Вхід {formatDateTime(session.createdAt)}, діє до {formatDate(session.expiresAt)}
                  </span>
                </span>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Завершити сеанс: ${device.label}`}
                    loading={ending === session.id}
                    onClick={() => void end(session)}
                  >
                    Завершити
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// --- facts ---------------------------------------------------------------------------

export function AccountFactsCard({ customer }: { customer: CustomerDetail }) {
  const b2b = customer.type === "b2b";
  const lines = (count: number) => (count > 0 ? countOf(count, ["позиція", "позиції", "позицій"]) : "порожньо");
  return (
    <Card title="Про акаунт">
      <KeyValueList
        dense
        items={[
          { label: "Створено", value: formatDateTime(customer.createdAt) },
          { label: "Останній вхід", value: customer.lastLoginAt ? formatDateTime(customer.lastLoginAt) : "ще не входив" },
          { label: "Кошик", value: lines(customer.cartLines) },
          ...(b2b
            ? [
                { label: "Асортимент у кабінеті", value: lines(customer.assortmentLines) },
                { label: "Вітальне вікно", value: customer.welcomed ? "Показано" : "Покажеться при наступному вході" },
              ]
            : []),
          { label: "Код акаунта", value: <span className="text-[13px] text-neutral-500">{customer.id}</span>, copy: customer.id },
        ]}
      />
    </Card>
  );
}

// --- orders --------------------------------------------------------------------------

export function OrdersCard({ customer }: { customer: CustomerDetail }) {
  const { can } = useStaff();
  const canOpen = can("orders.view");
  const orders = customer.orders;
  const companyId = customer.type === "b2b" ? customer.company?.id : undefined;
  const more = customer.ordersCount > orders.length;

  return (
    <Card
      title="Останні замовлення"
      subtitle={
        customer.ordersCount > 0
          ? more
            ? `Показано ${formatNumber(orders.length)} з ${formatNumber(customer.ordersCount)}`
            : countOf(customer.ordersCount, ["замовлення", "замовлення", "замовлень"])
          : undefined
      }
      actions={
        canOpen && companyId && customer.ordersCount > 0 ? (
          <Button size="sm" variant="ghost" href={`/admin/orders?${qs({ clientId: companyId })}`}>
            Усі замовлення компанії
          </Button>
        ) : undefined
      }
    >
      {orders.length === 0 ? (
        <QuietEmpty icon={<ShoppingBagIcon className="size-5" strokeWidth={1.7} />} title="Замовлень ще немає">
          {"Замовлення, які людина оформить на сайті, з'являться тут."}
        </QuietEmpty>
      ) : (
        <ul className="flex flex-col divide-y divide-stroke-subtle" aria-label="Останні замовлення">
          {orders.map((order) => (
            <li key={order.id} className="py-1.5 first:pt-0 last:pb-0">
              <RowLink href={canOpen ? `/admin/orders/${encodeURIComponent(order.id)}` : null}>
                <span className="flex min-w-0 flex-1 flex-col min-[640px]:flex-row min-[640px]:items-center min-[640px]:gap-4">
                  <span className={cx(TEXT.bodyStrong, "truncate tabular-nums min-[640px]:w-[140px] min-[640px]:shrink-0")}>№ {order.number}</span>
                  <span className={cx(TEXT.caption, "tabular-nums min-[640px]:w-[96px] min-[640px]:shrink-0 min-[640px]:text-[14px] min-[640px]:font-normal min-[640px]:leading-5 min-[640px]:text-neutral-700")}>
                    {formatDate(order.date)}
                  </span>
                  <span className="hidden min-w-0 min-[640px]:flex">
                    <OrderStatusBadge status={order.status as OrderStatus} />
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="whitespace-nowrap text-[14px] font-semibold leading-5 text-neutral-900 tabular-nums">{formatMoney(order.total)}</span>
                  <span className="min-[640px]:hidden">
                    <OrderStatusBadge status={order.status as OrderStatus} />
                  </span>
                </span>
              </RowLink>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// --- form submissions ----------------------------------------------------------------

export function LeadsCard({ customer }: { customer: CustomerDetail }) {
  const { can } = useStaff();
  const canOpen = can("leads.view");
  const leads = customer.leadRefs;
  if (leads.length === 0) return null;
  const more = customer.leads.length > leads.length;
  return (
    <Card
      title="Заявки з форм"
      subtitle={
        more
          ? `Показано ${formatNumber(leads.length)} з ${formatNumber(customer.leads.length)}`
          : "Надіслані з сайту, коли людина була в акаунті"
      }
    >
      <ul className="flex flex-col divide-y divide-stroke-subtle" aria-label="Заявки з форм">
        {leads.map((lead) => (
          <li key={lead.id} className="py-1.5 first:pt-0 last:pb-0">
            <RowLink href={canOpen ? `/admin/leads?${qs({ id: lead.id })}` : null}>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <LeadKindBadge kind={lead.kind} className="w-fit" />
                <span className={cx(TEXT.caption, "tabular-nums")}>{formatDateTime(lead.createdAt)}</span>
              </span>
              <LeadStatusBadge status={lead.status} />
            </RowLink>
          </li>
        ))}
      </ul>
    </Card>
  );
}
