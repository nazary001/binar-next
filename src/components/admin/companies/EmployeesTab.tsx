"use client";

import { EnvelopeIcon, IdentificationIcon, TrashIcon } from "@heroicons/react/24/outline";
import { inviteHoursLeft } from "@/components/platform/profile/data";
import { adminApi } from "../lib/api";
import { formatPhone } from "../lib/format";
import { invalidate } from "../lib/query";
import { Badge } from "../ui/Badge";
import { confirmDialog } from "../ui/ConfirmDialog";
import { DataTable, TwoLineCell, type Column } from "../ui/DataTable";
import { KebabMenu, type MenuItem } from "../ui/DropdownMenu";
import { PageSection } from "../ui/Page";
import { EmptyState } from "../ui/States";
import { toast, toastError } from "../ui/Toast";
import { TEXT } from "../ui/tokens";
import { useMinuteClock } from "./shared";
import { COMPANY_ERRORS, type CompanyDetail, type EmployeeAnswer, type EmployeeDto } from "./types";

// "Співробітники": the people the company listed on its own profile page in
// the cabinet. They are the company's records, not sign-in accounts. An
// invitation can be sent again or a row removed.

function StatusCell({ employee, now }: { employee: EmployeeDto; now: number }) {
  if (employee.status === "active") {
    return (
      <Badge tone="green" dot>
        Активний
      </Badge>
    );
  }
  const hours = now > 0 ? inviteHoursLeft(employee.invitedAt ?? undefined, now) : null;
  return (
    <span className="flex flex-col items-start gap-1">
      <Badge tone="amber" dot>
        Запрошено
      </Badge>
      {hours !== null && <span className={TEXT.caption}>{hours > 0 ? `дійсне ще ${hours} год` : "термін минув"}</span>}
    </span>
  );
}

export function EmployeesTab({ company, canEdit }: { company: CompanyDetail; canEdit: boolean }) {
  const now = useMinuteClock();
  const base = `/companies/${encodeURIComponent(company.id)}/employees`;

  const resend = async (employee: EmployeeDto) => {
    const result = await adminApi<EmployeeAnswer>(`${base}/${encodeURIComponent(employee.id)}/resend`, { method: "POST" });
    if (!result.ok) {
      toastError(result, COMPANY_ERRORS);
      return;
    }
    invalidate(`/companies/${encodeURIComponent(company.id)}`);
    invalidate("/audit");
    // Inside the 15-minute pause the stored row comes back unchanged and
    // nothing new is queued.
    if (result.data.employee.invitedAt === employee.invitedAt) {
      toast.info("Запрошення надсилали менше ніж 15 хвилин тому: нове не надіслано, спробуйте трохи пізніше.");
    } else {
      toast.success(`Запрошення на ${employee.email} надіслано ще раз`);
    }
  };

  const remove = async (employee: EmployeeDto) => {
    const who = employee.fullName || employee.email;
    const yes = await confirmDialog({
      title: employee.status === "invited" ? `Скасувати запрошення ${who}?` : `Видалити ${who} зі списку?`,
      text: "Запис зникне зі списку співробітників у кабінеті компанії. Акаунтів для входу це не змінює.",
      confirmLabel: employee.status === "invited" ? "Скасувати запрошення" : "Видалити",
      cancelLabel: "Залишити",
      tone: "danger",
    });
    if (!yes) return;
    const result = await adminApi(`${base}/${encodeURIComponent(employee.id)}`, { method: "DELETE" });
    if (!result.ok) {
      toastError(result, COMPANY_ERRORS);
      return;
    }
    invalidate(`/companies/${encodeURIComponent(company.id)}`);
    invalidate("/audit");
    toast.success(employee.status === "invited" ? "Запрошення скасовано" : `${who}: видалено зі списку`);
  };

  const columns: Column<EmployeeDto>[] = [
    {
      key: "name",
      header: "Співробітник",
      // A table cell ignores max-width: the box inside sets it. On phones
      // the status sits under the name, so the row menu stays in view.
      cell: (employee) => (
        <span className="flex max-w-[250px] flex-col items-start gap-1.5 min-[640px]:max-w-[320px]">
          <span className="block w-full min-w-0">
            {employee.status === "invited" && !employee.fullName ? (
              <TwoLineCell title={employee.email} subtitle="Ще не прийняв запрошення" />
            ) : (
              <TwoLineCell title={employee.fullName || employee.email} subtitle={employee.position || "Посаду не вказано"} />
            )}
          </span>
          <span className="min-[640px]:hidden">
            <StatusCell employee={employee} now={now} />
          </span>
        </span>
      ),
    },
    {
      key: "contacts",
      header: "Контакти",
      hideBelow: 1024,
      cell: (employee) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate tabular-nums">{employee.phone ? formatPhone(employee.phone) : "-"}</span>
          <span className={TEXT.caption}>{employee.email || "-"}</span>
        </span>
      ),
    },
    { key: "status", header: "Статус", hideBelow: 640, cell: (employee) => <StatusCell employee={employee} now={now} /> },
  ];
  if (canEdit) {
    columns.push({
      key: "menu",
      header: <span className="sr-only">Дії</span>,
      interactive: true,
      width: 56,
      align: "right",
      cell: (employee) => {
        const items: MenuItem[] = [];
        if (employee.status === "invited") {
          items.push({ key: "resend", label: "Надіслати запрошення ще раз", icon: EnvelopeIcon, onSelect: () => void resend(employee) });
          items.push({ key: "sep", divider: true });
        }
        items.push({
          key: "delete",
          label: employee.status === "invited" ? "Скасувати запрошення" : "Видалити",
          icon: TrashIcon,
          tone: "danger",
          onSelect: () => void remove(employee),
        });
        return <KebabMenu size="sm" label={`Дії: ${employee.fullName || employee.email}`} items={items} />;
      },
    });
  }

  return (
    <PageSection
      title="Співробітники"
      description="Люди, яких компанія сама додала у своєму кабінеті. Це записи компанії, а не акаунти: увійти в кабінет за ними не можна."
    >
      <DataTable
        caption="Співробітники компанії"
        columns={columns}
        rows={company.employees}
        rowKey={(employee) => employee.id}
        empty={
          <EmptyState
            icon={<IdentificationIcon aria-hidden className="size-6" strokeWidth={1.7} />}
            title="Компанія ще нікого не додала"
            text="Адміністратор компанії додає колег і надсилає їм запрошення на сторінці профілю в кабінеті."
          />
        }
      />
    </PageSection>
  );
}
