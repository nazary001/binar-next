import { z } from "zod";
import { REVALIDATE_TAGS, REVALIDATE_TAG_LABELS, type RevalidateResponse } from "@/components/admin/system/types";
import { audit } from "@/server/admin/audit";
import { HttpError, adminHandler, json, readJson } from "@/server/admin/http";
import { revalidatePublicData } from "@/server/revalidate";

// POST /api/admin/system/revalidate  { tags?: ("catalog" | "materials" | "blog")[] }
//   -> RevalidateResponse. Drops the cached copies of the public pages so
//   the next visitor reads the database (every tag when none are named).
//   A request without a body counts as {}.

const Body = z
  .object({ tags: z.array(z.enum(REVALIDATE_TAGS)).min(1).max(REVALIDATE_TAGS.length).optional() })
  .strict();

export const POST = adminHandler("settings.edit", async ({ request, staff }) => {
  const raw = request.headers.get("content-type") ? await readJson(request) : {};
  const parsed = Body.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "bad-request");
  const tags = [...new Set(parsed.data.tags ?? REVALIDATE_TAGS)];

  revalidatePublicData(tags);
  await audit(staff, request, {
    action: "system.revalidate",
    entity: null,
    summary: `Оновлено кеш публічних сторінок: ${tags.map((tag) => REVALIDATE_TAG_LABELS[tag]).join(", ")}`,
    meta: { tags },
  });
  const answer: RevalidateResponse = { ok: true, revalidated: tags };
  return json(answer);
});
