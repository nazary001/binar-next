import { z } from "zod";
import { PRODUCT_BULK_ACTIONS, PRODUCT_LIMITS } from "@/components/admin/products/types";
import { countOf } from "@/components/admin/lib/format";
import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { bulkProducts, parseInput } from "@/server/admin/repos/products";
import { TAG } from "@/server/cache-tags";
import { revalidatePublicData } from "@/server/revalidate";
import { zId } from "@/server/validate";

const ACTIONS = PRODUCT_BULK_ACTIONS.map((action) => action.value) as [
  (typeof PRODUCT_BULK_ACTIONS)[number]["value"],
  ...(typeof PRODUCT_BULK_ACTIONS)[number]["value"][],
];

const Body = z
  .object({
    ids: z.array(zId).min(1).max(PRODUCT_LIMITS.bulkIds),
    action: z.enum(ACTIONS),
  })
  .strict();

const FORMS = ["товар", "товари", "товарів"] as const;

// POST /api/admin/products/bulk - one action on up to 200 products
// (ProductBulkInput). Listing skips archived products and products without
// a real category. One journal line for the whole batch.
// Answer: ProductBulkAnswer.
export const POST = adminHandler("catalog.edit", async ({ request, staff }) => {
  const body = await parseInput(request, Body);
  const result = await bulkProducts(body.ids, body.action, staff.staff._id);
  const label = PRODUCT_BULK_ACTIONS.find((action) => action.value === body.action)?.label ?? body.action;
  if (result.changed > 0) {
    await audit(staff, request, {
      action: "product.bulk",
      entity: null,
      summary: `Масова дія «${label}»: змінено ${countOf(result.changed, FORMS)} з ${body.ids.length}`,
      meta: { action: body.action, ids: body.ids.slice(0, 200), skipped: result.skipped, missing: result.missing },
    });
    revalidatePublicData([TAG.catalog]);
  }
  return json({ ok: true, ...result });
});
