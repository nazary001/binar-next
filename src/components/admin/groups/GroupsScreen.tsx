"use client";

import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { PlusIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { CATALOG_DIRECTIONS } from "@/components/catalog/data";
import { DELIVERY_OPTIONS, PAYMENT_OPTIONS } from "@/components/checkout/data";
import { countOf, cx, formatNumber } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Page, PageHeader } from "../ui/Page";
import { SkeletonText } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/States";
import { COLOR_TRANSITION, FOCUS_RING, SURFACE, TEXT } from "../ui/tokens";
import { GroupDrawer } from "./GroupDrawer";
import { GUESTS_GROUP, REGISTERED_GROUP, type CustomerGroupDto, type CustomerGroupsPage } from "./types";

// /admin/customer-groups: the buyer groups as cards. A group opens in a
// drawer from the address (?id=<group id>, ?id=new for a new one), so a
// link can point at one group and Back closes it.

const CATEGORY_TOTAL = CATALOG_DIRECTIONS.reduce((sum, direction) => sum + direction.carousel.length, 0);

function methodsText(chosen: string[], total: number): string {
  if (chosen.length === 0 || chosen.length >= total) return "Усі способи";
  return `${chosen.length} з ${total}`;
}

function GroupCard({ group, onOpen }: { group: CustomerGroupDto; onOpen: () => void }) {
  const facts: { label: string; value: string }[] = [
    { label: "Тип цін", value: group.priceTypeName ?? (group.priceTypeId ? "Тип цін видалено" : "Ціни магазину") },
    { label: "Залишки", value: group.showStock ? "Показуються" : "Не показуються" },
    { label: "Оплата", value: methodsText(group.paymentMethods, PAYMENT_OPTIONS.length) },
    { label: "Доставка", value: methodsText(group.deliveryMethods, DELIVERY_OPTIONS.length) },
    {
      label: "Приховано",
      value:
        group.hiddenCategories.length === 0
          ? "Нічого"
          : `${countOf(group.hiddenCategories.length, ["категорія", "категорії", "категорій"])} з ${formatNumber(CATEGORY_TOTAL)}`,
    },
  ];
  const guests = group.id === GUESTS_GROUP;
  return (
    <article className={cx(SURFACE.card, "group relative flex min-w-0 flex-col gap-4 p-5 hover:bg-[#fcfcfc] min-[1024px]:p-6", COLOR_TRANSITION)}>
      <div className="flex items-start justify-between gap-3">
        <h2 className={cx(TEXT.cardTitle, "min-w-0 [overflow-wrap:anywhere]")}>
          <button
            type="button"
            onClick={onOpen}
            className={cx("cursor-pointer rounded-md text-left after:absolute after:inset-0 after:rounded-3xl after:content-['']", FOCUS_RING)}
          >
            {group.name}
          </button>
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          {group.system && <Badge tone="neutral">системна</Badge>}
          <ChevronRightIcon
            aria-hidden
            className={cx("size-5 text-neutral-400 group-hover:text-neutral-900 motion-reduce:transition-none", COLOR_TRANSITION)}
          />
        </div>
      </div>
      <p className={cx(TEXT.muted, "line-clamp-2 min-h-10")}>{group.description || "Без опису"}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-stroke-subtle pt-4 min-[1024px]:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0">
            <dt className={TEXT.caption}>{fact.label}</dt>
            <dd className="mt-0.5 truncate text-[14px] font-semibold leading-5 text-neutral-900">{fact.value}</dd>
          </div>
        ))}
        <div className="min-w-0">
          <dt className={TEXT.caption}>Компанії</dt>
          <dd className="mt-0.5 text-[14px] font-semibold leading-5 text-neutral-900">
            {guests ? (
              <span className="font-medium text-neutral-500">Відвідувачі без входу</span>
            ) : (
              <Link
                href={`/admin/companies?groupId=${encodeURIComponent(group.id)}`}
                className={cx("relative z-10 rounded-md tabular-nums underline underline-offset-4 hover:text-brand", FOCUS_RING)}
              >
                {countOf(group.companiesCount, ["компанія", "компанії", "компаній"])}
              </Link>
            )}
          </dd>
        </div>
      </dl>
      {group.id === REGISTERED_GROUP && <p className={TEXT.caption}>Сюди потрапляє кожна компанія, якій не призначено іншої групи.</p>}
    </article>
  );
}

export function GroupsScreen() {
  const pathname = usePathname();
  const search = useSearchParams();
  const { can } = useStaff();
  const canEdit = can("customers.edit");
  const groups = useAdminQuery<CustomerGroupsPage>("/customer-groups?limit=100");
  const openId = search.get("id");
  // The drawer keeps showing the last group while it slides out.
  const [shown, setShown] = useState<string | null>(openId);
  if (openId !== null && openId !== shown) setShown(openId);

  // The drawer's address is changed with the browser's own history (Next
  // keeps useSearchParams in step), so opening and closing never wait for
  // the server. A drawer opened here closes with Back; one that came with
  // the address (a shared link) closes by dropping ?id.
  const pushed = useRef(false);
  const open = (id: string) => {
    window.history.pushState(null, "", `${pathname}?id=${encodeURIComponent(id)}`);
    pushed.current = true;
  };
  const close = () => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", pathname);
    }
  };

  const items = groups.data?.items;
  const record = shown && shown !== "new" ? (items?.find((group) => group.id === shown) ?? null) : null;
  const add = canEdit ? (
    <Button iconLeft={PlusIcon} onClick={() => open("new")}>
      Додати групу
    </Button>
  ) : null;

  return (
    <Page>
      <PageHeader
        title="Групи покупців"
        light={items ? formatNumber(items.length) : undefined}
        subtitle="Група визначає, які ціни бачать її покупці, чи бачать вони залишки, як можуть оплатити й отримати замовлення та які категорії від них приховано."
        actions={add}
      />
      {groups.error && !items ? (
        <div className={SURFACE.card}>
          <ErrorState failure={groups.error} onRetry={groups.reload} />
        </div>
      ) : !items ? (
        <div className="grid gap-4 min-[640px]:grid-cols-2 2xl:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className={cx(SURFACE.card, "p-6")}>
              <SkeletonText lines={5} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className={SURFACE.card}>
          <EmptyState
            size="lg"
            icon={<UserGroupIcon aria-hidden className="size-6" strokeWidth={1.7} />}
            title="Груп ще немає"
            text="Групи об'єднують компанії з однаковими правилами: цінами, способами оплати й доставки, видимими категоріями."
            action={add}
          />
        </div>
      ) : (
        <div className="grid gap-4 min-[640px]:grid-cols-2 2xl:grid-cols-3">
          {items.map((group) => (
            <GroupCard key={group.id} group={group} onOpen={() => open(group.id)} />
          ))}
        </div>
      )}
      {shown !== null && (
        <GroupDrawer
          key={shown}
          open={openId !== null}
          onClose={close}
          group={record}
          isNew={shown === "new"}
          loading={!items && shown !== "new"}
          canEdit={canEdit}
        />
      )}
    </Page>
  );
}
