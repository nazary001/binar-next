import type { BlogPostAnswer } from "@/components/admin/blog/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { blogIdParam, duplicateBlogPost, releaseSlugs, toBlogPostDetail } from "@/server/admin/repos/blog";
import { TAG } from "@/server/cache-tags";
import { revalidatePublicData } from "@/server/revalidate";

type Context = { params: Promise<{ id: string }> };

// POST /api/admin/blog/posts/<id>/duplicate - a draft copy under
// "<slug>-copy" ("-copy-2", ... when taken), first in the list. A draft is
// not public, so the public blog is refreshed only when the copy's slug was
// an old address of a public post (it stops redirecting there).
export const POST = adminHandler<Context>("content.edit", async ({ request, context, staff }) => {
  const id = blogIdParam((await context.params).id);
  const copy = await duplicateBlogPost(id, staff);
  if (await releaseSlugs(copy._id, [copy._id])) revalidatePublicData([TAG.blog]);
  await audit(staff, request, {
    action: "blog.duplicate",
    entity: { type: "blog_post", id: copy._id, label: copy.title },
    summary: `Створено копію статті /blog/${id}: «${copy.title}»`,
    meta: { from: id, to: copy._id },
  });
  const answer: BlogPostAnswer = { ok: true, post: await toBlogPostDetail(copy) };
  return json(answer, 201);
});
