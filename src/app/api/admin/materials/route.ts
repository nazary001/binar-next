import type { MaterialsAnswer } from "@/components/admin/materials/types";
import { adminHandler, json } from "@/server/admin/http";
import { listMaterials } from "@/server/admin/repos/materials";

// GET /api/admin/materials?category=&type=&q= - the whole library in one
// answer: every folder (with its number of files) and the files that pass
// the filters, in display order.
export const GET = adminHandler("content.view", async ({ url }) => {
  const answer: MaterialsAnswer = { ok: true, ...(await listMaterials(url.searchParams)) };
  return json(answer);
});
