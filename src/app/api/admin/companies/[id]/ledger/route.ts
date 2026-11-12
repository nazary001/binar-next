import { LEDGER_DOC_TYPES } from "@/components/admin/companies/types";
import { adminHandler, json } from "@/server/admin/http";
import { idParam, listQuery, oneOf } from "@/server/admin/list";
import { companyLedger } from "@/server/admin/repos/companies";
import { pathId } from "@/server/admin/repos/customers";

// GET /api/admin/companies/<id>/ledger [customers.view]
//   ?docType=&counterpartyId=&contractId=<id>|none&page=&limit=
// -> { items: LedgerEntryDto[], total, page, limit, figures } (LedgerPage):
// the settlement movements the accounting exchange wrote for the company,
// newest first, each with the running balance of its contract and of the
// company.

type Context = { params: Promise<{ id: string }> };

const DOC_TYPES = LEDGER_DOC_TYPES.map((type) => type.value);

export const GET = adminHandler<Context>("customers.view", async ({ context, url }) => {
  const id = pathId((await context.params).id);
  const query = listQuery(url, { sortable: [], defaultSort: "-docDate", defaultLimit: 50, maxLimit: 200 });
  const contract = query.params.get("contractId");
  const ledger = await companyLedger(
    id,
    { page: query.page, limit: query.limit },
    {
      docType: oneOf(query.params, "docType", DOC_TYPES),
      counterpartyId: idParam(query.params, "counterpartyId"),
      contractId: contract === "none" ? null : idParam(query.params, "contractId"),
    },
  );
  return json({ ok: true, ...ledger });
});
