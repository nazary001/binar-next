import { entityRelation, entityViewPermissions, type JournalEntityHistory } from "@/components/admin/audit/types";
import { can } from "@/server/admin/auth";
import { HttpError, adminHandler, assertCan, json } from "@/server/admin/http";
import { ENTITY_ID, ENTITY_TYPE, entityHistory } from "@/server/admin/repos/journal";

// GET /api/admin/audit/entity?type=<type>&id=<id>[&related=1] - the last
// lines of the journal about one record, for the "history" panel of a
// detail screen. Whoever may open the record may read its history
// (entityViewPermissions: the type's view permission; a settings group
// shown on another page goes with that page); audit.view reads every
// history, as it reads the whole journal anyway.
//
// related=1 adds the lines of the records that belong to it under types of
// their own (ENTITY_RELATED: a company's counterparties, contracts and
// employees), each related type only when the caller may view it.
export const GET = adminHandler(null, async ({ url, staff }) => {
  const type = url.searchParams.get("type")?.trim() ?? "";
  const id = url.searchParams.get("id")?.trim() ?? "";
  if (!ENTITY_TYPE.test(type) || !ENTITY_ID.test(id)) throw new HttpError(400, "bad-request");

  assertCan(staff, [...entityViewPermissions(type, id), "audit.view"]);

  const relation = url.searchParams.get("related") === "1" ? entityRelation(type) : null;
  const types = relation
    ? relation.types.filter((related) => can(staff, [...entityViewPermissions(related, id), "audit.view"]))
    : [];

  const answer: JournalEntityHistory = {
    ok: true,
    items: await entityHistory(type, id, { related: relation && types.length ? { types, metaKey: relation.metaKey } : null }),
  };
  return json(answer);
});
