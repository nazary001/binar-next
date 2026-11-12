import type { BlogPostAnswer } from "@/components/admin/blog/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json, notFound } from "@/server/admin/http";
import {
  BLOG_BODY_MAX_BYTES,
  BlogPatchSchema,
  blogIdParam,
  deleteBlogPost,
  findBlogPost,
  isPublicPost,
  parseFields,
  toBlogPostDetail,
  touchesPublic,
  updateBlogPost,
} from "@/server/admin/repos/blog";
import { TAG } from "@/server/cache-tags";
import { revalidatePublicData } from "@/server/revalidate";

type Context = { params: Promise<{ id: string }> };

// GET /api/admin/blog/posts/<id> - one post for the editor. `blocks` is
// always there: a post saved before the editor existed gets its classic
// body converted (blocksFrom: "body").
export const GET = adminHandler<Context>("content.view", async ({ context }) => {
  const id = blogIdParam((await context.params).id);
  const doc = await findBlogPost(id);
  if (!doc) notFound();
  const answer: BlogPostAnswer = { ok: true, post: await toBlogPostDetail(doc) };
  return json(answer);
});

// PATCH /api/admin/blog/posts/<id> - edits the fields (BlogPostPatchInput),
// never the status. The classic body is derived from the blocks.
export const PATCH = adminHandler<Context>("content.edit", async ({ request, context, staff }) => {
  const id = blogIdParam((await context.params).id);
  const patch = await parseFields(request, BlogPatchSchema, BLOG_BODY_MAX_BYTES);
  const write = await updateBlogPost(id, patch, staff);
  if (touchesPublic(write)) revalidatePublicData([TAG.blog]);
  await audit(staff, request, {
    action: "blog.update",
    entity: { type: "blog_post", id, label: write.after.title },
    summary: `Змінено статтю «${write.after.title}»`,
    meta: { fields: Object.keys(patch), public: isPublicPost(write.after) },
  });
  const answer: BlogPostAnswer = { ok: true, post: await toBlogPostDetail(write.after) };
  return json(answer);
});

// DELETE /api/admin/blog/posts/<id> - removes the post; a public one also
// needs content.publish (it disappears from the site).
export const DELETE = adminHandler<Context>("content.edit", async ({ request, context, staff }) => {
  const id = blogIdParam((await context.params).id);
  const doc = await deleteBlogPost(id, staff);
  const wasPublic = isPublicPost(doc);
  if (wasPublic) revalidatePublicData([TAG.blog]);
  await audit(staff, request, {
    action: "blog.delete",
    entity: { type: "blog_post", id, label: doc.title },
    summary: `Видалено статтю «${doc.title}»`,
    meta: { slug: id, wasPublic },
  });
  return json({ ok: true });
});
