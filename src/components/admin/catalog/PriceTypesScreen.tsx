"use client";

import {
  BanknotesIcon,
  BuildingOffice2Icon,
  PencilSquareIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { adminApi } from "../lib/api";
import { countOf, cx, formatNumber } from "../lib/format";
import { invalidate, useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { confirmDialog } from "../ui/ConfirmDialog";
import { DataTable, type Column } from "../ui/DataTable";
import { KebabMenu } from "../ui/DropdownMenu";
import { CopyButton } from "../ui/KeyValue";
import { Modal } from "../ui/Modal";
import { Page, PageHeader } from "../ui/Page";
import { Select, type SelectOption } from "../ui/Select";
import { EmptyState } from "../ui/States";
import { toast, toastError } from "../ui/Toast";
import { COLOR_TRANSITION, FOCUS_RING, TEXT } from "../ui/tokens";
import { PriceTypeModal } from "./PriceTypeModal";
import { holderOf, roleBody, roleEffect, roleOf, ROLE_META, ROLE_VALUES, usageText, type RoleValue } from "./roles";
import { CATALOG_ERRORS, type PriceTypeAnswer, type PriceTypeDto, type PriceTypeListAnswer, type PriceTypeUsage } from "./types";

// /admin/pricing: the price types of the accounting system and the role
// each one plays on the site. The role is the single source of truth for
// "which prices guests see" and "which list partner prices start from"
// (the shop settings hold no such choice). A role changes in the table at
// once (moving it from its holder is confirmed first); a type is added or
// edited in a dialog and removed from its row menu.

const KEY = "/price-types?limit=200&sort=name";

type Editing = { record: PriceTypeDto | null; nonce: number };

// The row opens the editor on a click, and React carries clicks from a
// portaled layer (the role list, the row menu) up to the row although
// they happen outside it in the page: such cells keep their clicks.
function OwnClicks({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div data-row-ignore className={className} onClick={(event) => event.stopPropagation()}>
      {children}
    </div>
  );
}

// The name over who uses the type; a long name wraps to two lines (a
// phone leaves this column narrow) instead of being cut to a few letters.
function NameCell({ row }: { row: PriceTypeDto }) {
  const usage = usageText(row);
  return (
    <span className="flex min-w-0 flex-col min-[1024px]:min-w-[200px]">
      <span className="line-clamp-2 font-semibold text-neutral-900 [overflow-wrap:anywhere]">{row.name}</span>
      {usage && <span className={cx(TEXT.caption, "line-clamp-2")}>{usage}</span>}
    </span>
  );
}

// An ERP code is a long GUID as often as not: one line, cut, with the
// whole value in the tooltip and a copy button.
function CodeCell({ code }: { code: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="block max-w-[160px] truncate text-neutral-600" title={code}>
        {code}
      </span>
      <CopyButton text={code} label="код у BAS" />
    </span>
  );
}

function RoleBadge({ role }: { role: RoleValue }) {
  const meta = ROLE_META[role];
  if (!meta.tone) return <span className="text-neutral-500">{meta.label}</span>;
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}

// Why a type cannot be removed, with the places to change it.
function InUseDialog({
  open,
  type,
  usage,
  onClose,
}: {
  open: boolean;
  type: PriceTypeDto | null;
  usage: PriceTypeUsage | null;
  onClose: () => void;
}) {
  const groups = usage?.groups ?? [];
  const contracts = usage?.contracts ?? 0;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={type ? `Тип цін «${type.name}» використовується` : ""}
      description="Видалити його можна, коли ніхто його не обирає. Спершу оберіть інший тип цін у цих місцях."
      footer={<Button onClick={onClose}>Зрозуміло</Button>}
    >
      <ul className="flex flex-col divide-y divide-stroke-subtle">
        {groups.map((group) => (
          <li key={group.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
            <span className={cx(TEXT.body, "min-w-0 [overflow-wrap:anywhere]")}>Група покупців «{group.name}»</span>
            <Link
              href={`/admin/customer-groups?id=${encodeURIComponent(group.id)}`}
              className={cx("shrink-0 rounded-md text-[14px] font-semibold underline underline-offset-4 hover:text-brand", COLOR_TRANSITION, FOCUS_RING)}
            >
              Відкрити
            </Link>
          </li>
        ))}
        {contracts > 0 && (
          <li className={cx(TEXT.body, "py-2.5 first:pt-0")}>
            {countOf(contracts, ["договір компанії", "договори компаній", "договорів компаній"])} з облікової системи. Їх змінює обмін з BAS.
          </li>
        )}
      </ul>
    </Modal>
  );
}

function HowPricesWork() {
  const items: { icon: ReactNode; title: string; text: string }[] = [
    {
      icon: <UserIcon />,
      title: "Гості й роздрібні покупці",
      text: "Бачать роздрібну ціну товару, а обмін з BAS записує в неї ціну типу з роллю «Базова».",
    },
    {
      icon: <BuildingOffice2Icon />,
      title: "Партнери",
      text: "Бачать ту саму ціну мінус знижку своєї компанії за договором або власну партнерську ціну товару, якщо її вказано.",
    },
    {
      icon: <SparklesIcon />,
      title: "Роль «Індивідуальна»",
      text: "Ціни цього типу сайт поки лише зберігає: роль готує перехід на партнерські ціни з облікової системи.",
    },
  ];
  return (
    <Card title="Як сайт рахує ціни зараз">
      <ul className="grid min-w-0 grid-cols-1 gap-5 min-[1024px]:grid-cols-3 min-[1024px]:gap-6">
        {items.map((item) => (
          <li key={item.title} className="flex min-w-0 gap-3">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-bg-cabinet text-neutral-900 [&>svg]:size-5 [&>svg]:[stroke-width:1.7]"
            >
              {item.icon}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className={TEXT.bodyStrong}>{item.title}</span>
              <span className={TEXT.muted}>{item.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function PriceTypesScreen() {
  const { can } = useStaff();
  const canEdit = can("catalog.edit");
  const list = useAdminQuery<PriceTypeListAnswer>(KEY);
  const items = list.data?.items;
  // A role just chosen: the select shows it until the refreshed list
  // carries it (no flash of the old value in between). `inFlight` marks
  // the rows whose request is still running.
  const [pending, setPending] = useState<Record<string, RoleValue>>({});
  const [inFlight, setInFlight] = useState<Record<string, true>>({});
  const [seenList, setSeenList] = useState(list.data);
  if (list.data !== seenList) {
    setSeenList(list.data);
    const kept = Object.fromEntries(Object.entries(pending).filter(([id]) => inFlight[id]));
    if (Object.keys(kept).length !== Object.keys(pending).length) setPending(kept);
  }
  const [editing, setEditing] = useState<Editing | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [blocked, setBlocked] = useState<{ type: PriceTypeDto; usage: PriceTypeUsage } | null>(null);
  const [blockedOpen, setBlockedOpen] = useState(false);

  const openEditor = (record: PriceTypeDto | null) => {
    setEditing({ record, nonce: (editing?.nonce ?? 0) + 1 });
    setModalOpen(true);
  };

  const showBlocked = (type: PriceTypeDto, usage: PriceTypeUsage) => {
    setBlocked({ type, usage });
    setBlockedOpen(true);
  };

  const refresh = () => {
    invalidate("/price-types");
    invalidate("/products/options");
    invalidate("/customer-groups");
    invalidate("/audit");
  };

  const changeRole = async (row: PriceTypeDto, next: RoleValue) => {
    const current = pending[row.id] ?? roleOf(row);
    if (next === current || inFlight[row.id]) return;
    const holder = holderOf(items ?? [], next, row.id);
    if (holder) {
      const agreed = await confirmDialog({
        title: `Передати роль «${ROLE_META[next].short}» типу «${row.name}»?`,
        text: `Зараз її має «${holder.name}»: він залишиться без ролі. ${roleEffect(next)}`,
        confirmLabel: "Передати роль",
      });
      if (!agreed) return;
    }
    const without = <T,>(state: Record<string, T>): Record<string, T> => {
      const rest = { ...state };
      delete rest[row.id];
      return rest;
    };
    setPending((state) => ({ ...state, [row.id]: next }));
    setInFlight((state) => ({ ...state, [row.id]: true }));
    const result = await adminApi<PriceTypeAnswer>(`/price-types/${encodeURIComponent(row.id)}`, {
      method: "PATCH",
      body: { role: roleBody(next) },
    });
    setInFlight(without);
    if (!result.ok) {
      setPending(without);
      toastError(result, CATALOG_ERRORS);
      return;
    }
    // The pending value goes once the refreshed list arrives (above).
    refresh();
    const taken = result.data.roleTakenFrom;
    toast.success(
      next === "none"
        ? `«${row.name}» тепер без ролі`
        : `Роль «${ROLE_META[next].short}» тепер у «${row.name}»` + (taken ? `; «${taken.name}» без ролі` : ""),
    );
  };

  const remove = async (row: PriceTypeDto) => {
    if (row.usedBy.groups.length > 0 || row.usedBy.contracts > 0) {
      showBlocked(row, row.usedBy);
      return;
    }
    const role = roleOf(row);
    const parts = [
      row.productsCount > 0
        ? `Ціни цього типу зникнуть із ${countOf(row.productsCount, ["товару", "товарів", "товарів"])}; повернути їх зможе лише наступний обмін з BAS.`
        : "Товари не мають цін цього типу, тож на сайті нічого не зміниться.",
      role !== "none" ? `Роль «${ROLE_META[role].short}» залишиться без типу.` : "",
    ];
    const agreed = await confirmDialog({
      title: `Видалити тип цін «${row.name}»?`,
      text: parts.filter(Boolean).join(" "),
      confirmLabel: "Видалити",
      tone: "danger",
    });
    if (!agreed) return;
    const result = await adminApi<{ ok: true; id: string; pricesRemoved: number }>(`/price-types/${encodeURIComponent(row.id)}`, {
      method: "DELETE",
    });
    if (!result.ok) {
      const usage = result.data.usedBy as PriceTypeUsage | undefined;
      if (result.error === "in-use" && usage) {
        showBlocked(row, usage);
        refresh();
        return;
      }
      toastError(result, CATALOG_ERRORS);
      return;
    }
    refresh();
    toast.success(`Тип цін «${row.name}» видалено`);
  };

  const roleOptions = (row: PriceTypeDto): SelectOption<RoleValue>[] =>
    ROLE_VALUES.map((value) => {
      const holder = holderOf(items ?? [], value, row.id);
      return {
        value,
        label: ROLE_META[value].label,
        hint: holder ? `Зараз у «${holder.name}»` : undefined,
        tone: ROLE_META[value].tone ?? undefined,
      };
    });

  // The role of a row: a select for editors (saved at once), a badge for
  // the rest. Drawn in its own column, or under the name on phones.
  const roleControl = (row: PriceTypeDto) =>
    canEdit ? (
      <OwnClicks>
        <Select<RoleValue>
          size="sm"
          aria-label={`Роль на сайті: ${row.name}`}
          value={pending[row.id] ?? roleOf(row)}
          options={roleOptions(row)}
          onChange={(value) => void changeRole(row, value)}
          disabled={Boolean(inFlight[row.id])}
        />
      </OwnClicks>
    ) : (
      <RoleBadge role={roleOf(row)} />
    );

  const columns: Column<PriceTypeDto>[] = [
    {
      key: "name",
      header: "Назва",
      cell: (row) => (
        <span className="flex min-w-0 flex-col gap-2">
          <NameCell row={row} />
          {/* Phones: the role under the name, the one column besides the menu. */}
          <span className="block min-[640px]:hidden">{roleControl(row)}</span>
        </span>
      ),
    },
    {
      key: "code",
      header: "Код у BAS",
      hideBelow: 1024,
      interactive: true,
      cell: (row) => (row.externalId ? <CodeCell code={row.externalId} /> : <span className="text-neutral-400">-</span>),
    },
    { key: "currency", header: "Валюта", hideBelow: 1280, width: 96, cell: (row) => row.currency },
    { key: "vat", header: "З ПДВ", hideBelow: 1280, width: 88, cell: (row) => (row.vatIncluded ? "Так" : "Ні") },
    {
      key: "role",
      header: "Роль на сайті",
      hideBelow: 640,
      interactive: canEdit,
      cell: (row) => <span className="block w-[232px]">{roleControl(row)}</span>,
    },
    {
      key: "products",
      header: "Товарів із ціною",
      align: "right",
      hideBelow: 640,
      width: 128,
      cell: (row) => <span className={cx("tabular-nums", row.productsCount === 0 && "text-neutral-400")}>{formatNumber(row.productsCount)}</span>,
    },
  ];
  if (canEdit) {
    columns.push({
      key: "menu",
      header: <span className="sr-only">Дії</span>,
      interactive: true,
      width: 56,
      align: "right",
      cell: (row) => (
        <OwnClicks>
          <KebabMenu
            size="sm"
            label={`Дії з типом цін «${row.name}»`}
            items={[
              { key: "edit", label: "Змінити", icon: PencilSquareIcon, onSelect: () => openEditor(row) },
              { key: "delete", label: "Видалити", icon: TrashIcon, tone: "danger", onSelect: () => void remove(row) },
            ]}
          />
        </OwnClicks>
      ),
    });
  }

  const add = canEdit ? (
    <Button iconLeft={PlusIcon} onClick={() => openEditor(null)}>
      Додати тип цін
    </Button>
  ) : null;

  return (
    <Page>
      <PageHeader
        title="Типи цін"
        light={items ? formatNumber(list.data?.total ?? items.length) : undefined}
        subtitle={
          <span className="block max-w-[820px]">
            Типи цін надходять з облікової системи (BAS). Тут кожному призначають роль на сайті: лише вона визначає, які ціни бачать
            гості і від якого прайсу рахуються ціни партнерів. Окремого вибору в налаштуваннях магазину немає.
          </span>
        }
        actions={add}
      />
      <div className="flex min-w-0 flex-col gap-6">
        <DataTable
          caption="Типи цін"
          columns={columns}
          rows={items}
          rowKey={(row) => row.id}
          loading={list.loading}
          stale={list.stale}
          error={list.error}
          onRetry={list.reload}
          onRowClick={canEdit ? (row) => openEditor(row) : undefined}
          empty={
            <EmptyState
              icon={<BanknotesIcon aria-hidden className="size-6" strokeWidth={1.7} />}
              title="Типів цін ще немає"
              text="Вони з'являться після обміну з обліковою системою. Тип можна додати й вручну, щоб заздалегідь призначити йому роль."
              action={add}
            />
          }
        />
        <HowPricesWork />
      </div>

      {editing && (
        <PriceTypeModal
          key={editing.nonce}
          open={modalOpen}
          record={editing.record}
          types={items ?? []}
          onClose={() => setModalOpen(false)}
        />
      )}
      <InUseDialog
        open={blockedOpen}
        type={blocked?.type ?? null}
        usage={blocked?.usage ?? null}
        onClose={() => setBlockedOpen(false)}
      />
    </Page>
  );
}
