import { LEAD_KIND_LABELS, LEAD_STATUS_LABELS } from "@/components/admin/leads/types";
import { formatDateTime, kyivDay } from "@/components/admin/lib/format";
import { adminHandler } from "@/server/admin/http";
import { csvResponse } from "@/server/admin/list";
import { exportLeads } from "@/server/admin/repos/leads";

// GET /api/admin/leads/export - the filtered inbox (the same query string
// as GET /api/admin/leads, without paging) as a CSV file for Excel.
export const GET = adminHandler("leads.view", async ({ url, staff }) => {
  const rows = await exportLeads(url, staff.staff._id);
  return csvResponse(
    `leads-${kyivDay()}.csv`,
    ["Дата", "Тип", "Статус", "Ім'я", "Телефон", "E-mail", "Компанія", "Сторінка", "Зміст", "Відповідальний"],
    rows.map((row) => [
      formatDateTime(row.createdAt),
      LEAD_KIND_LABELS[row.kind] ?? row.kind,
      LEAD_STATUS_LABELS[row.status] ?? row.status,
      row.contact.name,
      row.contact.phone,
      row.contact.email,
      row.contact.company,
      row.source,
      row.summary,
      row.assigneeName,
    ]),
  );
});
