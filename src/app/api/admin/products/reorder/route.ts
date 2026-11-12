import { z } from "zod";
import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { parseInput, reorderProduct } from "@/server/admin/repos/products";
import { TAG } from "@/server/cache-tags";
import { revalidatePublicData } from "@/server/revalidate";
import { zId } from "@/server/validate";

const Body = z.object({ id: zId, beforeId: zId.nullable() }).strict();

// POST /api/admin/products/reorder - moves a product in the listing order
// ("за популярністю"): right before `beforeId`, or to the end with null.
// 404 when either id is unknown. Answer: ProductReorderAnswer.
export const POST = adminHandler("catalog.edit", async ({ request, staff }) => {
  const body = await parseInput(request, Body);
  const result = await reorderProduct(body.id, body.beforeId, staff.staff._id);
  if (result.moved) {
    await audit(staff, request, {
      action: "product.reorder",
      entity: { type: "product", id: body.id, label: result.title },
      summary: `Товар «${result.title}» (${body.id}) переміщено ${body.beforeId ? `перед ${body.beforeId}` : "в кінець списку"}`,
      meta: { beforeId: body.beforeId, sort: result.sort, rewritten: result.rewritten },
    });
    revalidatePublicData([TAG.catalog]);
  }
  return json({ ok: true, moved: result.moved, sort: result.sort, rewritten: result.rewritten });
});
