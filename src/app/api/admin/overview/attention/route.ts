import type { AttentionResponse } from "@/components/admin/overview/types";
import { adminHandler, json } from "@/server/admin/http";
import { attentionItems } from "@/server/admin/repos/overview";

// GET /api/admin/overview/attention - only the "waits for somebody"
// counters of the overview: { ok: true, attention: AttentionItem[] }. Any
// signed-in member of staff may ask (other screens show a subset); each
// counter is present only when the role may open what it points to.
export const GET = adminHandler(null, async ({ staff }) => {
  const attention = await attentionItems(staff);
  return json({ ok: true, attention } satisfies AttentionResponse);
});
