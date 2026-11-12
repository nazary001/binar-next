import { countOf } from "@/components/admin/lib/format";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, notFound } from "@/server/admin/http";
import { describeStaff, signOutStaff, staffEntity } from "@/server/admin/repos/staff-accounts";
import { zId } from "@/server/validate";

type Context = { params: Promise<{ id: string }> };

// POST /api/admin/staff/[id]/sign-out - ends every session of the person
// (SignOutAnswer). Asked about one's own account, the session of this
// request is spared.
export const POST = adminHandler<Context>("staff.manage", async ({ request, context, staff }) => {
  const parsed = zId.safeParse((await context.params).id);
  if (!parsed.success) notFound();
  const { target, ended } = await signOutStaff(staff, parsed.data);
  await audit(staff, request, {
    action: "staff.sign-out-all",
    entity: staffEntity(target),
    summary: `Завершено сесії співробітника ${await describeStaff(target)}: ${countOf(ended, ["сесія", "сесії", "сесій"])}`,
    meta: { ended },
  });
  return json({ ok: true, ended });
});
