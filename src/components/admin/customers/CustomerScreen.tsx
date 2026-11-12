"use client";

import {
  ArrowRightStartOnRectangleIcon,
  KeyIcon,
  LockOpenIcon,
  NoSymbolIcon,
  SparklesIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { EntityHistory } from "../common/EntityHistory";
import { adminApi, type ApiFailure } from "../lib/api";
import { countOf, cx, formatDate, formatRelative } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { confirmDialog } from "../ui/ConfirmDialog";
import { KebabMenu, type MenuItem } from "../ui/DropdownMenu";
import { Page, PageHeader } from "../ui/Page";
import { Skeleton, SkeletonText } from "../ui/Skeleton";
import { ErrorState, NotFoundState } from "../ui/States";
import { AccountTypeBadge, ActiveBadge } from "../ui/status";
import { toast, toastError } from "../ui/Toast";
import { TEXT, TONES } from "../ui/tokens";
import { AccountFactsCard, LeadsCard, OrdersCard, SessionsCard } from "./ActivityCards";
import { applyCustomer, customerKey, reloadCustomer, refreshAround } from "./cache";
import { CompanyCard } from "./CompanyCard";
import { AccountTag, CUSTOMER_ERRORS, accountName, hasOrdersText, loginText, useNow } from "./parts";
import { PasswordModal } from "./PasswordModal";
import { ProfileForm, ProfileView } from "./ProfileCard";
import type { CustomerAnswer, CustomerDetail, DeleteCustomerAnswer, SignOutAnswer } from "./types";

// /admin/customers/<id>: one customer account. The head carries what is
// done to the account as a whole (password, sessions, block, delete); the
// cards below hold the profile, the company of a partner, the devices it
// is open on, its orders and form submissions, and the journal.

const LIST = "/admin/customers";
const BACK = { href: LIST, label: "До списку акаунтів" };

export function CustomerScreen({ id }: { id: string }) {
  const { can } = useStaff();
  const query = useAdminQuery<CustomerAnswer>(customerKey(id));
  // While another account's answer is still on screen, this one is loading.
  const customer = query.data?.customer.id === id ? query.data.customer : undefined;

  if (!customer) {
    if (query.error?.status === 404) {
      return (
        <Page>
          <PageHeader back={BACK} title="Акаунт" />
          <Card padding="none">
            <NotFoundState
              title="Акаунт не знайдено"
              text="Можливо, його вже видалили або посилання неточне."
              backHref={LIST}
              backLabel="До списку акаунтів"
            />
          </Card>
        </Page>
      );
    }
    if (query.error) {
      return (
        <Page>
          <PageHeader back={BACK} title="Акаунт" />
          <Card padding="none">
            <ErrorState failure={query.error} onRetry={query.reload} />
          </Card>
        </Page>
      );
    }
    return <CustomerSkeleton />;
  }
  return <CustomerView customer={customer} canEdit={can("customers.edit")} />;
}

function CustomerSkeleton() {
  return (
    <Page>
      <div className="flex flex-col gap-4 pb-6" aria-hidden>
        <Skeleton className="h-8 w-40" shape="pill" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-28" shape="pill" />
          <Skeleton className="h-7 w-28" shape="pill" />
        </div>
      </div>
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card title="Профіль">
            <SkeletonText lines={5} />
          </Card>
          <Card title="Останні замовлення">
            <SkeletonText lines={4} />
          </Card>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Card title="Сеанси">
            <SkeletonText lines={3} />
          </Card>
          <Card title="Про акаунт">
            <SkeletonText lines={4} />
          </Card>
        </div>
      </div>
    </Page>
  );
}

// A line under the head about the state of the account as a whole.
function Notice({ tone, children }: { tone: "red" | "amber"; children: ReactNode }) {
  return (
    <p
      role="status"
      className="mb-4 rounded-3xl px-5 py-4 text-[14px] leading-5 min-[1024px]:px-6"
      style={{ backgroundColor: TONES[tone].bg, color: TONES[tone].text }}
    >
      {children}
    </p>
  );
}

type Busy = null | "block" | "signout" | "delete" | "welcome";

function CustomerView({ customer, canEdit }: { customer: CustomerDetail; canEdit: boolean }) {
  const router = useRouter();
  const now = useNow();
  const [busy, setBusy] = useState<Busy>(null);
  // `key` gives the password dialog a fresh state every time it opens; it
  // stays mounted while it slides out.
  const [password, setPassword] = useState({ key: 0, open: false });
  const name = accountName(customer);
  const b2b = customer.type === "b2b";
  const path = `/customers/${encodeURIComponent(customer.id)}`;

  const setActive = async (next: boolean) => {
    setBusy("block");
    const result = await adminApi<CustomerAnswer>(path, { method: "PATCH", body: { isActive: next } });
    setBusy(null);
    if (!result.ok) {
      toastError(result, CUSTOMER_ERRORS);
      return;
    }
    applyCustomer(result.data.customer);
    toast.success(next ? "Акаунт розблоковано: людина знову може входити" : "Акаунт заблоковано, усі сеанси завершено");
  };

  const toggleBlock = async () => {
    const ok = customer.isActive
      ? await confirmDialog({
          title: "Заблокувати акаунт?",
          text: `${name} одразу вийде з усіх пристроїв і не зможе увійти, доки акаунт не розблокують. Замовлення та історія збережуться.`,
          confirmLabel: "Заблокувати",
          tone: "danger",
        })
      : await confirmDialog({
          title: "Розблокувати акаунт?",
          text: `${name} знову зможе входити на сайт зі своїм паролем.`,
          confirmLabel: "Розблокувати",
        });
    if (ok) await setActive(!customer.isActive);
  };

  const signOutAll = async () => {
    const count = customer.sessions.length;
    const ok = await confirmDialog({
      title: "Завершити всі сеанси?",
      text: `${name} вийде з акаунта на ${countOf(count, ["пристрої", "пристроях", "пристроях"])}. Пароль не зміниться: щоб продовжити, людині достатньо увійти знову.`,
      confirmLabel: "Завершити сеанси",
      tone: "danger",
    });
    if (!ok) return;
    setBusy("signout");
    const result = await adminApi<SignOutAnswer>(`${path}/sign-out`, { method: "POST" });
    setBusy(null);
    if (!result.ok) {
      toastError(result, CUSTOMER_ERRORS);
      return;
    }
    reloadCustomer(customer.id);
    toast.success(result.data.ended > 0 ? `Завершено ${countOf(result.data.ended, ["сеанс", "сеанси", "сеансів"])}` : "Відкритих сеансів не було");
  };

  // Deleting would erase order history: the API refuses, and the panel
  // offers what a manager actually wants then, blocking.
  const offerBlock = async (failure: ApiFailure | null) => {
    const reason = hasOrdersText(failure, customer.ordersCount);
    if (!customer.isActive) {
      toast.error(`${reason} Акаунт уже заблоковано.`);
      return;
    }
    const block = await confirmDialog({
      title: "Акаунт не можна видалити",
      text: `${reason} Його можна заблокувати: людина вийде з усіх пристроїв і більше не зможе увійти.`,
      confirmLabel: "Заблокувати акаунт",
      cancelLabel: "Залишити як є",
      tone: "danger",
    });
    if (block) await setActive(false);
  };

  const remove = async () => {
    if (customer.ordersCount > 0) {
      await offerBlock(null);
      return;
    }
    const ok = await confirmDialog({
      title: "Видалити акаунт?",
      text: `Акаунт ${name} зникне разом із кошиком і сеансами, і людина більше не зможе увійти. Цю дію не можна скасувати.`,
      confirmLabel: "Видалити акаунт",
      tone: "danger",
    });
    if (!ok) return;
    setBusy("delete");
    const result = await adminApi<DeleteCustomerAnswer>(path, { method: "DELETE" });
    setBusy(null);
    if (!result.ok) {
      if (result.error === "has-orders") await offerBlock(result);
      else toastError(result, CUSTOMER_ERRORS);
      return;
    }
    refreshAround();
    toast.success(`Акаунт ${name} видалено`);
    router.push(LIST);
  };

  const showWelcome = async () => {
    setBusy("welcome");
    const result = await adminApi<CustomerAnswer>(path, { method: "PATCH", body: { welcomed: false } });
    setBusy(null);
    if (!result.ok) {
      toastError(result, CUSTOMER_ERRORS);
      return;
    }
    applyCustomer(result.data.customer);
    toast.success("Вітальне вікно покажеться при наступному вході");
  };

  const menu: MenuItem[] = [
    ...(b2b && customer.welcomed
      ? [
          { key: "welcome", label: "Показати вітальне вікно знову", icon: SparklesIcon, onSelect: () => void showWelcome() },
          { key: "divider", divider: true as const },
        ]
      : []),
    {
      key: "delete",
      label: "Видалити акаунт",
      icon: TrashIcon,
      tone: "danger",
      onSelect: () => void remove(),
      disabled: customer.seed,
      hint: customer.seed ? "Демо" : undefined,
    },
  ];

  const lastLogin = customer.lastLoginAt ? `останній вхід ${formatRelative(customer.lastLoginAt, now || undefined)}` : "ще не входив";

  return (
    <Page>
      <PageHeader
        back={BACK}
        title={name}
        subtitle={loginText(customer.login)}
        meta={
          <>
            <AccountTypeBadge type={customer.type} size="md" />
            <ActiveBadge active={customer.isActive} size="md" />
            <AccountTag row={customer} className="h-7 px-2.5 text-[12px]" />
            <span className={cx(TEXT.caption, "text-[13px] leading-[18px]")}>
              Створено {formatDate(customer.createdAt)}, {lastLogin}
            </span>
          </>
        }
        actions={
          canEdit ? (
            <>
              <Button variant="secondary" iconLeft={KeyIcon} onClick={() => setPassword(({ key }) => ({ key: key + 1, open: true }))}>
                Скинути пароль
              </Button>
              <Button
                variant="secondary"
                iconLeft={ArrowRightStartOnRectangleIcon}
                loading={busy === "signout"}
                disabled={customer.sessions.length === 0}
                title={customer.sessions.length === 0 ? "Акаунт зараз ніде не відкритий" : undefined}
                onClick={() => void signOutAll()}
              >
                Завершити всі сеанси
              </Button>
              {customer.isActive ? (
                <Button variant="secondary" iconLeft={NoSymbolIcon} loading={busy === "block"} onClick={() => void toggleBlock()}>
                  Заблокувати
                </Button>
              ) : (
                <Button iconLeft={LockOpenIcon} loading={busy === "block"} onClick={() => void toggleBlock()}>
                  Розблокувати
                </Button>
              )}
              <KebabMenu label={`Інші дії з акаунтом ${name}`} items={menu} disabled={busy !== null} />
            </>
          ) : undefined
        }
      />

      {!customer.isActive && (
        <Notice tone="red">
          Акаунт заблоковано: людина не може увійти на сайт, а всі її сеанси завершено.{canEdit ? " Розблокуйте його, щоб повернути доступ." : ""}
        </Notice>
      )}

      {/* Two columns from 1280 px. Below that the columns dissolve (display:
          contents) and the cards line up in the order a phone needs. */}
      <div className="flex min-w-0 flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-4">
          <div className="order-1 min-w-0 xl:order-none">
            {canEdit ? <ProfileForm key={`${customer.id}:${customer.updatedAt}`} customer={customer} /> : <ProfileView customer={customer} />}
          </div>
          <div className="order-4 min-w-0 xl:order-none">
            <OrdersCard customer={customer} />
          </div>
          <div className="order-7 min-w-0 xl:order-none">
            <EntityHistory type="customer" id={customer.id} refreshKey={customer.updatedAt} />
          </div>
        </div>
        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-4">
          {b2b && (
            <div className="order-2 min-w-0 xl:order-none">
              <CompanyCard customer={customer} canEdit={canEdit} />
            </div>
          )}
          <div className="order-3 min-w-0 xl:order-none">
            <SessionsCard customer={customer} canEdit={canEdit} />
          </div>
          {customer.leadRefs.length > 0 && (
            <div className="order-5 min-w-0 xl:order-none">
              <LeadsCard customer={customer} />
            </div>
          )}
          <div className="order-6 min-w-0 xl:order-none">
            <AccountFactsCard customer={customer} />
          </div>
        </div>
      </div>

      {canEdit && (
        <PasswordModal
          key={password.key}
          customer={customer}
          open={password.open}
          onClose={() => setPassword((current) => ({ ...current, open: false }))}
        />
      )}
    </Page>
  );
}
