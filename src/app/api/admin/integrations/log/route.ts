import { adminHandler, json } from "@/server/admin/http";
import { contains, dayParam, idParam, listQuery, oneOf, paginate } from "@/server/admin/list";
import { collection } from "@/server/db/collections";
import { logFilter, toExchangeLogDto } from "@/server/integrations/bas/log";

// GET /api/admin/integrations/log [integrations.view]
//   ?system=bas|nova-poshta|mail &entity=<name> &status=ok|partial|error
//   &direction=in|out &from=YYYY-MM-DD &to=YYYY-MM-DD &q=<batch id, key, error>
//   &page= &limit= &sort=-at
// -> ListAnswer<ExchangeLogDto>: the journal of every exchange, newest
// first. Rows are kept 90 days.
export const GET = adminHandler("integrations.view", async ({ url }) => {
  const query = listQuery(url, { sortable: ["at", "durationMs"], defaultSort: "-at", defaultLimit: 50 });
  const params = query.params;
  const filter = logFilter({
    system: oneOf(params, "system", ["bas", "nova-poshta", "mail"] as const),
    entity: idParam(params, "entity"),
    status: oneOf(params, "status", ["ok", "partial", "error"] as const),
    direction: oneOf(params, "direction", ["in", "out"] as const),
    from: dayParam(params, "from"),
    to: dayParam(params, "to"),
    q: query.q ? contains(query.q) : undefined,
  });
  const page = await paginate(await collection("exchangeLog"), filter, query, { map: toExchangeLogDto });
  return json({ ok: true, ...page });
});
