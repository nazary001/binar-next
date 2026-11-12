import type { BlogReorderAnswer } from "@/components/admin/blog/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import { BlogReorderSchema, isPublicPost, parseFields, reorderBlogPost } from "@/server/admin/repos/blog";
import { TAG } from "@/server/cache-tags";
import { revalidatePublicData } from "@/server/revalidate";

// POST /api/admin/blog/posts/reorder { id, beforeId } - moves a post right
// before another one in the public order (beforeId null = to the end).
// The public list changes only when the moved post is public.
export const POST = adminHandler("content.edit", async ({ request, staff }) => {
  const { id, beforeId } = await parseFields(request, BlogReorderSchema);
  const { moved, sort } = await reorderBlogPost(id, beforeId, staff);
  if (isPublicPost(moved)) revalidatePublicData([TAG.blog]);
  await audit(staff, request, {
    action: "blog.reorder",
    entity: { type: "blog_post", id, label: moved.title },
    summary: beforeId
      ? `Статтю «${moved.title}» переміщено перед /blog/${beforeId}`
      : `Статтю «${moved.title}» переміщено в кінець списку`,
    meta: { beforeId, sort },
  });
  const answer: BlogReorderAnswer = { ok: true, id, sort };
  return json(answer);
});
