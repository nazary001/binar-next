import { z } from "zod";
import { STAFF_JOURNAL_LIMIT, STAFF_NAME_MAX } from "@/components/admin/staff/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, notFound, parseBody } from "@/server/admin/http";
import {
  deleteStaffAccount,
  describeStaff,
  journalOf,
  patchStaff,
  sessionsOf,
  staffEntity,
  staffRow,
  staffWords,
} from "@/server/admin/repos/staff-accounts";
import { zId, zRequiredText } from "@/server/validate";

type Context = { params: Promise<{ id: string }> };

// A path id that cannot be an account is simply not found.
async function staffIdOf(context: Context): Promise<string> {
  const parsed = zId.safeParse((await context.params).id);
  if (!parsed.success) notFound();
  return parsed.data;
}

// GET /api/admin/staff/[id] - the row, the live sessions and the person's
// last journal lines (StaffDetailAnswer).
export const GET = adminHandler<Context>("staff.manage", async ({ context, staff }) => {
  const id = await staffIdOf(context);
  const row = await staffRow(id);
  if (!row) notFound();
  const [sessions, journal] = await Promise.all([sessionsOf(id, staff.sessionId), journalOf(id, STAFF_JOURNAL_LIMIT)]);
  return json({ ok: true, staff: row, sessions, journal });
});

// PATCH /api/admin/staff/[id] { name?, roleId?, isActive? }
const PatchBody = z
  .object({
    name: zRequiredText(STAFF_NAME_MAX).optional(),
    roleId: zId.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0);

export const PATCH = adminHandler<Context>("staff.manage", async ({ request, context, staff }) => {
  const id = await staffIdOf(context);
  const body = await parseBody(request, PatchBody);
  const { before, staff: row, changes } = await patchStaff(staff, id, body);
  const entity = staffEntity(before);

  // One journal line per kind of change, so the journal can be filtered by
  // what happened.
  if (changes.name) {
    await audit(staff, request, {
      action: "staff.rename",
      entity,
      summary: `Співробітника ${before.email} перейменовано: «${changes.name.from}» -> «${changes.name.to}»`,
      meta: { from: changes.name.from, to: changes.name.to },
    });
  }
  if (changes.role) {
    await audit(staff, request, {
      action: "staff.role",
      entity,
      summary: `Роль співробітника ${row.name} (${row.email}): «${changes.role.fromName}» -> «${changes.role.toName}»`,
      meta: { from: changes.role.from, to: changes.role.to },
    });
  }
  if (changes.active === false) {
    await audit(staff, request, {
      action: "staff.block",
      entity,
      summary: `Заблоковано співробітника ${staffWords(row)}; усі сесії завершено`,
    });
  } else if (changes.active === true) {
    await audit(staff, request, {
      action: "staff.unblock",
      entity,
      summary: `Розблоковано співробітника ${staffWords(row)}`,
    });
  }
  return json({ ok: true, staff: row });
});

// DELETE /api/admin/staff/[id] - the account and its sessions; the journal
// keeps every line about the person.
export const DELETE = adminHandler<Context>("staff.manage", async ({ request, context, staff }) => {
  const id = await staffIdOf(context);
  const removed = await deleteStaffAccount(staff, id);
  await audit(staff, request, {
    action: "staff.delete",
    entity: staffEntity(removed),
    summary: `Видалено обліковий запис співробітника ${await describeStaff(removed)}`,
    meta: { roleId: removed.roleId },
  });
  return json({ ok: true });
});
