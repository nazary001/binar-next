import { z } from "zod";
import {
  LEAD_BULK_MAX,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_VALUES,
  type LeadBulkResult,
} from "@/components/admin/leads/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { leadEntity, leadWho, setLeadsStatus } from "@/server/admin/repos/leads";
import { zId } from "@/server/validate";

// POST /api/admin/leads/bulk { ids, status } - one status for many leads
// (the table's selection). Leads that already have it are left as they
// are; each lead that changes gets its own journal line, so the history
// panel of every lead shows it.

const Body = z
  .object({
    ids: z
      .array(zId)
      .min(1)
      .max(LEAD_BULK_MAX)
      .refine((ids) => new Set(ids).size === ids.length),
    status: z.enum(LEAD_STATUS_VALUES),
  })
  .strict();

export const POST = adminHandler("leads.edit", async ({ request, staff }) => {
  const body = await parseBody(request, Body);
  const { matched, changed } = await setLeadsStatus(body.ids, body.status);

  await Promise.all(
    changed.map(({ doc, from }) =>
      audit(staff, request, {
        action: "lead.status",
        entity: leadEntity(doc),
        summary: `Заявка від ${leadWho(doc)}: статус «${LEAD_STATUS_LABELS[from]}» -> «${LEAD_STATUS_LABELS[body.status]}»`,
        meta: { from, to: body.status, bulk: true },
      }),
    ),
  );

  const answer: LeadBulkResult = { ok: true, matched, updated: changed.length };
  return json(answer);
});
