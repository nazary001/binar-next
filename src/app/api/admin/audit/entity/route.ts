import { entityViewPermission, type JournalEntityHistory } from "@/components/admin/audit/types";
import { HttpError, adminHandler, assertCan, json } from "@/server/admin/http";
import { ENTITY_ID, ENTITY_TYPE, entityHistory } from "@/server/admin/repos/journal";

// GET /api/admin/audit/entity?type=<type>&id=<id> - the last lines of the
// journal about one record, for the "history" panel of a detail screen.
// Whoever may open the record may read its history (entityViewPermission:
// the type's view permission; an integration's settings group goes with
// that integration); audit.view reads every history, as it reads the whole
// journal anyway.
export const GET = adminHandler(null, async ({ url, staff }) => {
  const type = url.searchParams.get("type")?.trim() ?? "";
  const id = url.searchParams.get("id")?.trim() ?? "";
  if (!ENTITY_TYPE.test(type) || !ENTITY_ID.test(id)) throw new HttpError(400, "bad-request");

  const permission = entityViewPermission(type, id);
  assertCan(staff, permission ? [permission, "audit.view"] : "audit.view");

  const answer: JournalEntityHistory = { ok: true, items: await entityHistory(type, id) };
  return json(answer);
});
